import { createClient } from "npm:@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface StaffMember {
  id: string;
  email: string;
  role: string;
  created_at: string;
  banned: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing authorization token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with caller's JWT to verify admin status
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: isAdmin, error: rpcError } = await userClient.rpc("is_admin");
    if (rpcError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client with service role key
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // GET — list all staff
    if (req.method === "GET") {
      const { data: users, error } = await adminClient
        .from("users")
        .select("id, email, role, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: "Failed to fetch staff" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Also fetch banned status from auth.users
      const { data: authUsers } = await adminClient.auth.admin.listUsers();
      const bannedMap = new Map<string, boolean>();
      for (const u of authUsers?.users || []) {
        if (u.banned_until) {
          bannedMap.set(u.id, true);
        }
      }

      const staff: StaffMember[] = (users || []).map((u: { id: string; email: string; role: string; created_at: string }) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        created_at: u.created_at,
        banned: bannedMap.get(u.id) || false,
      }));

      return new Response(JSON.stringify({ staff }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST — invite staff (with role)
    if (req.method === "POST") {
      const body = await req.json();
      const emails: string[] = body.emails || [];
      const role: string = body.role || "Staff";

      if (role !== "Admin" && role !== "Manager" && role !== "Staff") {
        return new Response(JSON.stringify({ error: "Invalid role" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (emails.length === 0) {
        return new Response(JSON.stringify({ error: "No emails provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const origin = new URL(req.url).origin;
      const redirectTo = `${origin}/set-password`;

      const results: { email: string; status: "invited" | "exists" | "error"; message: string }[] = [];

      for (const rawEmail of emails) {
        const email = rawEmail.trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          results.push({ email, status: "error", message: "Invalid email format" });
          continue;
        }

        // Check if user already exists in auth.users
        const { data: existing } = await adminClient.auth.admin.listUsers();
        const existingUser = existing?.users?.find((u: { email: string }) => u.email?.toLowerCase() === email);

        if (existingUser) {
          // Check if they have a profile
          const { data: profile } = await adminClient
            .from("users")
            .select("id, email, role")
            .eq("email", email)
            .maybeSingle();

          results.push({
            email,
            status: "exists",
            message: profile ? `Already a ${profile.role}` : "Auth user exists, no profile yet",
          });
          continue;
        }

        // Send invite
        const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
          redirectTo: redirectTo,
        });

        if (inviteError) {
          results.push({ email, status: "error", message: inviteError.message });
        } else {
          // After invite, set the role in the users table via set_user_role
          // The profile will be auto-created on first login via handle_new_user(),
          // but we can pre-insert with the desired role
          const invitedUser = existing?.users?.find((u: { email: string }) => u.email?.toLowerCase() === email);
          if (invitedUser) {
            await adminClient
              .from("users")
              .upsert({ id: invitedUser.id, email, role }, { onConflict: "id" });
          }
          results.push({ email, status: "invited", message: `Invitation email sent as ${role}` });
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT — update staff role or status
    if (req.method === "PUT") {
      const body = await req.json();
      const { userId, action } = body;

      if (!userId || !action) {
        return new Response(JSON.stringify({ error: "userId and action required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "setRole") {
        const newRole = body.role;
        if (!newRole || !["Admin", "Manager", "Staff"].includes(newRole)) {
          return new Response(JSON.stringify({ error: "Invalid role" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error: rpcErr } = await userClient.rpc("set_user_role", { p_user_id: userId, p_role: newRole });
        if (rpcErr) {
          return new Response(JSON.stringify({ error: rpcErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ success: true, message: `Role set to ${newRole}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "deactivate") {
        const { error: rpcErr } = await userClient.rpc("deactivate_staff", { p_user_id: userId });
        if (rpcErr) {
          return new Response(JSON.stringify({ error: rpcErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ success: true, message: "Staff deactivated" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "reactivate") {
        const { error: rpcErr } = await userClient.rpc("reactivate_staff", { p_user_id: userId });
        if (rpcErr) {
          return new Response(JSON.stringify({ error: rpcErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ success: true, message: "Staff reactivated" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "resetPassword") {
        const { data: userData, error: userErr } = await adminClient
          .from("users")
          .select("email")
          .eq("id", userId)
          .maybeSingle();

        if (userErr || !userData) {
          return new Response(JSON.stringify({ error: "User not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: resetErr } = await adminClient.auth.admin.resetPasswordForEmail(userData.email, {
          redirectTo: `${new URL(req.url).origin}/set-password`,
        });

        if (resetErr) {
          return new Response(JSON.stringify({ error: resetErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ success: true, message: "Password reset email sent" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
