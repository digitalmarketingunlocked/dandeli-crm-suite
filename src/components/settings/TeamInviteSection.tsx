import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, Mail } from "lucide-react";

export default function TeamInviteSection() {
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
    sales: "bg-accent/50 text-accent-foreground border-accent/30",
  };

  return (
    <div className="glass-card bg-card p-6 space-y-5">
      <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
        <Users className="w-4 h-4" /> Team Members
      </h3>

      {/* Current members */}
      {teamMembers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Members</p>
          {teamMembers.map((member) => (
            <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/50">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
                {(member.full_name || "U").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.full_name || "Unnamed"}</p>
              </div>
              {member.user_id === user?.id && (
                <Badge variant="outline" className="text-[10px] rounded-md">You</Badge>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Invites</p>
          {invites.map((invite) => (
            <div key={invite.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/50">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm flex-1 truncate">{invite.email}</span>
              <Badge variant="outline" className={`text-[10px] rounded-md font-bold uppercase ${roleBadgeColor[invite.role] || ""}`}>
                {invite.role}
              </Badge>
              <Badge variant="outline" className="text-[10px] rounded-md bg-yellow-500/15 text-yellow-600 border-yellow-500/30">
                {invite.status}
              </Badge>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-lg text-destructive hover:text-destructive"
                onClick={() => deleteInvite.mutate(invite.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Invite form */}
      <div className="border-t border-border/50 pt-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invite Team Member</p>
        <div className="flex gap-3">
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-xl"
          />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-[130px] rounded-xl"><SelectValue /></SelectTrigger>
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
            <Plus className="w-4 h-4" /> Invite
          </Button>
        </div>
      </div>
    </div>
  );
}
