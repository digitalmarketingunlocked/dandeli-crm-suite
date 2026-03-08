import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, TrendingUp, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const STAGE_COLORS: Record<string, string> = {
  inquiry: "hsl(210, 70%, 52%)",
  proposal: "hsl(38, 92%, 50%)",
  negotiation: "hsl(28, 88%, 58%)",
  booked: "hsl(162, 60%, 38%)",
  completed: "hsl(162, 60%, 28%)",
  lost: "hsl(0, 72%, 51%)",
};

export default function DashboardPage() {
  const { tenantId } = useAuth();

  const { data: contacts } = useQuery({
    queryKey: ["contacts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: deals } = useQuery({
    queryKey: ["deals", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const totalContacts = contacts?.length ?? 0;
  const totalDeals = deals?.length ?? 0;
  const totalValue = deals?.reduce((sum, d) => sum + (d.value ?? 0), 0) ?? 0;
  const activeDeals = deals?.filter((d) => !["completed", "lost"].includes(d.stage)).length ?? 0;

  const stageData = deals
    ? Object.entries(
        deals.reduce((acc, d) => {
          acc[d.stage] = (acc[d.stage] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, value]) => ({ name, value }))
    : [];

  const packageData = deals
    ? Object.entries(
        deals.reduce((acc, d) => {
          const pkg = d.package_type || "unspecified";
          acc[pkg] = (acc[pkg] || 0) + (d.value ?? 0);
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, value]) => ({ name, value }))
    : [];

  const stats = [
    { label: "Total Contacts", value: totalContacts, icon: Users, gradient: "from-secondary to-info" },
    { label: "Active Deals", value: activeDeals, icon: Target, gradient: "from-accent to-warning" },
    { label: "Total Revenue", value: `₹${totalValue.toLocaleString("en-IN")}`, icon: TrendingUp, gradient: "from-primary to-secondary" },
    { label: "Total Deals", value: totalDeals, icon: Calendar, gradient: "from-info to-primary" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your tourism business</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card p-6 bg-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-heading font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                <stat.icon className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card bg-card overflow-hidden">
          <div className="p-6 pb-0">
            <h3 className="font-heading font-semibold text-lg">Deals by Stage</h3>
          </div>
          <div className="p-6">
            {stageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsla(210, 15%, 50%, 0.15)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsla(0, 0%, 100%, 0.8)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid hsla(0, 0%, 100%, 0.3)",
                      borderRadius: "12px",
                      boxShadow: "0 8px 32px hsla(0,0%,0%,0.1)",
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {stageData.map((entry) => (
                      <Cell key={entry.name} fill={STAGE_COLORS[entry.name] || "hsl(162, 60%, 38%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No deals yet. Create your first deal!
              </div>
            )}
          </div>
        </div>

        <div className="glass-card bg-card overflow-hidden">
          <div className="p-6 pb-0">
            <h3 className="font-heading font-semibold text-lg">Revenue by Package</h3>
          </div>
          <div className="p-6">
            {packageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={packageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {packageData.map((_, i) => (
                      <Cell key={i} fill={Object.values(STAGE_COLORS)[i % Object.values(STAGE_COLORS).length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`}
                    contentStyle={{
                      background: "hsla(0, 0%, 100%, 0.8)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid hsla(0, 0%, 100%, 0.3)",
                      borderRadius: "12px",
                      boxShadow: "0 8px 32px hsla(0,0%,0%,0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No revenue data yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
