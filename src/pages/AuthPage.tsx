import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, ShieldCheck } from 'lucide-react';

export function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  function handleSignIn() {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 4) {
      setError('Invalid credentials. Please try again.');
      return;
    }
    navigate('/projects');
  }

  function handleForgotSubmit() {
    if (!forgotEmail.includes('@')) return;
    setForgotSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/40 via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="items-center text-center pb-4">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-extrabold">NeuroValidate</CardTitle>
          <CardDescription className="mt-1">
            {showForgot ? 'Reset your password' : 'Sign in to your RWE / RWD neurology validation workspace'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-2">
          {!showForgot ? (
            <>
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Email</label>
                <Input
                  placeholder="you@neurovalidate.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Password</label>
                  <button
                    onClick={() => { setShowForgot(true); setError(''); }}
                    className="text-xs text-primary hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                />
              </div>
              <Button className="w-full h-11 text-sm font-bold" onClick={handleSignIn}>
                Sign In
              </Button>
              <Separator />
              <p className="text-center text-xs text-muted-foreground">
                By continuing you agree to the Terms of Service and Privacy Policy.
              </p>
            </>
          ) : (
            <>
              {forgotSent ? (
                <div className="space-y-4 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    If an account exists for <strong>{forgotEmail}</strong>, you will receive a password reset link shortly.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(''); }}>
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">Email address</label>
                    <Input
                      placeholder="you@neurovalidate.com"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleForgotSubmit()}
                    />
                  </div>
                  <Button className="w-full h-11 text-sm font-bold" onClick={handleForgotSubmit}>
                    Send Reset Link
                  </Button>
                  <button
                    onClick={() => { setShowForgot(false); setForgotEmail(''); }}
                    className="w-full text-center text-xs text-primary hover:underline cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
