import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, ChevronDown, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";

type ReminderRow = {
  id: string;
  is_active: boolean | null;
  reminder_date: string;
  notified_at: string | null;
  push_sent_at: string | null;
  last_error: string | null;
  message: string | null;
  contact_id: string;
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

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["reminders-diagnostics", tenantId],
    enabled: !!tenantId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminders")
        .select("id, is_active, reminder_date, notified_at, push_sent_at, last_error, message, contact_id")
        .order("reminder_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as ReminderRow[];
    },
  });

  const rows = data || [];
  const summary = {
    active: rows.filter((r) => r.is_active).length,
    due: rows.filter((r) => r.is_active && new Date(r.reminder_date).getTime() <= Date.now()).length,
    errors: rows.filter((r) => r.last_error).length,
  };

  return (
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
                      <TableRow key={r.id}>
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
              Showing the 20 most recent reminders. "Due – pending" means the reminder is past its date but the in-app popup hasn't marked it yet (browser may have been closed).
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
