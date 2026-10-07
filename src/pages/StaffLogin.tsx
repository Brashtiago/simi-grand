import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Mountain, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useHotelData } from '@/lib/hotel-data';

export default function StaffLogin() {
  const { user, loading, signIn } = useAuth();
  const { settings } = useHotelData();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const dest = user.role === 'Admin' ? '/admin' : user.role === 'Manager' ? '/manager' : '/staff';
      navigate(dest, { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError);
      setSubmitting(false);
    }
    // On success, the useEffect will redirect based on role
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSending(true);
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/set-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setForgotSending(false);
    } else {
      setForgotSent(true);
      setForgotSending(false);
    }
  };

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
          {forgotMode ? (
            <>
              <button
                onClick={() => { setForgotMode(false); setForgotSent(false); setError(''); }}
                className="mb-4 flex items-center gap-1.5 text-xs text-white/40 transition-all hover:text-white/70"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </button>
              <h2 className="font-heading text-xl font-medium text-white">Reset Password</h2>
              <p className="mt-1 text-sm text-white/40">Enter your email and we'll send you a reset link.</p>

              {forgotSent ? (
                <div className="mt-6 flex items-start gap-3 rounded-sm bg-green-500/10 p-4 text-sm text-green-400">
                  <CheckCircle size={18} className="mt-0.5 shrink-0" />
                  <span>Reset link sent to <strong className="font-medium text-green-300">{forgotEmail}</strong>. Check your inbox and follow the link to set a new password.</span>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="mt-6 space-y-5">
                  <div>
                    <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-amber-200/50">
                      <Mail size={12} />
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="mt-2 w-full border-b border-white/20 bg-transparent py-2.5 text-sm text-white placeholder-white/30 focus:border-amber-200 focus:outline-none"
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>

                  {error && (
                    <div className="rounded-sm bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={forgotSending}
                    className="group flex w-full items-center justify-center gap-2 rounded-sm bg-amber-200/90 py-3 text-sm font-medium text-[#1A1C1E] transition-all duration-300 hover:bg-amber-200 disabled:opacity-50"
                  >
                    {forgotSending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Sending link...
                      </>
                    ) : (
                      <>
                        Send Reset Link
                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              <h2 className="font-heading text-xl font-medium text-white">Sign In</h2>
              <p className="mt-1 text-sm text-white/40">Authorized staff only</p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-amber-200/50">
                    <Mail size={12} />
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 w-full border-b border-white/20 bg-transparent py-2.5 text-sm text-white placeholder-white/30 focus:border-amber-200 focus:outline-none"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-amber-200/50">
                    <Lock size={12} />
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-2 w-full border-b border-white/20 bg-transparent py-2.5 text-sm text-white placeholder-white/30 focus:border-amber-200 focus:outline-none"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div className="rounded-sm bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="group flex w-full items-center justify-center gap-2 rounded-sm bg-amber-200/90 py-3 text-sm font-medium text-[#1A1C1E] transition-all duration-300 hover:bg-amber-200 disabled:opacity-50"
                >
                  {submitting ? 'Signing in...' : 'Sign In'}
                  {!submitting && <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => { setForgotMode(true); setForgotEmail(email); setError(''); }}
                  className="text-xs text-white/40 transition-all hover:text-amber-200/80"
                >
                  Forgot password?
                </button>
              </div>
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
