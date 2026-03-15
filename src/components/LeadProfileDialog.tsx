import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLeadStatuses, STAGE_COLOR_MAP } from "@/hooks/useLeadStatuses";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Phone, MapPin, CalendarDays, Users, Mail,
  MessageCircle, Clock, Bell, StickyNote, Flame, Snowflake,
  PhoneCall, Check,
} from "lucide-react";
import CallFlowDialog from "@/components/CallFlowDialog";

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
  source: string | null;
  type: string;
  notes: string | null;
  lead_time: string | null;
  follow_up_date: string | null;
  recurring: string | null;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  created_by: string | null;
  company: string | null;
};

interface LeadProfileDialogProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LeadProfileDialog({ contact, open, onOpenChange }: LeadProfileDialogProps) {
  const { tenantId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { statuses: leadStatuses } = useLeadStatuses();
  const STAGE_OPTIONS = leadStatuses.map((s) => ({ value: s.value, label: s.label }));

  const [editForm, setEditForm] = useState<Partial<Contact> & { created_at?: string }>({});
  const [newNote, setNewNote] = useState("");
  const [newCallNote, setNewCallNote] = useState("");
  const [callSortBy, setCallSortBy] = useState<"date" | "duration">("date");
  const [localContact, setLocalContact] = useState<Contact | null>(null);
  const [callFlowOpen, setCallFlowOpen] = useState(false);

  useEffect(() => {
    if (contact && open) {
      setLocalContact(contact);
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
        created_at: contact.created_at ? contact.created_at.slice(0, 10) : "",
      });
      setNewNote("");
      setNewCallNote("");
    }
  }, [contact, open]);

  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders", contact?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminders").select("*").eq("contact_id", contact!.id)
        .order("reminder_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!contact?.id && open,
  });

  const { data: callHistory = [] } = useQuery({
    queryKey: ["call_history", contact?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_history").select("*").eq("contact_id", contact!.id)
        .order("called_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!contact?.id && open,
  });

  const markReminderDone = useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase.from("reminders").update({ is_active: false }).eq("id", reminderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", localContact?.id] });
      toast({ title: "Reminder marked as done!" });
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
    if (!localContact || !newNote.trim()) return;
    const existingNotes = localContact.notes || "";
    const timestamp = new Date().toLocaleString();
    const updatedNotes = existingNotes ? `${existingNotes}\n[${timestamp}] ${newNote.trim()}` : `[${timestamp}] ${newNote.trim()}`;
    updateContact.mutate({ id: localContact.id, notes: updatedNotes });
    setLocalContact({ ...localContact, notes: updatedNotes });
    setNewNote("");
  };

  const logCall = () => {
    if (!localContact || !tenantId) return;
    const insertCall = async () => {
      const { error } = await supabase.from("call_history").insert({
        contact_id: localContact.id,
        tenant_id: tenantId,
        notes: newCallNote.trim() || null,
        created_by: user?.id || null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["call_history", localContact.id] });
      setNewCallNote("");
      toast({ title: "Call logged!" });
    };
    insertCall();
  };

  const saveDetail = () => {
    if (!localContact) return;
    updateContact.mutate({
      id: localContact.id,
      type: editForm.type,
      check_in_date: editForm.check_in_date || null,
      check_out_date: editForm.check_out_date || null,
      adults_count: editForm.adults_count ?? null,
      kids_count: editForm.kids_count ?? null,
      city: editForm.city || null,
      lead_time: editForm.lead_time || null,
      source: editForm.source || null,
      follow_up_date: editForm.follow_up_date || null,
      recurring: editForm.recurring || "none",
      created_at: editForm.created_at ? new Date(editForm.created_at).toISOString() : localContact.created_at,
    });
    onOpenChange(false);
  };

  if (!localContact) return null;

  const daysSinceCreation = Math.floor((Date.now() - new Date(localContact.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const isHot = daysSinceCreation <= 3;
  const noteLines = (localContact.notes || "").split("\n").filter(Boolean);

  const sortedCalls = [...callHistory].sort((a, b) => {
    if (callSortBy === "duration") return (b.duration || "").localeCompare(a.duration || "");
    return new Date(b.called_at).getTime() - new Date(a.called_at).getTime();
  });

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong bg-card rounded-2xl sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
            {localContact.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold">{localContact.name}</h2>
            <div className="flex items-center gap-2 text-sm">
              {isHot ? (
                <span className="flex items-center gap-1 text-accent font-semibold text-xs">
                  <Flame className="w-3 h-3" /> HOT LEAD
                </span>
              ) : (
                <span className="flex items-center gap-1 text-secondary font-semibold text-xs">
                  <Snowflake className="w-3 h-3" /> COLD
                </span>
              )}
              {localContact.phone && <span className="text-muted-foreground">{localContact.phone}</span>}
              {localContact.email && (
                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Mail className="w-3 h-3" /> {localContact.email}
                </span>
              )}
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
                  onClick={() => {
                    if (localContact.phone) window.open(`tel:${localContact.phone}`);
                    setTimeout(() => setCallFlowOpen(true), 1500);
                  }}
                  disabled={!localContact.phone}
                >
                  <Phone className="w-5 h-5" />
                  <span className="text-xs">Call</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex-col h-auto py-4 rounded-xl gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                  onClick={() => window.open(`https://wa.me/${localContact.phone?.replace(/\D/g, "")}`)}
                  disabled={!localContact.phone}
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
                  <Input type="date" value={editForm.check_in_date as string || ""} onChange={(e) => setEditForm({ ...editForm, check_in_date: e.target.value })} className="w-[150px] h-8 text-xs rounded-lg" />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Check-out</Label>
                  <Input type="date" value={editForm.check_out_date as string || ""} onChange={(e) => setEditForm({ ...editForm, check_out_date: e.target.value })} className="w-[150px] h-8 text-xs rounded-lg" />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">People</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={editForm.adults_count ?? 2} onChange={(e) => setEditForm({ ...editForm, adults_count: parseInt(e.target.value) || 0 })} className="w-[65px] h-8 text-xs rounded-lg" placeholder="Adults" />
                    <Input type="number" value={editForm.kids_count ?? 0} onChange={(e) => setEditForm({ ...editForm, kids_count: parseInt(e.target.value) || 0 })} className="w-[65px] h-8 text-xs rounded-lg" placeholder="Kids" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">City</Label>
                  <Input value={editForm.city as string || ""} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="w-[150px] h-8 text-xs rounded-lg" placeholder="City" />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Lead Time</Label>
                  <Input value={editForm.lead_time as string || ""} onChange={(e) => setEditForm({ ...editForm, lead_time: e.target.value })} className="w-[150px] h-8 text-xs rounded-lg" placeholder="e.g. 10:30 AM" />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Lead Date</Label>
                  <DateInput
                    value={editForm.created_at as string || ""}
                    onChange={(v) => setEditForm({ ...editForm, created_at: v })}
                    maxDate={new Date()}
                    className="w-[150px] h-8 text-xs rounded-lg"
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
                    <div key={i} className="text-sm p-2 rounded-lg bg-muted/30">{note}</div>
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
                {reminders.length > 0 ? (
                  reminders.map((r) => (
                    <div
                      key={r.id}
                      className={`text-sm p-2 rounded-lg flex items-center justify-between gap-2 cursor-pointer transition-colors ${r.is_active === false ? 'bg-muted/20 opacity-60 line-through' : 'bg-muted/30 hover:bg-muted/50'}`}
                      onClick={() => {
                        if (r.is_active !== false) {
                          markReminderDone.mutate(r.id);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${r.is_active === false ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                          {r.is_active === false && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                        </div>
                        <span className="truncate">{r.message || "Reminder"}</span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{new Date(r.reminder_date).toLocaleDateString()}</span>
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
                  <span className="uppercase tracking-wider font-semibold">Sort:</span>
                  <Select value={callSortBy} onValueChange={(v: "date" | "duration") => setCallSortBy(v)}>
                    <SelectTrigger className="w-[80px] h-7 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent className="glass-strong bg-card rounded-xl">
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="duration">Duration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {sortedCalls.length > 0 ? (
                  sortedCalls.map((c) => (
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
      </DialogContent>
    </Dialog>

    <CallFlowDialog
      open={callFlowOpen}
      onOpenChange={setCallFlowOpen}
      contactId={localContact.id}
      contactName={localContact.name}
      contactPhone={localContact.phone}
      currentType={localContact.type}
    />
    </>
  );
}
