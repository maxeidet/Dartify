import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { ArrowRight, Lock, Mail, User } from 'lucide-react';
import bdcLogo from '../assets/bdc-logo-transparent.png';
import { Segmented, SoftInput } from '../components/shared/SoftUI';

export function AuthPage() {
  const session = useAuthStore((state) => state.session);
  const location = useLocation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Signing in updates the auth store, but this route remains mounted unless
  // we explicitly navigate away from it.
  if (session) {
    const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';
    return <Navigate to={destination} replace />;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        if (!username.trim()) throw new Error('Username is required');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username.trim() }
          }
        });
        if (error) throw error;
        if (!data.session) {
          setMessage('Check your email to confirm your account, then log in.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (signUp: boolean) => {
    setIsSignUp(signUp);
    setError(null);
    setMessage(null);
  };

  return (
    <div className="flex flex-col min-h-dvh overflow-y-auto w-full bg-canvas font-sans text-slate pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),16px)] px-4 items-center justify-center">

      <div className="w-full max-w-sm flex flex-col items-center soft-rise">
        <img src={bdcLogo} alt="BDC Logo" className="w-[120px] h-auto block" />
        <h1 className="mt-6 text-[30px] leading-[1.12] font-semibold tracking-display text-slate text-center">
          {isSignUp ? 'Join the oche.' : 'Welcome back.'}
        </h1>
        <p className="mt-2 text-[15px] font-medium text-subtle text-center">
          {isSignUp ? 'Track your stats and save local players.' : 'Log in to keep scoring with friends.'}
        </p>
      </div>

      <div className="w-full max-w-sm mt-7 soft-shell p-2 soft-rise" style={{ animationDelay: '60ms' }}>
        <div className="p-2">
          <Segmented
            ariaLabel="Account"
            value={isSignUp ? 'signup' : 'login'}
            onChange={(v) => switchMode(v === 'signup')}
            options={[
              { value: 'login', label: 'Log in' },
              { value: 'signup', label: 'Sign up' },
            ]}
          />
        </div>

        <form onSubmit={handleAuth} className="soft-card mt-1 p-4 flex flex-col gap-3">
          {error && (
            <div className="px-4 py-3 rounded-2xl bg-[#FCE9E7] text-[#C4413A] text-[14px] font-medium">
              {error}
            </div>
          )}

          {message && (
            <div className="px-4 py-3 rounded-2xl bg-mint-tint text-mint-ink text-[14px] font-medium">
              {message}
            </div>
          )}

          {isSignUp && (
            <SoftInput
              icon={User}
              type="text"
              aria-label="Username"
              placeholder="Username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required={isSignUp}
            />
          )}

          <SoftInput
            icon={Mail}
            type="email"
            aria-label="Email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <SoftInput
            icon={Lock}
            type="password"
            aria-label="Password"
            placeholder="Password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full h-[56px] rounded-full soft-primary soft-press flex items-center justify-center gap-2 text-[17px] font-semibold"
          >
            {loading ? 'One moment…' : (isSignUp ? 'Create account' : 'Log in')}
            {!loading && <ArrowRight size={18} strokeWidth={2.4} />}
          </button>
        </form>
      </div>
    </div>
  );
}
