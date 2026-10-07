import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowRight, Mountain, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useHotelData } from '@/lib/hotel-data';

export default function SetPassword() {
  const { settings } = useHotelData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [email, setEmail] = useState('');

  useEffect(() => {
    (async () => {
      // Supabase puts the recovery/invite token in the URL hash as type=...
      // The onAuthStateChange fires with SIGNED_IN when the token is valid.
      // We wait for the session to appear, then let the user set a password.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setEmail(session.user.email);
        setVerifying(false);
        return;
      }

      // If no session from hash, check for error params
      const errorDesc = searchParams.get('error_description') || searchParams.get('error');
      if (errorDesc) {
        setError(errorDesc);
        setVerifying(false);
        return;
      }

      // Try to detect the token from the hash and verify it
      const hash = window.location.hash;
      if (hash.includes('access_token') || hash.includes('refresh_token')) {
        // The Supabase client auto-processes the hash on init, so re-check session
        const { data: { session: s2 } } = await supabase.auth.getSession();
        if (s2?.user?.email) {
          setEmail(s2.user.email);
        } else {
          setError('The invitation link is invalid or has expired. Please ask an administrator to send a new invitation.');
        }
      } else {
        setError('No invitation token found. Please use the link from your invitation email.');
      }
      setVerifying(false);
    })();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);

    // Redirect to staff login after a brief delay
    setTimeout(() => {
      supabase.auth.signOut();
      navigate('/staff-login', { replace: true });
    }, 3000);
  };

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1A1C1E] px-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={28} className="animate-spin text-amber-200/70" />
          <p className="text-sm text-white/40">Verifying your invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1A1C1E] px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A1C1E] via-[#22252a] to-[#1A1C1E]" />
        <div className="absolute top-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-200/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-amber-200/20">
            <Mountain size={24} className="text-amber-200" />
          </div>
          <h1 className="mt-4 font-heading text-3xl font-light text-white">{settings?.short_name || 'Auremonté Simi Grand'}</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-amber-200/50">Staff Portal</p>
        </div>

        <div className="rounded-sm border border-white/10 bg-[#22252a]/80 p-8 backdrop-blur-md">
          {success ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle size={24} className="text-green-400" />
              </div>
              <h2 className="mt-4 font-heading text-xl font-medium text-white">Password Set</h2>
              <p className="mt-2 text-sm text-white/40">
                Your password has been set successfully. Redirecting you to the login page...
              </p>
            </div>
          ) : error && !email ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                <AlertCircle size={24} className="text-red-400" />
              </div>
              <h2 className="mt-4 font-heading text-xl font-medium text-white">Invitation Invalid</h2>
              <p className="mt-2 text-sm text-white/40">{error}</p>
              <button
                onClick={() => navigate('/staff-login')}
                className="mt-6 text-sm text-amber-200/70 underline hover:text-amber-200"
              >
                Go to Staff Login
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-heading text-xl font-medium text-white">Set Your Password</h2>
              <p className="mt-1 text-sm text-white/40">
                {email ? `Welcome, ${email}` : 'Set your password to access the staff portal'}
              </p>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-sm bg-red-500/10 p-3 text-sm text-red-400">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-amber-200/50">
                    <Lock size={12} />
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-2 w-full border-b border-white/20 bg-transparent py-2.5 text-sm text-white placeholder-white/30 focus:border-amber-200 focus:outline-none"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-amber-200/50">
                    <Lock size={12} />
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-2 w-full border-b border-white/20 bg-transparent py-2.5 text-sm text-white placeholder-white/30 focus:border-amber-200 focus:outline-none"
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="group flex w-full items-center justify-center gap-2 rounded-sm bg-amber-200/90 py-3 text-sm font-medium text-[#1A1C1E] transition-all duration-300 hover:bg-amber-200 disabled:opacity-50"
                >
                  {submitting ? 'Setting password...' : 'Set Password & Continue'}
                  {!submitting && <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-white/30">
          {settings?.name || 'Auremonté Simi Grand Hotel'} · Internal Use Only
        </p>
      </div>
    </div>
  );
}
