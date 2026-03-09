import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Trees, Mountain, Waves, Sparkles, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { lovable } from "@/integrations/lovable/index";
import { Separator } from "@/components/ui/separator";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import MaintenanceNotice from "@/components/MaintenanceNotice";

export default function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupCompany, setSignupCompany] = useState("");

  const { maintenanceActive, hasCountdown, countdownMs, message, deadline } = useMaintenanceMode();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: "Google sign-in failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: "Reset email sent!", description: "Check your inbox for the reset link." });
      setShowForgotPassword(false);
    } catch (err: any) {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
      toast({ title: "Welcome back!" });
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(signupEmail, signupPassword, signupName, signupCompany);
      toast({ title: "Account created!", description: "Check your email to confirm." });
    } catch (err: any) {
      toast({ title: "Signup failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const GoogleButton = () => (
    <Button variant="outline" className="w-full rounded-xl glass-subtle bg-card" onClick={handleGoogleSignIn} disabled={loading} type="button">
      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
      Continue with Google
    </Button>
  );

  const OrDivider = () => (
    <div className="relative">
      <div className="absolute inset-0 flex items-center"><Separator /></div>
      <div className="relative flex justify-center text-xs uppercase"><span className="bg-transparent backdrop-blur-sm px-3 text-muted-foreground">or</span></div>
    </div>
  );

  if (maintenanceActive) {
    return <MaintenanceNotice variant="active" message={message} deadline={deadline} />;
  }

  return (
    <div className={`min-h-screen flex relative ${hasCountdown ? "pt-16" : ""}`}>
      {hasCountdown && (
        <div className="fixed top-0 inset-x-0 z-50 p-3">
          <div className="mx-auto max-w-4xl">
            <MaintenanceNotice variant="countdown" message={message} deadline={deadline} countdownMs={countdownMs ?? 0} />
          </div>
        </div>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4 z-50 rounded-xl"
        onClick={() => navigate("/")}
      >
        <Home className="w-5 h-5" />
      </Button>
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 animate-float"><Trees className="w-24 h-24 text-primary" /></div>
          <div className="absolute bottom-32 right-20 animate-float" style={{ animationDelay: "2s" }}><Mountain className="w-32 h-32 text-primary" /></div>
          <div className="absolute top-1/2 left-1/3 animate-float" style={{ animationDelay: "4s" }}><Waves className="w-20 h-20 text-secondary" /></div>
        </div>
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-secondary/15 rounded-full blur-3xl" />
        <div className="relative z-10 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-heading font-bold text-primary-foreground mb-4">
            Dandeli<span className="text-accent">CRM</span>
          </h1>
          <p className="text-lg text-primary-foreground/70">
            The adventure tourism CRM built for Dandeli's thriving travel industry. Manage leads, deals, and bookings all in one place.
          </p>
        </div>
      </div>

      {/* Right panel - auth forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-heading font-bold text-foreground">
              Dandeli<span className="text-primary">CRM</span>
            </h1>
          </div>

          {showForgotPassword ? (
            <div className="glass-card bg-card p-0 overflow-hidden">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="font-heading">Reset Password</CardTitle>
                <CardDescription>Enter your email and we'll send you a reset link</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-4">
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input id="forgot-email" type="email" placeholder="you@company.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required className="rounded-xl" />
                  </div>
                  <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <Button type="button" variant="link" className="w-full text-sm" onClick={() => setShowForgotPassword(false)}>
                    Back to Sign In
                  </Button>
                </form>
              </CardContent>
            </div>
          ) : (
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 glass-subtle bg-muted/50 rounded-xl p-1">
              <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <div className="glass-card bg-card p-0 overflow-hidden">
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="font-heading">Welcome Back</CardTitle>
                  <CardDescription>Sign in to your CRM dashboard</CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-4 space-y-4">
                  <GoogleButton />
                  <OrDivider />
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input id="login-email" type="email" placeholder="you@company.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input id="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required className="rounded-xl" />
                    </div>
                    <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                    <Button type="button" variant="link" className="w-full text-sm" onClick={() => setShowForgotPassword(true)}>
                      Forgot your password?
                    </Button>
                  </form>
                </CardContent>
              </div>
            </TabsContent>

            <TabsContent value="signup">
              <div className="glass-card bg-card p-0 overflow-hidden">
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="font-heading">Create Account</CardTitle>
                  <CardDescription>Start managing your tourism business</CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-4 space-y-4">
                  <GoogleButton />
                  <OrDivider />
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input id="signup-name" placeholder="Your name" value={signupName} onChange={(e) => setSignupName(e.target.value)} required className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-company">Company Name</Label>
                      <Input id="signup-company" placeholder="Your resort/agency" value={signupCompany} onChange={(e) => setSignupCompany(e.target.value)} required className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" placeholder="you@company.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" type="password" placeholder="Min 6 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={6} className="rounded-xl" />
                    </div>
                    <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                      {loading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </CardContent>
              </div>
            </TabsContent>
          </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
