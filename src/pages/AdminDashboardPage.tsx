import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Shield, Users, CreditCard, CheckCircle2, XCircle, Clock, LogOut, Search, Building2,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  approved: "bg-green-500/15 text-green-600 border-green-500/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

const formatPrice = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

export default function AdminDashboardPage() {
  const { user, loading, signOut } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "approved" | "rejected"; tenantId: string; planName: string } | null>(null);

  // Fetch all subscription requests with tenant info
  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ["admin-subscription-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_requests")
        .select("*, tenants(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch all tenants with profiles
  const { data: tenants } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, profiles(full_name, user_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, status, tenantId, planName }: { id: string; status: string; tenantId: string; planName: string }) => {
      const { error } = await supabase
        .from("subscription_requests")
        .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user!.id })
        .eq("id", id);
      if (error) throw error;

      // If approved, update the tenant's current plan
      if (status === "approved") {
        const { error: tenantError } = await supabase
          .from("tenants")
          .update({ current_plan: planName.toLowerCase() })
          .eq("id", tenantId);
        if (tenantError) throw tenantError;
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      toast.success(`Request ${status} successfully`);
      setConfirmAction(null);
    },
    onError: () => toast.error("Failed to update request"),
  });

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];
  const allRequests = requests || [];
  const filteredRequests = allRequests.filter(
    (r) =>
      r.plan_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.tenants as any)?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card bg-card p-5 rounded-2xl space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Clock className="w-4 h-4" /> Pending Approvals
            </div>
            <p className="text-3xl font-bold">{pendingRequests.length}</p>
          </div>
          <div className="glass-card bg-card p-5 rounded-2xl space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Users className="w-4 h-4" /> Total Subscribers
            </div>
            <p className="text-3xl font-bold">{tenants?.length || 0}</p>
          </div>
          <div className="glass-card bg-card p-5 rounded-2xl space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <CreditCard className="w-4 h-4" /> Total Requests
            </div>
            <p className="text-3xl font-bold">{allRequests.length}</p>
          </div>
        </div>

        <Tabs defaultValue="requests" className="space-y-4">
          <TabsList className="bg-muted/50 rounded-xl p-1">
            <TabsTrigger value="requests" className="rounded-lg gap-2 text-sm">
              <CreditCard className="w-4 h-4" /> Payment Requests
            </TabsTrigger>
            <TabsTrigger value="subscribers" className="rounded-lg gap-2 text-sm">
              <Building2 className="w-4 h-4" /> Subscribers
            </TabsTrigger>
          </TabsList>

          {/* Payment Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by plan or business name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-xl"
                />
              </div>
            </div>

            <div className="glass-card bg-card rounded-2xl overflow-hidden">
              {requestsLoading ? (
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
                        <TableCell className="font-medium">
                          {(req.tenants as any)?.name || "—"}
                        </TableCell>
                        <TableCell>{req.plan_name}</TableCell>
                        <TableCell className="capitalize">{req.billing_period}</TableCell>
                        <TableCell className="font-semibold">{formatPrice(Number(req.amount))}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(req.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${STATUS_STYLES[req.status] || ""} rounded-md text-[10px]`}>
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {req.status === "pending" ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 rounded-lg text-green-600 border-green-500/30 hover:bg-green-500/10"
                                onClick={() => setConfirmAction({ id: req.id, action: "approved" })}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 rounded-lg text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => setConfirmAction({ id: req.id, action: "rejected" })}
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {req.reviewed_at
                                ? `Reviewed ${new Date(req.reviewed_at).toLocaleDateString()}`
                                : "—"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          {/* Subscribers Tab */}
          <TabsContent value="subscribers" className="space-y-4">
            <div className="glass-card bg-card rounded-2xl overflow-hidden">
              {!tenants ? (
                <div className="p-8 text-center text-muted-foreground">Loading subscribers...</div>
              ) : tenants.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No subscribers yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((t) => {
                      const owner = (t.profiles as any)?.[0];
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {owner?.full_name || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(t.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.action === "approved" ? "Approve Request?" : "Reject Request?"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.action === "approved"
                ? "This will mark the payment as verified and activate the subscriber's plan."
                : "This will reject the payment request. The subscriber will need to try again."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl"
              variant={confirmAction?.action === "approved" ? "default" : "destructive"}
              disabled={updateRequest.isPending}
              onClick={() =>
                confirmAction && updateRequest.mutate({ id: confirmAction.id, status: confirmAction.action })
              }
            >
              {updateRequest.isPending
                ? "Processing..."
                : confirmAction?.action === "approved"
                ? "Approve"
                : "Reject"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
