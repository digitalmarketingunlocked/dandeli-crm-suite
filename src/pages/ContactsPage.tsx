import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLeadStatuses, STAGE_COLOR_MAP } from "@/hooks/useLeadStatuses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Phone, CalendarDays, Users, MapPin, Clock, Share2, User,
  Filter, FileSpreadsheet, MessageCircle, Flame, Snowflake, ChevronRight, StickyNote,
  Bell, Repeat, History, PhoneCall, CalendarIcon, Download
} from "lucide-react";
import { exportContactsToXls } from "@/lib/exportXls";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

type Contact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  adults_count: number | null;
  kids_count: number | null;
  guests_count: number | null;
  city: string | null;
  lead_time: string | null;
  source: string | null;
  type: string;
  notes: string | null;
  company: string | null;
  tenant_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  follow_up_date: string | null;
  recurring: string | null;
};

type CallHistory = {
  id: string;
  contact_id: string;
  tenant_id: string;
  called_at: string;
  duration: string | null;
  notes: string | null;
  created_by: string | null;
};

type Reminder = {
  id: string;
  contact_id: string;
  tenant_id: string;
  reminder_date: string;
  message: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
};

// Removed hardcoded STAGE_OPTIONS and STAGE_STYLES - now using useLeadStatuses hook

const SOURCE_LABELS: Record<string, string> = {
  organic: "Organic",
  "google-ads": "Google Ads",
  "meta-ads": "Meta Ads",
  "offline-marketing": "Offline Marketing",
  referral: "Referral",
};

