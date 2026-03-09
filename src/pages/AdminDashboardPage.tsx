import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, CreditCard, LogOut, Building2, Users, BarChart3, FileText, Settings2, Clock,
} from "lucide-react";

import AdminPaymentRequests from "@/components/admin/AdminPaymentRequests";
import AdminUserManagement from "@/components/admin/AdminUserManagement";
import AdminAnalyticsDashboard from "@/components/admin/AdminAnalyticsDashboard";
import AdminAuditLogs from "@/components/admin/AdminAuditLogs";
import AdminSystemSettings from "@/components/admin/AdminSystemSettings";

export default function AdminDashboardPage() {
  const { user, loading, signOut } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();

  // Quick stats for header
  const { data: pendingCount } = useQuery({
    queryKey: ["admin-pending-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("subscription_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count || 0;
    },
    enabled: isAdmin,
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
          <div className="flex items-center gap-3">
            {(pendingCount || 0) > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-yellow-600 bg-yellow-500/10 px-3 py-1.5 rounded-full">
                <Clock className="w-3.5 h-3.5" />
                {pendingCount} pending
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="bg-muted/50 rounded-xl p-1 flex-wrap h-auto gap-1">
            <TabsTrigger value="analytics" className="rounded-lg gap-2 text-sm">
              <BarChart3 className="w-4 h-4" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg gap-2 text-sm">
              <Users className="w-4 h-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="payments" className="rounded-lg gap-2 text-sm">
              <CreditCard className="w-4 h-4" /> Payments
            </TabsTrigger>
            <TabsTrigger value="audit" className="rounded-lg gap-2 text-sm">
              <FileText className="w-4 h-4" /> Audit Logs
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg gap-2 text-sm">
              <Settings2 className="w-4 h-4" /> System Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AdminAnalyticsDashboard />
          </TabsContent>
          <TabsContent value="users">
            <AdminUserManagement />
          </TabsContent>
          <TabsContent value="payments">
            <AdminPaymentRequests />
          </TabsContent>
          <TabsContent value="audit">
            <AdminAuditLogs />
          </TabsContent>
          <TabsContent value="settings">
            <AdminSystemSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
