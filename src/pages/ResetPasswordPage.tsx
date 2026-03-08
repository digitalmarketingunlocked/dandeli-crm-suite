import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Trees, Mountain, Waves, Sparkles } from "lucide-react";

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });
    if (window.location.hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Password updated!", description: "You can now sign in with your new password." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="glass-card bg-card w-full max-w-md p-0 overflow-hidden">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="font-heading">Invalid Link</CardTitle>
            <CardDescription>This password reset link is invalid or has expired.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            <Button className="w-full rounded-xl" onClick={() => navigate("/auth")}>Back to Sign In</Button>
          </CardContent>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 animate-float"><Trees className="w-24 h-24 text-primary" /></div>
          <div className="absolute bottom-32 right-20 animate-float" style={{ animationDelay: "2s" }}><Mountain className="w-32 h-32 text-primary" /></div>
          <div className="absolute top-1/2 left-1/3 animate-float" style={{ animationDelay: "4s" }}><Waves className="w-20 h-20 text-secondary" /></div>
        </div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-secondary/15 rounded-full blur-3xl" />
        <div className="relative z-10 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-heading font-bold text-primary-foreground mb-4">
            Dandeli<span className="text-accent">CRM</span>
          </h1>
          <p className="text-lg text-primary-foreground/70">Set your new password to continue.</p>
        </div>
      </div>

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
          <div className="glass-card bg-card p-0 overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="font-heading">Set New Password</CardTitle>
              <CardDescription>Enter your new password below</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-4">
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input id="confirm-password" type="password" placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} className="rounded-xl" />
                </div>
                <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </div>
        </div>
      </div>
    </div>
  );
}
