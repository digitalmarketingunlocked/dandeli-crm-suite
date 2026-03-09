import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  role_assigned: "bg-green-500/15 text-green-600 border-green-500/30",
  role_removed: "bg-destructive/15 text-destructive border-destructive/30",
  plan_changed: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  setting_updated: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  request_approved: "bg-green-500/15 text-green-600 border-green-500/30",
  request_rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function AdminAuditLogs() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000,
  });

  // Get admin profiles for display names
  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-for-logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name || "Unknown"]));

  const actions = [...new Set((logs || []).map((l) => l.action))];

  const filtered = (logs || []).filter((l) => {
    const matchSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.target_type.toLowerCase().includes(search.toLowerCase()) ||
      (l.target_id || "").toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === "all" || l.action === actionFilter;
    return matchSearch && matchAction;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48 rounded-xl">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card bg-card rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading audit logs...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
            No audit logs found. Actions will be recorded here.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {profileMap.get(log.admin_id) || log.admin_id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${ACTION_COLORS[log.action] || "bg-muted text-muted-foreground"} rounded-md text-[10px]`}>
                      {log.action.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="text-muted-foreground">{log.target_type}</span>
                    {log.target_id && (
                      <span className="ml-1 font-mono text-xs text-muted-foreground/70">{log.target_id.slice(0, 8)}...</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {log.details ? JSON.stringify(log.details) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
