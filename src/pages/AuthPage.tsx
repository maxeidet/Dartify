import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import bdcLogo from '../assets/bdc-logo-transparent.png';

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

  return (
    <div className="flex flex-col min-h-screen w-full bg-cream bg-dart-texture font-sans text-ink pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),16px)] px-6 items-center justify-center">
      
      <div className="w-full max-w-[140px] mb-8">
        <img src={bdcLogo} alt="BDC Logo" className="w-full h-auto block" />
      </div>

      <div className="w-full max-w-sm bg-panel border border-line rounded-[24px] p-6 sm:p-8 shadow-xl">
        <h2 className="font-display font-black text-2xl text-forest-deep mb-2 text-center">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-sm text-muted font-medium text-center mb-6">
          {isSignUp ? 'Sign up to track your stats and save local players.' : 'Log in to continue playing with friends.'}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-semibold p-3 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-100 text-green-700 text-sm font-semibold p-3 rounded-xl mb-4 text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          
          {isSignUp && (
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[10.5px] font-bold tracking-[2px] text-gold-deep uppercase">
                Username
              </label>
              <input
                type="text"
                placeholder="DartMaster99"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required={isSignUp}
                className="w-full px-4 py-3.5 rounded-xl bg-cream border border-line text-forest-deep placeholder-muted text-sm font-sans font-semibold focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[10.5px] font-bold tracking-[2px] text-gold-deep uppercase">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3.5 rounded-xl bg-cream border border-line text-forest-deep placeholder-muted text-sm font-sans font-semibold focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[10.5px] font-bold tracking-[2px] text-gold-deep uppercase">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3.5 rounded-xl bg-cream border border-line text-forest-deep placeholder-muted text-sm font-sans font-semibold focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-4 rounded-xl bg-gold font-sans font-bold text-[15px] text-white hover:bg-gold-deep active:scale-[0.98] transition-all duration-200 shadow-[0_4px_14px_rgba(191,164,100,0.4)] disabled:opacity-70"
          >
            {loading ? 'Processing...' : (isSignUp ? 'SIGN UP' : 'LOG IN')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
            className="text-sm font-semibold text-forest hover:text-forest-deep transition-colors"
          >
            {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
          </button>
        </div>

      </div>
    </div>
  );
}
