import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Building2, MapPin } from "lucide-react";
import ChangePasswordDialog from "@/components/settings/ChangePasswordDialog";

export default function AccountSettings() {
  const { user, tenantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Account</h3>
        <p className="text-sm text-muted-foreground">Manage your personal and resort information.</p>
      </div>

      {/* User Account */}
      <div className="glass-card bg-card p-5 space-y-4 rounded-2xl">
        <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
          <User className="w-4 h-4" /> User Account
        </h4>
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
          <Input value={fullName || profile?.full_name || ""} onChange={(e) => setFullName(e.target.value)} className="rounded-xl" />
        </div>
        <Button variant="outline" className="w-full rounded-xl" onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
          {updateProfile.isPending ? "Saving..." : "Update Name"}
        </Button>
        <Button variant="outline" className="w-full rounded-xl" onClick={() => setChangePasswordOpen(true)}>
          Change Password
        </Button>
      </div>

      {/* Resort Profile */}
      <div className="glass-card bg-card p-5 space-y-4 rounded-2xl">
        <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
          <Building2 className="w-4 h-4" /> Resort Profile
        </h4>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Resort Name</Label>
            <Input
              value={resortName || (tenant?.name && tenant.name !== user?.email ? tenant.name : "") || ""}
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

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  );
}
