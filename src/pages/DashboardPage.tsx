import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, TrendingUp, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const STAGE_COLORS: Record<string, string> = {
  inquiry: "hsl(200, 80%, 44%)",
  proposal: "hsl(38, 92%, 50%)",
  negotiation: "hsl(28, 90%, 55%)",
  booked: "hsl(158, 64%, 32%)",
  completed: "hsl(158, 64%, 22%)",
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
    { label: "Total Contacts", value: totalContacts, icon: Users, color: "text-secondary" },
    { label: "Active Deals", value: activeDeals, icon: Target, color: "text-accent" },
    { label: "Total Revenue", value: `₹${totalValue.toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-primary" },
    { label: "Total Deals", value: totalDeals, icon: Calendar, color: "text-info" },
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
          <Card key={stat.label} className="border-border hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-heading font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-10 h-10 ${stat.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Deals by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {stageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 10%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {stageData.map((entry) => (
                      <Cell key={entry.name} fill={STAGE_COLORS[entry.name] || "hsl(158, 64%, 32%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No deals yet. Create your first deal!
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Revenue by Package</CardTitle>
          </CardHeader>
          <CardContent>
            {packageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={packageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {packageData.map((_, i) => (
                      <Cell key={i} fill={Object.values(STAGE_COLORS)[i % Object.values(STAGE_COLORS).length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No revenue data yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
