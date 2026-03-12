import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, Mail, Shield, UserCheck, Clock } from "lucide-react";

export default function TeamManagementSettings() {
  const { tenantId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("sales");

  const { data: invites = [] } = useQuery({
    queryKey: ["team_invites", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_invites")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team_members", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const sendInvite = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("team_invites").insert({
        tenant_id: tenantId!,
        email: email.toLowerCase().trim(),
        role,
        invited_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_invites"] });
      setEmail("");
      setRole("sales");
      toast({ title: "Invitation sent!" });
    },
    onError: (err: any) => {
      if (err.message?.includes("duplicate")) {
        toast({ title: "Already invited", description: "This email has already been invited.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    },
  });

  const deleteInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_invites"] });
      toast({ title: "Invitation removed" });
    },
  });

  const roleBadgeColor: Record<string, string> = {
    manager: "bg-primary/15 text-primary border-primary/30",
    sales: "bg-secondary/15 text-secondary border-secondary/30",
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Team Management</h3>
        <p className="text-sm text-muted-foreground">Manage your team members, roles, and invitations.</p>
      </div>

      {/* Active Members */}
      <div className="glass-card bg-card p-5 space-y-4 rounded-2xl">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
            <UserCheck className="w-4 h-4" /> Active Members ({teamMembers.length})
          </h4>
        </div>

        <div className="space-y-2">
          {teamMembers.map((member) => (
            <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/50">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                {(member.full_name || "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.full_name || "Unnamed"}</p>
                <p className="text-xs text-muted-foreground">Joined {new Date(member.created_at).toLocaleDateString()}</p>
              </div>
              {member.user_id === user?.id && (
                <Badge variant="outline" className="text-[10px] rounded-md bg-primary/10 text-primary border-primary/30">You</Badge>
              )}
              <Badge variant="outline" className="text-[10px] rounded-md">
                <Shield className="w-3 h-3 mr-1" />
                {member.user_id === user?.id ? "Owner" : "Member"}
              </Badge>
            </div>
          ))}
          {teamMembers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No team members yet.</p>
          )}
        </div>
      </div>

      {/* Pending Invites */}
      <div className="glass-card bg-card p-5 space-y-4 rounded-2xl">
        <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
          <Clock className="w-4 h-4" /> Pending Invitations ({invites.length})
        </h4>

        <div className="space-y-2">
          {invites.map((invite) => (
            <div key={invite.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/50">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Mail className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{invite.email}</p>
                <p className="text-xs text-muted-foreground">Invited {new Date(invite.created_at).toLocaleDateString()}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] rounded-md font-bold uppercase ${roleBadgeColor[invite.role] || ""}`}>
                {invite.role}
              </Badge>
              <Badge variant="outline" className="text-[10px] rounded-md bg-accent/10 text-accent border-accent/30">
                {invite.status}
              </Badge>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => deleteInvite.mutate(invite.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          {invites.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No pending invitations.</p>
          )}
        </div>
      </div>

      {/* Invite Form */}
      <div className="glass-card bg-card p-5 space-y-4 rounded-2xl">
        <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
          <Plus className="w-4 h-4" /> Invite New Member
        </h4>
        <div className="flex gap-3">
          <Input
            type="email"
            placeholder="e.g. john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-xl"
          />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-[140px] rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent className="glass-strong bg-card rounded-xl">
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="sales">Sales Member</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="rounded-xl gap-2"
            disabled={!email.trim() || sendInvite.isPending}
            onClick={() => sendInvite.mutate()}
          >
            <Mail className="w-4 h-4" /> Send Invite
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Invited members will receive an email with instructions to join your team.
        </p>
      </div>
    </div>
  );
}
