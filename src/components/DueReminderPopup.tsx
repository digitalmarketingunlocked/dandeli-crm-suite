import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, BellRing, Clock } from "lucide-react";
import { normalizePhone } from "@/lib/phoneUtils";

const POLL_INTERVAL = 30_000; // 30s
const SNOOZE_KEY = "due_reminder_snoozed";
const SNOOZE_MINUTES = 10;

type DueReminder = {
  id: string;
  contact_id: string;
  reminder_date: string;
  message: string | null;
  contact: { name: string | null; phone: string | null } | null;
};

function getSnoozed(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SNOOZE_KEY) || "{}");
  } catch {
    return {};
  }
}

function snoozeReminder(id: string) {
  const s = getSnoozed();
  s[id] = Date.now() + SNOOZE_MINUTES * 60_000;
  // Cleanup expired
  const now = Date.now();
  for (const k of Object.keys(s)) if (s[k] < now) delete s[k];
  localStorage.setItem(SNOOZE_KEY, JSON.stringify(s));
}

function isSnoozed(id: string) {
  const s = getSnoozed();
  return s[id] && s[id] > Date.now();
}

export default function DueReminderPopup() {
  const { tenantId } = useAuth();
  const [current, setCurrent] = useState<DueReminder | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkingRef = useRef(false);

  const check = useCallback(async () => {
    if (!tenantId || checkingRef.current || current) return;
    checkingRef.current = true;
    try {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("reminders")
        .select("id, contact_id, reminder_date, message")
        .eq("is_active", true)
        .lte("reminder_date", now)
        .order("reminder_date", { ascending: true })
        .limit(10);

      if (!data || data.length === 0) return;
      const next = data.find((r) => !isSnoozed(r.id));
      if (!next) return;

      const { data: contact } = await supabase
        .from("contacts")
        .select("name, phone")
        .eq("id", next.contact_id)
        .single();

      setCurrent({ ...next, contact: contact ?? null });
    } finally {
      checkingRef.current = false;
    }
  }, [tenantId, current]);

  useEffect(() => {
    if (!tenantId) return;
    check();
    intervalRef.current = setInterval(check, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tenantId, check]);

  const handleClose = () => {
    if (current) snoozeReminder(current.id);
    setCurrent(null);
  };

  const handleCall = async () => {
    if (!current) return;
    const phone = current.contact?.phone;
    // Mark reminder inactive
    await supabase.from("reminders").update({ is_active: false }).eq("id", current.id);
    setCurrent(null);
    if (phone) {
      const normalized = normalizePhone(phone);
      window.location.href = `tel:${normalized}`;
    }
  };

  const handleDismiss = async () => {
    if (!current) return;
    await supabase.from("reminders").update({ is_active: false }).eq("id", current.id);
    setCurrent(null);
  };

  if (!current) return null;

  const contactName = current.contact?.name || "Lead";
  const dueAt = new Date(current.reminder_date);

  return (
    <Dialog open={!!current} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="glass-strong bg-card rounded-2xl sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <BellRing className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="font-heading text-xl">Follow-up due</DialogTitle>
          </div>
          <DialogDescription>
            {current.message || `Time to follow up with ${contactName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2">
          <div className="font-semibold text-foreground">{contactName}</div>
          {current.contact?.phone && (
            <div className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> {current.contact.phone}
            </div>
          )}
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Due {dueAt.toLocaleString()}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button variant="outline" className="rounded-xl" onClick={handleClose}>
            Snooze {SNOOZE_MINUTES}m
          </Button>
          <Button variant="ghost" className="rounded-xl" onClick={handleDismiss}>
            Dismiss
          </Button>
          <Button className="rounded-xl gap-2" onClick={handleCall} disabled={!current.contact?.phone}>
            <Phone className="w-4 h-4" /> Call now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
