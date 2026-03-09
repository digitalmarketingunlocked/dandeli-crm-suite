import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  approved: "bg-green-500/15 text-green-600 border-green-500/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

const formatPrice = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

export default function AdminPaymentRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "approved" | "rejected"; tenantId: string; planName: string } | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-subscription-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_requests")
        .select("*, tenants(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, status, tenantId, planName }: { id: string; status: string; tenantId: string; planName: string }) => {
      const { error } = await supabase
        .from("subscription_requests")
        .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user!.id })
        .eq("id", id);
      if (error) throw error;

      if (status === "approved") {
        const { error: tenantError } = await supabase.from("tenants").update({ current_plan: planName.toLowerCase() }).eq("id", tenantId);
        if (tenantError) throw tenantError;
      }

      await supabase.from("audit_logs").insert({
        admin_id: user!.id,
        action: status === "approved" ? "request_approved" : "request_rejected",
        target_type: "subscription_request",
        target_id: id,
        details: { plan_name: planName, tenant_id: tenantId },
      });
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      toast.success(`Request ${status} successfully`);
      setConfirmAction(null);
    },
    onError: () => toast.error("Failed to update request"),
  });

  const allRequests = requests || [];
  const filteredRequests = allRequests.filter(
    (r) =>
      r.plan_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.tenants as any)?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by plan or business..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl" />
        </div>
      </div>

      <div className="glass-card bg-card rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading requests...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No subscription requests found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{(req.tenants as any)?.name || "—"}</TableCell>
                  <TableCell>{req.plan_name}</TableCell>
                  <TableCell className="capitalize">{req.billing_period}</TableCell>
                  <TableCell className="font-semibold">{formatPrice(Number(req.amount))}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(req.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge className={`${STATUS_STYLES[req.status] || ""} rounded-md text-[10px]`}>{req.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {req.status === "pending" ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" className="gap-1 rounded-lg text-green-600 border-green-500/30 hover:bg-green-500/10"
                          onClick={() => setConfirmAction({ id: req.id, action: "approved", tenantId: req.tenant_id, planName: req.plan_name })}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 rounded-lg text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => setConfirmAction({ id: req.id, action: "rejected", tenantId: req.tenant_id, planName: req.plan_name })}>
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {req.reviewed_at ? `Reviewed ${new Date(req.reviewed_at).toLocaleDateString()}` : "—"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{confirmAction?.action === "approved" ? "Approve Request?" : "Reject Request?"}</DialogTitle>
            <DialogDescription>
              {confirmAction?.action === "approved"
                ? "This will mark the payment as verified and activate the subscriber's plan."
                : "This will reject the payment request. The subscriber will need to try again."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button className="flex-1 rounded-xl" variant={confirmAction?.action === "approved" ? "default" : "destructive"} disabled={updateRequest.isPending}
              onClick={() => confirmAction && updateRequest.mutate({ id: confirmAction.id, status: confirmAction.action, tenantId: confirmAction.tenantId, planName: confirmAction.planName })}>
              {updateRequest.isPending ? "Processing..." : confirmAction?.action === "approved" ? "Approve" : "Reject"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
