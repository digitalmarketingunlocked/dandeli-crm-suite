import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings2, Shield, ToggleLeft, Users, Save } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string | null;
  updated_at: string;
}

export default function AdminSystemSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_settings").select("*").order("key");
      if (error) throw error;
      return data as SystemSetting[];
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from("system_settings")
        .update({ value, updated_at: new Date().toISOString(), updated_by: user!.id })
        .eq("key", key);
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        admin_id: user!.id,
        action: "setting_updated",
        target_type: "system_setting",
        target_id: key,
        details: { new_value: value },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-system-settings"] });
      toast.success("Setting updated");
    },
    onError: () => toast.error("Failed to update setting"),
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;

  const getSetting = (key: string) => settings?.find((s) => s.key === key);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <MaintenanceModeCard setting={getSetting("maintenance_mode")} onSave={(v) => updateSetting.mutate({ key: "maintenance_mode", value: v })} />
      <RegistrationCard setting={getSetting("registration_enabled")} onSave={(v) => updateSetting.mutate({ key: "registration_enabled", value: v })} />
      <TeamLimitsCard setting={getSetting("max_team_members")} onSave={(v) => updateSetting.mutate({ key: "max_team_members", value: v })} />
      <FeatureFlagsCard setting={getSetting("feature_flags")} onSave={(v) => updateSetting.mutate({ key: "feature_flags", value: v })} />
    </div>
  );
}

function MaintenanceModeCard({ setting, onSave }: { setting?: SystemSetting; onSave: (v: any) => void }) {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (setting) {
      setEnabled(setting.value?.enabled || false);
      setMessage(setting.value?.message || "");
    }
  }, [setting]);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-destructive" />
          <CardTitle className="text-sm font-semibold">Maintenance Mode</CardTitle>
        </div>
        <CardDescription className="text-xs">Put the app in maintenance mode for all users</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Enabled</Label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Maintenance Message</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="rounded-xl text-sm" rows={2} />
        </div>
        <Button size="sm" className="rounded-xl gap-2" onClick={() => onSave({ enabled, message })}>
          <Save className="h-3.5 w-3.5" /> Save
        </Button>
      </CardContent>
    </Card>
  );
}

function RegistrationCard({ setting, onSave }: { setting?: SystemSetting; onSave: (v: any) => void }) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (setting) setEnabled(setting.value?.enabled ?? true);
  }, [setting]);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Registration</CardTitle>
        </div>
        <CardDescription className="text-xs">Control whether new users can register</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Allow Registrations</Label>
          <Switch checked={enabled} onCheckedChange={(checked) => { setEnabled(checked); onSave({ enabled: checked }); }} />
        </div>
      </CardContent>
    </Card>
  );
}

function TeamLimitsCard({ setting, onSave }: { setting?: SystemSetting; onSave: (v: any) => void }) {
  const [limits, setLimits] = useState<Record<string, number>>({});

  useEffect(() => {
    if (setting) setLimits(setting.value || {});
  }, [setting]);

  const updateLimit = (plan: string, val: string) => {
    setLimits((prev) => ({ ...prev, [plan]: parseInt(val) || 0 }));
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Team Member Limits</CardTitle>
        </div>
        <CardDescription className="text-xs">Max team members per plan tier</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(limits).map(([plan, count]) => (
          <div key={plan} className="flex items-center justify-between gap-4">
            <Label className="capitalize text-sm">{plan}</Label>
            <Input type="number" value={count} onChange={(e) => updateLimit(plan, e.target.value)} className="w-20 rounded-xl text-center" />
          </div>
        ))}
        <Button size="sm" className="rounded-xl gap-2" onClick={() => onSave(limits)}>
          <Save className="h-3.5 w-3.5" /> Save
        </Button>
      </CardContent>
    </Card>
  );
}

function FeatureFlagsCard({ setting, onSave }: { setting?: SystemSetting; onSave: (v: any) => void }) {
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (setting) setFlags(setting.value || {});
  }, [setting]);

  const toggleFlag = (key: string) => {
    const updated = { ...flags, [key]: !flags[key] };
    setFlags(updated);
    onSave(updated);
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ToggleLeft className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Feature Flags</CardTitle>
        </div>
        <CardDescription className="text-xs">Enable/disable features globally</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(flags).map(([key, enabled]) => (
          <div key={key} className="flex items-center justify-between">
            <Label className="text-sm">{key.replace(/_/g, " ")}</Label>
            <Switch checked={enabled} onCheckedChange={() => toggleFlag(key)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
