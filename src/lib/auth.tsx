import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type StaffRole = 'Admin' | 'Manager' | 'Staff';

interface StaffUser {
  id: string;
  email: string;
  role: StaffRole;
}

interface AuthContextType {
  session: Session | null;
  user: StaffUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signIn: async () => ({ error: 'Not initialized' }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (uid: string, email: string): Promise<StaffUser | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', uid)
      .maybeSingle();

    if (error || !data) {
      // Profile doesn't exist yet — call the auto-create function
      const { error: fnError } = await supabase.rpc('handle_new_user');
      if (fnError) return null;

      // Re-fetch after creation
      const { data: newData } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', uid)
        .maybeSingle();

      if (!newData) return null;
      return { id: newData.id, email: newData.email, role: newData.role as StaffRole };
    }

    return { id: data.id, email: data.email, role: data.role as StaffRole };
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session } = {} } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(session ?? null);

      if (session?.user) {
        const u = await fetchUser(session.user.id, session.user.email || '');
        if (mounted) setUser(u);
      }

      if (mounted) setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        if (session?.user) {
          const u = await fetchUser(session.user.id, session.user.email || '');
          if (mounted) setUser(u);
        } else {
          if (mounted) setUser(null);
        }
        if (mounted) setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