export default function ContactsPage() {
  const { tenantId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { statuses: leadStatuses } = useLeadStatuses();
  const STAGE_OPTIONS = leadStatuses.map((s) => ({ value: s.value, label: s.label }));
  const getStageStyle = (type: string) => {
    const status = leadStatuses.find((s) => s.value === type);
    return status ? (STAGE_COLOR_MAP[status.color] || STAGE_COLOR_MAP.secondary) : STAGE_COLOR_MAP.secondary;
  };
  const [searchParams] = useSearchParams();
  const urlFilter = searchParams.get("filter");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>(() => {
    if (urlFilter === "booked") return "booked";
    return "all";
  });
  const [checkInFilter, setCheckInFilter] = useState("");
  const [lastContactedFilter, setLastContactedFilter] = useState("");
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [hotOnly, setHotOnly] = useState(() => urlFilter === "hot");

  // Add lead dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: "", phone: "", check_in_date: "", check_out_date: "",
    adults_count: "2", kids_count: "0", city: "", lead_time: "", source: "organic",
  });

  // Lead detail dialog
  const [selectedLead, setSelectedLead] = useState<Contact | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Contact>>({});
  const [newNote, setNewNote] = useState("");
  const [newCallNote, setNewCallNote] = useState("");
  const [callSortBy, setCallSortBy] = useState<"date" | "duration">("date");

  // Export dialog
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFromDate, setExportFromDate] = useState<Date | undefined>();
  const [exportToDate, setExportToDate] = useState<Date | undefined>();
  const [exportPreset, setExportPreset] = useState<string>("all");

  const applyExportPreset = (preset: string) => {
    setExportPreset(preset);
    const now = new Date();
    switch (preset) {
      case "today":
        setExportFromDate(startOfDay(now));
        setExportToDate(endOfDay(now));
        break;
      case "this-week":
        setExportFromDate(startOfWeek(now, { weekStartsOn: 1 }));
        setExportToDate(endOfWeek(now, { weekStartsOn: 1 }));
        break;
      case "this-month":
        setExportFromDate(startOfMonth(now));
        setExportToDate(endOfMonth(now));
        break;
      case "all":
        setExportFromDate(undefined);
        setExportToDate(undefined);
        break;
    }
  };

  const handleExport = () => {
    if (!contacts || contacts.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }
    let toExport = contacts;
    if (exportFromDate || exportToDate) {
      toExport = contacts.filter((c) => {
        const d = new Date(c.created_at);
        if (exportFromDate && d < startOfDay(exportFromDate)) return false;
        if (exportToDate && d > endOfDay(exportToDate)) return false;
        return true;
      });
    }
    if (toExport.length === 0) {
      toast({ title: "No leads in selected date range", variant: "destructive" });
      return;
    }
    const statusMap = leadStatuses.map(s => ({ value: s.value, label: s.label, color: s.color }));
    exportContactsToXls(toExport, statusMap);
    toast({ title: `Exported ${toExport.length} leads!` });
    setExportDialogOpen(false);
  };

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!tenantId,
  });

  // Call history for selected lead
  const { data: callHistory } = useQuery({
    queryKey: ["call_history", selectedLead?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("call_history").select("*").eq("contact_id", selectedLead!.id).order("called_at", { ascending: false });
      if (error) throw error;
      return data as CallHistory[];
    },
    enabled: !!selectedLead?.id && detailOpen,
  });

  // Reminders for selected lead
  const { data: reminders } = useQuery({
    queryKey: ["reminders", selectedLead?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("reminders").select("*").eq("contact_id", selectedLead!.id).order("reminder_date", { ascending: false });
      if (error) throw error;
      return data as Reminder[];
    },
    enabled: !!selectedLead?.id && detailOpen,
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
      setAddDialogOpen(false);
      setLeadForm({ name: "", phone: "", check_in_date: "", check_out_date: "", adults_count: "2", kids_count: "0", city: "", lead_time: "", source: "organic" });
      toast({ title: "Lead added!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateContact = useMutation({
    mutationFn: async (updates: Partial<Contact> & { id: string }) => {
      const { id, ...rest } = updates;
      const { error } = await supabase.from("contacts").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({ title: "Lead updated!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addNote = () => {
    if (!selectedLead || !newNote.trim()) return;
    const existingNotes = selectedLead.notes || "";
    const timestamp = new Date().toLocaleString();
    const updatedNotes = existingNotes ? `${existingNotes}\n[${timestamp}] ${newNote.trim()}` : `[${timestamp}] ${newNote.trim()}`;
    updateContact.mutate({ id: selectedLead.id, notes: updatedNotes });
    setSelectedLead({ ...selectedLead, notes: updatedNotes });
    setNewNote("");
  };

  const logCall = () => {
    if (!selectedLead || !tenantId) return;
    const insertCall = async () => {
      const { error } = await supabase.from("call_history").insert({
        contact_id: selectedLead.id,
        tenant_id: tenantId,
        notes: newCallNote.trim() || null,
        created_by: user?.id || null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["call_history", selectedLead.id] });
      setNewCallNote("");
      toast({ title: "Call logged!" });
    };
    insertCall();
  };

  const openDetail = (contact: Contact) => {
    setSelectedLead(contact);
    setEditForm({
      type: contact.type,
      check_in_date: contact.check_in_date || "",
      check_out_date: contact.check_out_date || "",
      adults_count: contact.adults_count,
      kids_count: contact.kids_count,
      city: contact.city || "",
      lead_time: contact.lead_time || "",
      source: contact.source || "",
      follow_up_date: contact.follow_up_date || "",
      recurring: contact.recurring || "none",
    });
    setDetailOpen(true);
  };

  const saveDetail = () => {
    if (!selectedLead) return;
    updateContact.mutate({
      id: selectedLead.id,
      type: editForm.type,
      check_in_date: editForm.check_in_date || null,
      check_out_date: editForm.check_out_date || null,
      adults_count: editForm.adults_count,
      kids_count: editForm.kids_count,
      city: editForm.city || null,
      lead_time: editForm.lead_time || null,
      source: editForm.source || null,
      follow_up_date: editForm.follow_up_date || null,
      recurring: editForm.recurring || "none",
    });
    setDetailOpen(false);
  };

  const getLeadAge = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const isHot = (contact: Contact) => getLeadAge(contact.created_at) <= 3;

  const filtered = contacts?.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone?.includes(search));
    const matchesType = typeFilter === "all" || c.type === typeFilter;
    const matchesCheckIn = !checkInFilter || c.check_in_date === checkInFilter;
    const matchesLastContacted = !lastContactedFilter || c.updated_at.startsWith(lastContactedFilter);
    const matchesHot = !hotOnly || isHot(c);
    // followUpOnly: placeholder filter (no follow-up field yet, shows all for now)
    return matchesSearch && matchesType && matchesCheckIn && matchesLastContacted && matchesHot;
  });

  const totalPeople = (c: Contact) => (c.adults_count || 0) + (c.kids_count || 0);

  const noteLines = selectedLead?.notes?.split("\n").filter(Boolean) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Leads Management</h1>
          <p className="text-muted-foreground mt-1">Track and manage your resort inquiries</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={() => {
              setExportFromDate(undefined);
              setExportToDate(undefined);
              setExportDialogOpen(true);
            }}
          >
            <FileSpreadsheet className="w-4 h-4" /> Export XLS
          </Button>
          <Button className="gap-2 rounded-xl shadow-lg" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <Button
          variant="outline"
          className="gap-2 rounded-xl"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4" /> {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
      </div>

      {showFilters && (
        <div className="glass-card bg-card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Filter by Status</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent className="glass-strong bg-card rounded-xl">
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STAGE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Filter by Check-in Date</Label>
              <Input
                type="date"
                value={checkInFilter}
                onChange={(e) => setCheckInFilter(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Last Contacted</Label>
              <Input
                type="date"
                value={lastContactedFilter}
                onChange={(e) => setLastContactedFilter(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={followUpOnly} onCheckedChange={setFollowUpOnly} />
              <span className="flex items-center gap-1">🔔 Follow-up Only</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={hotOnly} onCheckedChange={setHotOnly} />
              <span className="flex items-center gap-1">🔥 Hot Only</span>
            </label>
          </div>
        </div>
      )}

      {/* Lead Cards Grid */}
      {isLoading ? (
        <div className="glass-card bg-card p-12 text-center text-muted-foreground">Loading leads...</div>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((contact) => {
            const days = getLeadAge(contact.created_at);
            const hot = isHot(contact);
            return (
              <div
                key={contact.id}
                className="glass-card bg-card p-5 cursor-pointer hover:shadow-lg transition-all"
                onClick={() => openDetail(contact)}
              >
                {/* Top row: avatar + name + badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">{contact.phone || "No phone"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3 h-3" /> {days}D
                    </span>
                    <span className="text-muted-foreground">•</span>
                    {hot ? (
                      <span className="flex items-center gap-1 text-accent font-semibold">
                        <Flame className="w-3 h-3" /> HOT
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-secondary font-semibold">
                        <Snowflake className="w-3 h-3" /> COLD
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
                  {contact.check_in_date && (
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>Check-in: {contact.check_in_date}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    <span>{totalPeople(contact)} People</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5" />
                    <span>Follow-up: {contact.follow_up_date || "Not Set"}</span>
                  </div>
                </div>

                {/* Bottom: stage + actions */}
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={`${getStageStyle(contact.type)} rounded-md text-[10px] font-bold tracking-wider uppercase`}
                  >
                    {STAGE_OPTIONS.find((s) => s.value === contact.type)?.label || "NEW LEAD"}
                  </Badge>
                  <div className="flex gap-2">
                    {contact.phone && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`tel:${contact.phone}`);
                          }}
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://wa.me/${contact.phone?.replace(/\D/g, "")}`);
                          }}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card bg-card p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-lg">No leads yet</h3>
          <p className="text-muted-foreground mt-1 text-sm">Add your first lead to get started!</p>
        </div>
      )}

      {/* Add Lead Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="glass-strong bg-card rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Add New Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createLead.mutate(); }} className="space-y-5">
            <div className="space-y-3">
              <Label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Guest Information</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Guest Name *" value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} required className="pl-10 rounded-xl" />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Phone Number *" value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} required className="pl-10 rounded-xl" />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Stay Details</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Check-in *</Label>
                  <Input type="date" value={leadForm.check_in_date} onChange={(e) => setLeadForm({ ...leadForm, check_in_date: e.target.value })} required className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Check-out</Label>
                  <Input type="date" value={leadForm.check_out_date} onChange={(e) => setLeadForm({ ...leadForm, check_out_date: e.target.value })} className="rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Adults</Label>
                  <Input type="number" value={leadForm.adults_count} onChange={(e) => setLeadForm({ ...leadForm, adults_count: e.target.value })} min={1} className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Kids</Label>
                  <Input type="number" value={leadForm.kids_count} onChange={(e) => setLeadForm({ ...leadForm, kids_count: e.target.value })} min={0} className="rounded-xl" />
                </div>
              </div>
              <Input placeholder="City" value={leadForm.city} onChange={(e) => setLeadForm({ ...leadForm, city: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-3">
              <Label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Additional</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Lead Time" value={leadForm.lead_time} onChange={(e) => setLeadForm({ ...leadForm, lead_time: e.target.value })} className="rounded-xl" />
                <Select value={leadForm.source} onValueChange={(v) => setLeadForm({ ...leadForm, source: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
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
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="rounded-xl" disabled={createLead.isPending}>
                {createLead.isPending ? "Adding..." : "Add Lead"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="glass-strong bg-card rounded-2xl sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedLead && (
            <>
              {/* Header */}
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                  {selectedLead.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-heading font-bold">{selectedLead.name}</h2>
                  <div className="flex items-center gap-2 text-sm">
                    {isHot(selectedLead) ? (
                      <span className="flex items-center gap-1 text-accent font-semibold text-xs">
                        <Flame className="w-3 h-3" /> HOT LEAD
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-secondary font-semibold text-xs">
                        <Snowflake className="w-3 h-3" /> COLD
                      </span>
                    )}
                    <span className="text-muted-foreground">{selectedLead.phone}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-5">
                  {/* Quick Actions */}
                  <div className="glass-card bg-card/50 p-4">
                    <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">Quick Actions</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="flex-col h-auto py-4 rounded-xl gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                        onClick={() => window.open(`tel:${selectedLead.phone}`)}
                      >
                        <Phone className="w-5 h-5" />
                        <span className="text-xs">Call</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-col h-auto py-4 rounded-xl gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                        onClick={() => window.open(`https://wa.me/${selectedLead.phone?.replace(/\D/g, "")}`)}
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-xs">WhatsApp</span>
                      </Button>
                    </div>
                  </div>

                  {/* Lead Details */}
                  <div className="glass-card bg-card/50 p-4 space-y-3">
                    <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Lead Details</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Status</Label>
                        <Select value={editForm.type || "lead"} onValueChange={(v) => setEditForm({ ...editForm, type: v })}>
                          <SelectTrigger className="w-[150px] h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent className="glass-strong bg-card rounded-xl">
                            {STAGE_OPTIONS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Check-in</Label>
                        <Input
                          type="date"
                          value={editForm.check_in_date as string || ""}
                          onChange={(e) => setEditForm({ ...editForm, check_in_date: e.target.value })}
                          className="w-[150px] h-8 text-xs rounded-lg"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Check-out</Label>
                        <Input
                          type="date"
                          value={editForm.check_out_date as string || ""}
                          onChange={(e) => setEditForm({ ...editForm, check_out_date: e.target.value })}
                          className="w-[150px] h-8 text-xs rounded-lg"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">People</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={editForm.adults_count ?? 2}
                            onChange={(e) => setEditForm({ ...editForm, adults_count: parseInt(e.target.value) || 0 })}
                            className="w-[65px] h-8 text-xs rounded-lg"
                            placeholder="Adults"
                          />
                          <Input
                            type="number"
                            value={editForm.kids_count ?? 0}
                            onChange={(e) => setEditForm({ ...editForm, kids_count: parseInt(e.target.value) || 0 })}
                            className="w-[65px] h-8 text-xs rounded-lg"
                            placeholder="Kids"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">City</Label>
                        <Input
                          value={editForm.city as string || ""}
                          onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                          className="w-[150px] h-8 text-xs rounded-lg"
                          placeholder="City"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Lead Time</Label>
                        <Input
                          value={editForm.lead_time as string || ""}
                          onChange={(e) => setEditForm({ ...editForm, lead_time: e.target.value })}
                          className="w-[150px] h-8 text-xs rounded-lg"
                          placeholder="e.g. 10:30 AM"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Source</Label>
                        <Select value={editForm.source as string || "organic"} onValueChange={(v) => setEditForm({ ...editForm, source: v })}>
                          <SelectTrigger className="w-[150px] h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent className="glass-strong bg-card rounded-xl">
                            <SelectItem value="organic">Organic</SelectItem>
                            <SelectItem value="google-ads">Google Ads</SelectItem>
                            <SelectItem value="meta-ads">Meta Ads</SelectItem>
                            <SelectItem value="offline-marketing">Offline Marketing</SelectItem>
                            <SelectItem value="referral">Referral</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Follow-up</Label>
                        <Input
                          type="date"
                          value={editForm.follow_up_date as string || ""}
                          onChange={(e) => setEditForm({ ...editForm, follow_up_date: e.target.value })}
                          className="w-[150px] h-8 text-xs rounded-lg"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Recurring</Label>
                        <Select value={editForm.recurring as string || "none"} onValueChange={(v) => setEditForm({ ...editForm, recurring: v })}>
                          <SelectTrigger className="w-[150px] h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent className="glass-strong bg-card rounded-xl">
                            <SelectItem value="none">No Repeat</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button className="w-full rounded-xl mt-2" size="sm" onClick={saveDetail}>
                      Save Changes
                    </Button>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-5">
                  {/* Notes */}
                  <div className="glass-card bg-card/50 p-4 space-y-3">
                    <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
                      <StickyNote className="w-3.5 h-3.5" /> Lead Notes
                    </h4>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a note..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="rounded-xl text-sm"
                        onKeyDown={(e) => e.key === "Enter" && addNote()}
                      />
                      <Button size="sm" className="rounded-xl shrink-0" onClick={addNote}>Add</Button>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {noteLines.length > 0 ? (
                        noteLines.map((note, i) => (
                          <div key={i} className="text-sm p-2 rounded-lg bg-muted/30">
                            {note}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No notes added yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Reminder History */}
                  <div className="glass-card bg-card/50 p-4 space-y-3">
                    <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5" /> Reminder History
                    </h4>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto">
                      {reminders && reminders.length > 0 ? (
                        reminders.map((r) => (
                          <div key={r.id} className="text-sm p-2 rounded-lg bg-muted/30 flex items-center justify-between">
                            <span>{r.message || "Reminder"}</span>
                            <span className="text-xs text-muted-foreground">{new Date(r.reminder_date).toLocaleDateString()}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4 italic">No active reminder.</p>
                      )}
                    </div>
                  </div>

                  {/* Call History */}
                  <div className="glass-card bg-card/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
                        <PhoneCall className="w-3.5 h-3.5" /> Call History
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="uppercase tracking-wider font-semibold">Sort by:</span>
                        <Select value={callSortBy} onValueChange={(v: "date" | "duration") => setCallSortBy(v)}>
                          <SelectTrigger className="w-[80px] h-7 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent className="glass-strong bg-card rounded-xl">
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="duration">Duration</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Call note (optional)"
                        value={newCallNote}
                        onChange={(e) => setNewCallNote(e.target.value)}
                        className="rounded-xl text-sm"
                      />
                      <Button size="sm" className="rounded-xl shrink-0 gap-1" onClick={logCall}>
                        <PhoneCall className="w-3 h-3" /> Log
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto">
                      {callHistory && callHistory.length > 0 ? (
                        callHistory.map((c) => (
                          <div key={c.id} className="text-sm p-2 rounded-lg bg-muted/30 flex items-center justify-between">
                            <span>{c.notes || "Call"}</span>
                            <span className="text-xs text-muted-foreground">{new Date(c.called_at).toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4 italic">No calls logged yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl p-0 overflow-hidden">
          {/* Header */}
          <div className="bg-primary/5 px-6 pt-6 pb-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-lg">
                <div className="p-2 rounded-xl bg-primary/10">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                </div>
                Export Leads
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mt-1.5">Select a date range to export</p>
          </div>

          <div className="px-6 pb-6 space-y-5">
            {/* Quick presets */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Today", value: "today" },
                { label: "Week", value: "this-week" },
                { label: "Month", value: "this-month" },
                { label: "All", value: "all" },
              ].map((preset) => (
                <Button
                  key={preset.value}
                  variant={exportPreset === preset.value ? "default" : "outline"}
                  size="sm"
                  className="rounded-xl text-xs h-9"
                  onClick={() => applyExportPreset(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground font-medium">or pick dates</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Custom date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal rounded-xl text-sm h-10 ${!exportFromDate ? "text-muted-foreground" : ""}`}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-60" />
                      {exportFromDate ? format(exportFromDate, "dd MMM yyyy") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={exportFromDate}
                      onSelect={(d) => { setExportFromDate(d); setExportPreset("custom"); }}
                      initialFocus
                      className="p-3 pointer-events-auto rounded-xl"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal rounded-xl text-sm h-10 ${!exportToDate ? "text-muted-foreground" : ""}`}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-60" />
                      {exportToDate ? format(exportToDate, "dd MMM yyyy") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl" align="end">
                    <Calendar
                      mode="single"
                      selected={exportToDate}
                      onSelect={(d) => { setExportToDate(d); setExportPreset("custom"); }}
                      initialFocus
                      className="p-3 pointer-events-auto rounded-xl"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Summary badge */}
            <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2.5">
              <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                {exportFromDate || exportToDate
                  ? `${exportFromDate ? format(exportFromDate, "dd MMM yyyy") : "Beginning"} → ${exportToDate ? format(exportToDate, "dd MMM yyyy") : "Now"}`
                  : "All leads will be exported"}
              </p>
            </div>

            <Button className="w-full gap-2 rounded-xl h-11 text-sm font-semibold" onClick={handleExport}>
              <Download className="w-4 h-4" /> Download Excel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
