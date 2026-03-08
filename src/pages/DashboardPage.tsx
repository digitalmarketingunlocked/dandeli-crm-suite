import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Target, Clock, Plus, CalendarDays, Phone, ChevronRight, User, MapPin, Share2, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import LeadProfileDialog from "@/components/LeadProfileDialog";

export default function DashboardPage() {
  const { tenantId, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState("this-month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedContact, setSelectedContact] = useState<any>(null);
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

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: tenant } = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").eq("id", tenantId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
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



  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    const now = new Date();
    return contacts.filter((c) => {
      const created = new Date(c.created_at);
      switch (period) {
        case "today": {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          return created >= start;
        }
        case "this-week": {
          const day = now.getDay();
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day === 0 ? 6 : day - 1));
          return created >= start;
        }
        case "this-month": {
          const start = new Date(now.getFullYear(), now.getMonth(), 1);
          return created >= start;
        }
        case "this-year": {
          const start = new Date(now.getFullYear(), 0, 1);
          return created >= start;
        }
        case "custom": {
          if (customFrom && created < new Date(customFrom)) return false;
          if (customTo) {
            const end = new Date(customTo);
            end.setHours(23, 59, 59, 999);
            if (created > end) return false;
          }
          return true;
        }
        default:
          return true;
      }
    });
  }, [contacts, period, customFrom, customTo]);

  const totalContacts = filteredContacts.length;
  const hotLeads = filteredContacts.filter((c) => {
    const days = Math.floor((Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return days <= 3;
  }).length;
  const bookedLeads = filteredContacts.filter((c) => c.type === "booked").length;
  const conversionRate = totalContacts > 0 ? Math.round((bookedLeads / totalContacts) * 100) : 0;
  const pendingFollowups = filteredContacts.filter((c) => ["follow-up", "lead", "interested", "negotiation"].includes(c.type)).length;

  const recentHotLeads = filteredContacts.filter((c) => {
    const days = Math.floor((Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return days <= 3;
  }).slice(0, 5);

  // Lead funnel data
  const LEAD_STAGES = [
    { key: "lead", label: "New Leads", color: "hsl(210, 70%, 52%)" },
    { key: "interested", label: "Interested", color: "hsl(162, 60%, 38%)" },
    { key: "negotiation", label: "Need Discount", color: "hsl(38, 92%, 50%)" },
    { key: "booked", label: "Booked", color: "hsl(162, 60%, 28%)" },
    { key: "lost", label: "Lost", color: "hsl(0, 72%, 51%)" },
  ];
  const leadStageCounts = LEAD_STAGES.map((s) => ({
    ...s,
    count: filteredContacts.filter((c) => c.type === s.key).length,
  }));
  const maxLeadCount = Math.max(...leadStageCounts.map((s) => s.count), 1);

  const stats = [
    { label: "TOTAL LEADS", value: totalContacts, icon: Users, color: "text-secondary", link: "/leads?filter=all" },
    { label: "HOT LEADS", value: hotLeads, icon: Flame, color: "text-accent", link: "/leads?filter=hot" },
    { label: "CONVERSION RATE", value: `${conversionRate}%`, icon: Target, color: "text-primary", link: "/leads?filter=booked" },
    { label: "PENDING FOLLOW-UPS", value: pendingFollowups, icon: Clock, color: "text-info", link: "/follow-ups" },
  ];

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "1d";
    return `${days}d`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="space-y-6">
      {/* Header with Filter */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{getGreeting()}, <span className="font-semibold text-foreground">{profile?.full_name || user?.email || "User"}</span></p>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground truncate">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm">Real-time performance metrics of <span className="font-medium text-foreground">{tenant?.name && tenant.name !== user?.email ? tenant.name : "your resort"}</span></p>
        </div>
        <div className="flex items-center gap-2 self-end">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg glass-subtle bg-card shrink-0">
              <CalendarDays className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-strong bg-card rounded-xl">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom Date Range */}
      {period === "custom" && (
        <div className="flex items-center gap-3 justify-end">
          <DateInput value={customFrom} onChange={setCustomFrom} placeholder="From" className="w-[160px] h-8 text-xs rounded-lg" />
          <span className="text-xs text-muted-foreground">to</span>
          <DateInput value={customTo} onChange={setCustomTo} placeholder="To" className="w-[160px] h-8 text-xs rounded-lg" />
        </div>
      )}

      {/* CTA Banner */}
      <div className="glass-card bg-card p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-l-4 border-primary">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-foreground">Got a new inquiry?</h2>
          <p className="text-muted-foreground mt-1 text-sm">Add them to your CRM instantly to start tracking.</p>
        </div>
        <Button className="gap-2 rounded-xl shadow-lg whitespace-nowrap shrink-0" onClick={() => setLeadDialogOpen(true)}>
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
                  placeholder="Guest Name *"
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
                  placeholder="Phone Number *"
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                  required
                  maxLength={20}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>

            {/* Stay Details */}
            <div className="space-y-3">
              <Label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Stay Details</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Check-in Date *</Label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={leadForm.check_in_date}
                      onChange={(e) => setLeadForm({ ...leadForm, check_in_date: e.target.value })}
                      required
                      className="pl-10 rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Check-out Date</Label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={leadForm.check_out_date}
                      onChange={(e) => setLeadForm({ ...leadForm, check_out_date: e.target.value })}
                      className="pl-10 rounded-xl"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Adults</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="Adults"
                      value={leadForm.adults_count}
                      onChange={(e) => setLeadForm({ ...leadForm, adults_count: e.target.value })}
                      min={1}
                      max={100}
                      className="pl-10 rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Kids</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="Kids"
                      value={leadForm.kids_count}
                      onChange={(e) => setLeadForm({ ...leadForm, kids_count: e.target.value })}
                      min={0}
                      max={100}
                      className="pl-10 rounded-xl"
                    />
                  </div>
                </div>
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
                      <SelectItem value="google-ads">Google Ads</SelectItem>
                      <SelectItem value="meta-ads">Meta Ads</SelectItem>
                      <SelectItem value="offline-marketing">Offline Marketing</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
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
          <div
            key={stat.label}
            className="glass-card p-4 sm:p-6 bg-card flex flex-col items-center text-center cursor-pointer"
            onClick={() => navigate(stat.link)}
          >
            <stat.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${stat.color} mb-2 sm:mb-3`} />
            <p className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-muted-foreground uppercase leading-tight">{stat.label}</p>
            <p className="text-2xl sm:text-3xl font-heading font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Hot Leads & Lead Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Hot Leads */}
        <div className="glass-card bg-card overflow-hidden">
          <div className="p-6 pb-3 flex items-center justify-between">
            <h3 className="font-heading font-semibold text-lg">Recent Hot Leads</h3>
            <Button variant="ghost" size="sm" className="text-xs text-primary gap-1" onClick={() => navigate("/leads")}>
              View All <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="px-6 pb-6 space-y-1">
            {recentHotLeads.length > 0 ? (
              recentHotLeads.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedContact(contact)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{contact.name}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      {contact.phone && <span className="truncate max-w-[100px]">{contact.phone}</span>}
                      <span className="flex items-center gap-0.5 whitespace-nowrap"><Users className="w-3 h-3" />{(contact.adults_count || 0) + (contact.kids_count || 0)}</span>
                      <span className="flex items-center gap-0.5 whitespace-nowrap"><Clock className="w-3 h-3" />{getTimeAgo(contact.created_at)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg ${
                      contact.type === "booked" ? "bg-primary/15 text-primary" :
                      contact.type === "interested" ? "bg-accent/15 text-accent" :
                      contact.type === "follow-up" ? "bg-accent/15 text-accent" :
                      "bg-secondary/15 text-secondary"
                    }`}>
                      {contact.type === "lead" ? "New Lead" : contact.type === "booked" ? "Booked" : contact.type.charAt(0).toUpperCase() + contact.type.slice(1).replace("-", " ")}
                    </span>
                    <p className="text-[10px] text-muted-foreground">Last: {new Date(contact.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No hot leads right now.
              </div>
            )}
          </div>
        </div>

        {/* Lead Funnel */}
        <div className="glass-card bg-card overflow-hidden">
          <div className="p-6 pb-3">
            <h3 className="font-heading font-semibold text-lg">Lead Funnel</h3>
          </div>
          <div className="px-6 pb-6 space-y-3">
            {leadStageCounts.map((item) => (
              <div
                key={item.key}
                className="space-y-1.5 p-2.5 -mx-2.5 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => navigate(`/leads?status=${item.key}`)}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{item.count}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(item.count / maxLeadCount) * 100}%`,
                      backgroundColor: item.color,
                      minWidth: item.count > 0 ? "8px" : "0px",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lead Profile Dialog */}
      <LeadProfileDialog
        contact={selectedContact}
        open={!!selectedContact}
        onOpenChange={(open) => !open && setSelectedContact(null)}
      />
    </div>
  );
}
