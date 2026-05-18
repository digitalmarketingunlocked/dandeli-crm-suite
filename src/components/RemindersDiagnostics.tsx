import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Activity, ChevronDown, RefreshCw, CheckCircle2, XCircle, Clock, Phone, Mail, User, MapPin, BellRing } from "lucide-react";
import { normalizePhone } from "@/lib/phoneUtils";

type ReminderRow = {
  id: string;
  is_active: boolean | null;
  reminder_date: string;
  notified_at: string | null;
  push_sent_at: string | null;
  last_error: string | null;
  message: string | null;
  contact_id: string;
  created_at: string;
};

type ContactInfo = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  type: string | null;
  source: string | null;
  notes: string | null;
};

function fmt(d: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString(); } catch { return d; }
}

function statusFor(r: ReminderRow): { label: string; tone: "ok" | "wait" | "err" | "done" } {
  if (r.last_error) return { label: "Error", tone: "err" };
  if (!r.is_active) return { label: "Inactive", tone: "done" };
  const due = new Date(r.reminder_date).getTime() <= Date.now();
  if (!due) return { label: "Scheduled", tone: "wait" };
  if (r.notified_at || r.push_sent_at) return { label: "Fired", tone: "ok" };
  return { label: "Due – pending", tone: "wait" };
}

export default function RemindersDiagnostics() {
  const { tenantId } = useAuth();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ReminderRow | null>(null);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["reminders-diagnostics", tenantId],
    enabled: !!tenantId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminders")
        .select("id, is_active, reminder_date, notified_at, push_sent_at, last_error, message, contact_id, created_at")
        .order("reminder_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as ReminderRow[];
    },
  });

  const { data: contact } = useQuery({
    queryKey: ["reminder-contact", selected?.contact_id],
    enabled: !!selected?.contact_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, phone, email, city, type, source, notes")
        .eq("id", selected!.contact_id)
        .single();
      if (error) throw error;
      return data as ContactInfo;
    },
  });

  const rows = data || [];
  const summary = {
    active: rows.filter((r) => r.is_active).length,
    due: rows.filter((r) => r.is_active && new Date(r.reminder_date).getTime() <= Date.now()).length,
    errors: rows.filter((r) => r.last_error).length,
  };

  const selectedStatus = selected ? statusFor(selected) : null;

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <Card className="rounded-2xl border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-left flex-1">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Reminders diagnostics</CardTitle>
                    <p className="text-xs text-muted-foreground">Inspect why reminders fire or stall</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
              </CollapsibleTrigger>
              {open && (
                <Button size="sm" variant="outline" className="rounded-lg gap-1.5" onClick={() => refetch()} disabled={isFetching}>
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              )}
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-3">
              <div className="flex gap-2 flex-wrap text-xs">
                <Badge variant="secondary" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Active: {summary.active}</Badge>
                <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Due now: {summary.due}</Badge>
                <Badge variant={summary.errors ? "destructive" : "secondary"} className="gap-1"><XCircle className="w-3 h-3" /> Errors: {summary.errors}</Badge>
              </div>

              <div className="rounded-xl border border-border/60 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Reminder date</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Notified</TableHead>
                      <TableHead>Push sent</TableHead>
                      <TableHead>Last error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-6">
                          No reminders found.
                        </TableCell>
                      </TableRow>
                    )}
                    {rows.map((r) => {
                      const s = statusFor(r);
                      const tone =
                        s.tone === "ok" ? "default" :
                        s.tone === "err" ? "destructive" :
                        s.tone === "done" ? "outline" : "secondary";
                      return (
                        <TableRow
                          key={r.id}
                          className="cursor-pointer"
                          onClick={() => setSelected(r)}
                        >
                          <TableCell><Badge variant={tone as any}>{s.label}</Badge></TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{fmt(r.reminder_date)}</TableCell>
                          <TableCell className="text-xs">{r.is_active ? "yes" : "no"}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{fmt(r.notified_at)}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{fmt(r.push_sent_at)}</TableCell>
                          <TableCell className="text-xs text-destructive max-w-[220px] truncate" title={r.last_error || ""}>
                            {r.last_error || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                Click any row to view the full reminder message and contact details.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <BellRing className="w-5 h-5 text-primary" />
              </div>
              <SheetTitle className="font-heading">Reminder details</SheetTitle>
            </div>
            {selectedStatus && (
              <SheetDescription className="flex items-center gap-2">
                <Badge variant={(selectedStatus.tone === "ok" ? "default" : selectedStatus.tone === "err" ? "destructive" : selectedStatus.tone === "done" ? "outline" : "secondary") as any}>
                  {selectedStatus.label}
                </Badge>
                <span className="text-xs">Due {selected && fmt(selected.reminder_date)}</span>
              </SheetDescription>
            )}
          </SheetHeader>

          {selected && (
            <div className="space-y-4 mt-6">
              <section className="rounded-xl border border-border/60 bg-muted/30 p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Message</h3>
                <p className="text-sm whitespace-pre-wrap break-words">
                  {selected.message || <span className="text-muted-foreground italic">(no message)</span>}
                </p>
              </section>

              <section className="rounded-xl border border-border/60 p-4 space-y-2 text-sm">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Delivery timeline</h3>
                <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{fmt(selected.created_at)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Reminder date</span><span>{fmt(selected.reminder_date)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">In-app notified</span><span>{fmt(selected.notified_at)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Push sent</span><span>{fmt(selected.push_sent_at)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Active</span><span>{selected.is_active ? "yes" : "no"}</span></div>
                {selected.last_error && (
                  <div className="pt-2 mt-2 border-t border-border/60">
                    <div className="text-xs font-semibold text-destructive mb-1">Last error</div>
                    <p className="text-xs text-destructive whitespace-pre-wrap break-words">{selected.last_error}</p>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-border/60 p-4 space-y-2 text-sm">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contact</h3>
                {!contact ? (
                  <p className="text-xs text-muted-foreground">Loading contact…</p>
                ) : (
                  <>
                    <div className="flex items-center gap-2 font-semibold">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {contact.name || "Unnamed"}
                      {contact.type && <Badge variant="outline" className="ml-auto text-xs">{contact.type}</Badge>}
                    </div>
                    {contact.phone && (
                      <a href={`tel:${normalizePhone(contact.phone)}`} className="flex items-center gap-2 text-primary hover:underline">
                        <Phone className="w-3.5 h-3.5" /> {contact.phone}
                      </a>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-primary hover:underline break-all">
                        <Mail className="w-3.5 h-3.5" /> {contact.email}
                      </a>
                    )}
                    {contact.city && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" /> {contact.city}
                      </div>
                    )}
                    {contact.source && (
                      <div className="text-xs text-muted-foreground">Source: {contact.source}</div>
                    )}
                    {contact.notes && (
                      <div className="pt-2 mt-2 border-t border-border/60 text-xs whitespace-pre-wrap break-words">
                        {contact.notes}
                      </div>
                    )}
                  </>
                )}
              </section>

              {contact?.phone && (
                <Button
                  className="w-full rounded-xl gap-2"
                  onClick={() => { window.location.href = `tel:${normalizePhone(contact.phone!)}`; }}
                >
                  <Phone className="w-4 h-4" /> Call {contact.name || "lead"}
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
