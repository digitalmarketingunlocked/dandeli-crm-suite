import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserCog, ShieldCheck, ShieldOff, Ban, CheckCircle2, MoreHorizontal, Activity } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface UserWithDetails {
  user_id: string;
  full_name: string | null;
  tenant_id: string;
  created_at: string;
  tenant_name: string;
  current_plan: string;
  roles: string[];
}

export default function AdminUserManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [roleAction, setRoleAction] = useState<{ userId: string; action: "add" | "remove"; role: string } | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Fetch profiles with tenant info
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, tenant_id, created_at, tenants(name, current_plan)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rolesError) throw rolesError;

      const roleMap = new Map<string, string[]>();
      roles?.forEach((r) => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });

      return (profiles || []).map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        tenant_id: p.tenant_id,
        created_at: p.created_at,
        tenant_name: (p.tenants as any)?.name || "—",
        current_plan: (p.tenants as any)?.current_plan || "free",
        roles: roleMap.get(p.user_id) || [],
      })) as UserWithDetails[];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, action, role }: { userId: string; action: "add" | "remove"; role: string }) => {
      if (action === "add") {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
        if (error) throw error;
      }
      // Log the action
      await supabase.from("audit_logs").insert({
        admin_id: user!.id,
        action: action === "add" ? "role_assigned" : "role_removed",
        target_type: "user",
        target_id: userId,
        details: { role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role updated successfully");
      setRoleAction(null);
    },
    onError: (e: any) => toast.error(e.message || "Failed to update role"),
  });

  const updatePlan = useMutation({
    mutationFn: async ({ tenantId, plan }: { tenantId: string; plan: string }) => {
      const { error } = await supabase.from("tenants").update({ current_plan: plan }).eq("id", tenantId);
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        admin_id: user!.id,
        action: "plan_changed",
        target_type: "tenant",
        target_id: tenantId,
        details: { new_plan: plan },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Plan updated");
    },
    onError: () => toast.error("Failed to update plan"),
  });

  const filtered = (users || []).filter((u) => {
    const matchSearch =
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      u.tenant_name.toLowerCase().includes(search.toLowerCase()) ||
      u.user_id.toLowerCase().includes(search.toLowerCase());
    const matchPlan = planFilter === "all" || u.current_plan === planFilter;
    return matchSearch && matchPlan;
  });

  const PLAN_COLORS: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    starter: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    startup: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    professional: "bg-purple-500/15 text-purple-600 border-purple-500/30",
    business: "bg-purple-500/15 text-purple-600 border-purple-500/30",
    enterprise: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search users or businesses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl" />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-40 rounded-xl">
            <SelectValue placeholder="Filter by plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="startup">Startup</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card bg-card rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading users...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No users found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{u.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{u.user_id}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{u.tenant_name}</TableCell>
                  <TableCell>
                    <Badge className={`${PLAN_COLORS[u.current_plan] || PLAN_COLORS.free} rounded-md text-[10px] capitalize`}>
                      {u.current_plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {u.roles.length > 0 ? (
                        u.roles.map((r) => (
                          <Badge key={r} variant="outline" className="text-[10px] rounded-md capitalize">
                            {r}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">user</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedUser(u)}>
                          <Activity className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {!u.roles.includes("admin") && (
                          <DropdownMenuItem onClick={() => setRoleAction({ userId: u.user_id, action: "add", role: "admin" })}>
                            <ShieldCheck className="mr-2 h-4 w-4" /> Make Admin
                          </DropdownMenuItem>
                        )}
                        {u.roles.includes("admin") && (
                          <DropdownMenuItem onClick={() => setRoleAction({ userId: u.user_id, action: "remove", role: "admin" })}>
                            <ShieldOff className="mr-2 h-4 w-4" /> Remove Admin
                          </DropdownMenuItem>
                        )}
                        {!u.roles.includes("moderator") && (
                          <DropdownMenuItem onClick={() => setRoleAction({ userId: u.user_id, action: "add", role: "moderator" })}>
                            <UserCog className="mr-2 h-4 w-4" /> Make Moderator
                          </DropdownMenuItem>
                        )}
                        {u.roles.includes("moderator") && (
                          <DropdownMenuItem onClick={() => setRoleAction({ userId: u.user_id, action: "remove", role: "moderator" })}>
                            <Ban className="mr-2 h-4 w-4" /> Remove Moderator
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => updatePlan.mutate({ tenantId: u.tenant_id, plan: "free" })}>
                          Set Free Plan
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updatePlan.mutate({ tenantId: u.tenant_id, plan: "startup" })}>
                          Set Startup Plan
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updatePlan.mutate({ tenantId: u.tenant_id, plan: "business" })}>
                          Set Business Plan
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updatePlan.mutate({ tenantId: u.tenant_id, plan: "enterprise" })}>
                          Set Enterprise Plan
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Full profile information</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Name:</span></div>
                <div className="font-medium">{selectedUser.full_name || "Unnamed"}</div>
                <div><span className="text-muted-foreground">User ID:</span></div>
                <div className="font-mono text-xs break-all">{selectedUser.user_id}</div>
                <div><span className="text-muted-foreground">Business:</span></div>
                <div className="font-medium">{selectedUser.tenant_name}</div>
                <div><span className="text-muted-foreground">Plan:</span></div>
                <div className="capitalize font-medium">{selectedUser.current_plan}</div>
                <div><span className="text-muted-foreground">Roles:</span></div>
                <div>{selectedUser.roles.length > 0 ? selectedUser.roles.join(", ") : "user"}</div>
                <div><span className="text-muted-foreground">Joined:</span></div>
                <div>{new Date(selectedUser.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Role Confirm Dialog */}
      <Dialog open={!!roleAction} onOpenChange={(open) => !open && setRoleAction(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {roleAction?.action === "add" ? `Assign ${roleAction.role} role?` : `Remove ${roleAction?.role} role?`}
            </DialogTitle>
            <DialogDescription>
              This will {roleAction?.action === "add" ? "grant" : "revoke"} the {roleAction?.role} role for this user.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setRoleAction(null)}>Cancel</Button>
            <Button
              className="flex-1 rounded-xl"
              disabled={updateRole.isPending}
              onClick={() => roleAction && updateRole.mutate(roleAction)}
            >
              {updateRole.isPending ? "Processing..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
