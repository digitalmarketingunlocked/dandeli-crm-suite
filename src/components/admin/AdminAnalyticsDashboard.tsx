import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, CreditCard, TrendingUp, UserPlus, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function AdminAnalyticsDashboard() {
  const { data: tenants } = useQuery({
    queryKey: ["admin-analytics-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("id, name, current_plan, created_at").order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: subscriptionRequests } = useQuery({
    queryKey: ["admin-analytics-subs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subscription_requests").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: contacts } = useQuery({
    queryKey: ["admin-analytics-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("id, created_at, tenant_id");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: deals } = useQuery({
    queryKey: ["admin-analytics-deals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("id, value, stage, created_at");
      if (error) throw error;
      return data || [];
    },
  });

  // Plan distribution
  const planCounts = (tenants || []).reduce((acc, t) => {
    acc[t.current_plan] = (acc[t.current_plan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const planData = Object.entries(planCounts).map(([name, value]) => ({ name, value }));

  // Revenue from approved requests
  const approvedRequests = (subscriptionRequests || []).filter((r) => r.status === "approved");
  const totalRevenue = approvedRequests.reduce((sum, r) => sum + Number(r.amount), 0);
  const pendingRevenue = (subscriptionRequests || []).filter((r) => r.status === "pending").reduce((sum, r) => sum + Number(r.amount), 0);

  // Monthly growth (tenants created per month)
  const monthlyGrowth = (tenants || []).reduce((acc, t) => {
    const month = new Date(t.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const growthData = Object.entries(monthlyGrowth).map(([month, count]) => ({ month, count }));

  // Deal pipeline value
  const dealTotal = (deals || []).reduce((sum, d) => sum + Number(d.value || 0), 0);

  // Monthly revenue from approved subscriptions
  const monthlyRevenue = approvedRequests.reduce((acc, r) => {
    const month = new Date(r.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    acc[month] = (acc[month] || 0) + Number(r.amount);
    return acc;
  }, {} as Record<string, number>);
  const revenueData = Object.entries(monthlyRevenue).map(([month, revenue]) => ({ month, revenue }));

  const formatPrice = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Businesses</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tenants?.length || 0}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatPrice(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatPrice(pendingRevenue)} pending</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Leads</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{contacts?.length || 0}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deal Pipeline</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatPrice(dealTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">{deals?.length || 0} active deals</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {planData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={planData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                    {planData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>

        {/* User Growth */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Business Growth</CardTitle>
          </CardHeader>
          <CardContent>
            {growthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">No data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(value: number) => formatPrice(value)} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">No revenue data yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
