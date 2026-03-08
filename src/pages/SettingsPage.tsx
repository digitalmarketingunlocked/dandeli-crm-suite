import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun, User, Building2, Mail } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-heading font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="glass-card bg-card p-6 space-y-4">
        <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
          <User className="w-5 h-5 text-primary" /> Profile
        </h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input value={user?.email || ""} disabled className="rounded-xl bg-muted/30" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Full Name</Label>
            <Input value={user?.user_metadata?.full_name || ""} disabled className="rounded-xl bg-muted/30" />
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="glass-card bg-card p-6 space-y-4">
        <h3 className="font-heading font-semibold text-lg">Appearance</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-accent" />}
            <div>
              <p className="text-sm font-medium">Dark Mode</p>
              <p className="text-xs text-muted-foreground">Toggle dark theme</p>
            </div>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
        </div>
      </div>
    </div>
  );
}
