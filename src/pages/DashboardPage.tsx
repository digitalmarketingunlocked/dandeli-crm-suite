import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, TrendingUp, Target, Clock, Plus, CalendarDays, Phone, ChevronRight, User, MapPin, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const STAGE_COLORS: Record<string, string> = {
  inquiry: "hsl(210, 70%, 52%)",
  proposal: "hsl(38, 92%, 50%)",
  negotiation: "hsl(28, 88%, 58%)",
  booked: "hsl(162, 60%, 38%)",
  completed: "hsl(162, 60%, 28%)",
  lost: "hsl(0, 72%, 51%)",
};

const STAGE_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  proposal: "Proposal",
  negotiation: "Negotiation",
  booked: "Booked",
  completed: "Completed",
  lost: "Lost",
};

export default function DashboardPage() {
  const { tenantId, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState("month");
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: "", phone: "", check_in_date: "", check_out_date: "",
    adults_count: "2", kids_count: "0", city: "", lead_time: "", source: "organic",
  });

  const createLead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("contacts").insert({
        name: leadForm.name.trim(),
        phone: leadForm.phone.trim(),
        check_in_date: leadForm.check_in_date || null,
        check_out_date: leadForm.check_out_date || null,
        adults_count: parseInt(leadForm.adults_count) || 2,
        kids_count: parseInt(leadForm.kids_count) || 0,
        city: leadForm.city.trim() || null,
        lead_time: leadForm.lead_time.trim() || null,
        source: leadForm.source,
        type: "lead",
        tenant_id: tenantId!,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setLeadDialogOpen(false);
      setLeadForm({ name: "", phone: "", check_in_date: "", check_out_date: "", adults_count: "2", kids_count: "0", city: "", lead_time: "", source: "organic" });
      toast({ title: "Lead added!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: deals } = useQuery({
    queryKey: ["deals", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("*, contacts(name, phone)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const totalContacts = contacts?.length ?? 0;
  const totalDeals = deals?.length ?? 0;
  const activeDeals = deals?.filter((d) => !["completed", "lost"].includes(d.stage)).length ?? 0;
  const bookedDeals = deals?.filter((d) => d.stage === "booked" || d.stage === "completed").length ?? 0;
  const conversionRate = totalDeals > 0 ? Math.round((bookedDeals / totalDeals) * 100) : 0;
  const pendingFollowups = deals?.filter((d) => d.stage === "inquiry" || d.stage === "proposal").length ?? 0;

  const recentContacts = contacts?.slice(0, 5) ?? [];

  // Deal funnel data
  const stageCounts = deals
    ? ["inquiry", "proposal", "negotiation", "booked", "completed", "lost"].map((stage) => ({
        stage,
        label: STAGE_LABELS[stage],
        count: deals.filter((d) => d.stage === stage).length,
      }))
    : [];
  const maxCount = Math.max(...stageCounts.map((s) => s.count), 1);

  // Chart data
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
    { label: "TOTAL CONTACTS", value: totalContacts, icon: Users, color: "text-secondary" },
    { label: "ACTIVE DEALS", value: activeDeals, icon: TrendingUp, color: "text-accent" },
    { label: "CONVERSION RATE", value: `${conversionRate}%`, icon: Target, color: "text-primary" },
    { label: "PENDING FOLLOW-UPS", value: pendingFollowups, icon: Clock, color: "text-info" },
  ];

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "1d";
    return `${days}d`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time performance metrics</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px] rounded-xl glass-subtle bg-card">
            <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass-strong bg-card rounded-xl">
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="quarter">Quarter</SelectItem>
            <SelectItem value="year">Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* CTA Banner */}
      <div className="glass-card bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-primary">
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">Got a new inquiry?</h2>
          <p className="text-muted-foreground mt-1">Add them to your CRM instantly to start tracking and never miss a follow-up.</p>
        </div>
        <Button className="gap-2 rounded-xl shadow-lg whitespace-nowrap" onClick={() => setLeadDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Quick Add Lead
        </Button>
      </div>

      {/* Add New Lead Dialog */}
      <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}>
        <DialogContent className="glass-strong bg-card rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Add New Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createLead.mutate(); }} className="space-y-6">
            {/* Guest Information */}
            <div className="space-y-3">
              <Label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Guest Information</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Guest Name"
                  value={leadForm.name}
                  onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                  required
                  maxLength={100}
                  className="pl-10 rounded-xl"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Phone Number"
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                  maxLength={20}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>

            {/* Stay Details */}
            <div className="space-y-3">
              <Label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Stay Details</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    placeholder="Check-in"
                    value={leadForm.check_in_date}
                    onChange={(e) => setLeadForm({ ...leadForm, check_in_date: e.target.value })}
                    className="pl-10 rounded-xl"
                  />
                </div>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Guests"
                    value={leadForm.guests_count}
                    onChange={(e) => setLeadForm({ ...leadForm, guests_count: e.target.value })}
                    min={1}
                    max={100}
                    className="pl-10 rounded-xl"
                  />
                </div>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    placeholder="Check-out"
                    value={leadForm.check_out_date}
                    onChange={(e) => setLeadForm({ ...leadForm, check_out_date: e.target.value })}
                    className="pl-10 rounded-xl"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="City"
                    value={leadForm.city}
                    onChange={(e) => setLeadForm({ ...leadForm, city: e.target.value })}
                    maxLength={100}
                    className="pl-10 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-3">
              <Label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Additional Info</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Lead Time (e.g. 10:30 AM)"
                    value={leadForm.lead_time}
                    onChange={(e) => setLeadForm({ ...leadForm, lead_time: e.target.value })}
                    maxLength={50}
                    className="pl-10 rounded-xl"
                  />
                </div>
                <div className="relative">
                  <Share2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                  <Select value={leadForm.source} onValueChange={(v) => setLeadForm({ ...leadForm, source: v })}>
                    <SelectTrigger className="pl-10 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="glass-strong bg-card rounded-xl">
                      <SelectItem value="organic">Organic</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="walk-in">Walk-in</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setLeadDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl" disabled={createLead.isPending}>
                {createLead.isPending ? "Adding..." : "Add Lead"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card p-6 bg-card flex flex-col items-center text-center">
            <stat.icon className={`w-7 h-7 ${stat.color} mb-3`} />
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{stat.label}</p>
            <p className="text-3xl font-heading font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Contacts & Deal Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Contacts */}
        <div className="glass-card bg-card overflow-hidden">
          <div className="p-6 pb-3 flex items-center justify-between">
            <h3 className="font-heading font-semibold text-lg">Recent Contacts</h3>
            <Button variant="ghost" size="sm" className="text-xs text-primary gap-1" onClick={() => navigate("/contacts")}>
              View All <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="px-6 pb-6 space-y-1">
            {recentContacts.length > 0 ? (
              recentContacts.map((contact) => (
                <div key={contact.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{contact.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {contact.phone && (
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{contact.phone}</span>
                      )}
                      {contact.company && <span>· {contact.company}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                      contact.type === "customer" ? "bg-primary/15 text-primary" :
                      contact.type === "partner" ? "bg-accent/15 text-accent" :
                      "bg-secondary/15 text-secondary"
                    }`}>
                      {contact.type === "lead" ? "New Lead" : contact.type.charAt(0).toUpperCase() + contact.type.slice(1)}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1">⏱ {getTimeAgo(contact.created_at)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No contacts yet. Add your first contact!
              </div>
            )}
          </div>
        </div>

        {/* Deal Funnel */}
        <div className="glass-card bg-card overflow-hidden">
          <div className="p-6 pb-3">
            <h3 className="font-heading font-semibold text-lg">Deal Funnel</h3>
          </div>
          <div className="px-6 pb-6 space-y-4">
            {stageCounts.length > 0 ? (
              stageCounts.map((item) => (
                <div key={item.stage} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(item.count / maxCount) * 100}%`,
                        backgroundColor: STAGE_COLORS[item.stage],
                        minWidth: item.count > 0 ? "8px" : "0px",
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No deals yet. Create your first deal!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="glass-card bg-card overflow-hidden">
        <div className="p-6 pb-0">
          <h3 className="font-heading font-semibold text-lg">Revenue by Package</h3>
        </div>
        <div className="p-6">
          {packageData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={packageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {packageData.map((_, i) => (
                    <Cell key={i} fill={Object.values(STAGE_COLORS)[i % Object.values(STAGE_COLORS).length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`}
                  contentStyle={{
                    background: "hsla(var(--card))",
                    backdropFilter: "blur(12px)",
                    border: "1px solid hsla(0, 0%, 100%, 0.2)",
                    borderRadius: "12px",
                    boxShadow: "0 8px 32px hsla(0,0%,0%,0.1)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground">
              No revenue data yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
