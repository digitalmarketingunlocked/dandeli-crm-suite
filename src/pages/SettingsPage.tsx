import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLeadStatuses, STAGE_COLOR_MAP, COLOR_OPTIONS } from "@/hooks/useLeadStatuses";
import { Moon, Sun, User, Building2, Bell, Settings as SettingsIcon, MapPin, Plus, Trash2, Pencil, Tag } from "lucide-react";

export default function SettingsPage() {
  const { user, tenantId } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Profile
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: tenant } = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").eq("id", tenantId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const [fullName, setFullName] = useState("");
  const [resortName, setResortName] = useState("");
  const [resortLocation, setResortLocation] = useState("");
  const [pushNotifications, setPushNotifications] = useState(true);

  // Sync state when data loads
  useState(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ full_name: fullName || profile?.full_name }).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Profile updated!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-heading font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance */}
        <div className="glass-card bg-card p-6 space-y-4">
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" /> Appearance
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme Mode</p>
              <p className="text-xs text-muted-foreground">Switch between light and dark themes.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={theme === "light" ? "default" : "ghost"}
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => theme === "dark" && toggleTheme()}
              >
                <Sun className="w-4 h-4" />
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "ghost"}
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => theme === "light" && toggleTheme()}
              >
                <Moon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-card bg-card p-6 space-y-4">
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
            <Bell className="w-4 h-4" /> Notifications
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Push Notifications</p>
              <p className="text-xs text-muted-foreground">Receive alerts for new leads and follow-ups.</p>
            </div>
            <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
          </div>
        </div>

        {/* Resort Profile */}
        <div className="glass-card bg-card p-6 space-y-4">
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Resort Profile
          </h3>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Resort Name</Label>
              <Input
                value={resortName || tenant?.name || ""}
                onChange={(e) => setResortName(e.target.value)}
                className="rounded-xl"
                placeholder="Your resort name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Location</Label>
              <Input
                value={resortLocation}
                onChange={(e) => setResortLocation(e.target.value)}
                className="rounded-xl"
                placeholder="e.g. Dandeli, Karnataka"
              />
            </div>
            <Button className="w-full rounded-xl">Save Profile</Button>
          </div>
        </div>

        {/* User Account */}
        <div className="glass-card bg-card p-6 space-y-4">
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
            <User className="w-4 h-4" /> User Account
          </h3>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
              {(profile?.full_name || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-sm">{profile?.full_name || "User"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Full Name</Label>
            <Input
              value={fullName || profile?.full_name || ""}
              onChange={(e) => setFullName(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? "Saving..." : "Update Name"}
          </Button>
          <Button variant="outline" className="w-full rounded-xl">
            Change Password
          </Button>
        </div>
      </div>

      {/* CRM Configuration */}
      <div className="glass-card bg-card p-6 space-y-5">
        <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
          <SettingsIcon className="w-4 h-4" /> CRM Configuration
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔥</span>
              <p className="font-medium text-sm">Hot Lead Definition</p>
            </div>
            <p className="text-xs text-muted-foreground">A lead is considered "Hot" if contacted within:</p>
            <select className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
              <option>3 Hours</option>
              <option>6 Hours</option>
              <option>12 Hours</option>
              <option>24 Hours</option>
              <option>3 Days</option>
            </select>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">❄️</span>
              <p className="font-medium text-sm">Cold Lead Follow-up Visibility</p>
            </div>
            <p className="text-xs text-muted-foreground">Show leads in Cold Follow-up list:</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="cold-visibility" defaultChecked className="accent-primary" />
                Up to 1 month from lead date
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="cold-visibility" className="accent-primary" />
                Until Check-in date
              </label>
            </div>
          </div>
        </div>
        <Button className="rounded-xl">Apply CRM Settings</Button>
      </div>
    </div>
  );
}
