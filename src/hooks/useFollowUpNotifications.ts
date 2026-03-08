import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const POLL_INTERVAL = 60_000; // check every 60 seconds
const NOTIFIED_KEY = "followup_notified_ids";

function getNotifiedIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function addNotifiedId(id: string) {
  const ids = getNotifiedIds();
  ids.add(id);
  // Keep only last 200 to avoid bloat
  const arr = [...ids].slice(-200);
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(arr));
}

export function useFollowUpNotifications(enabled: boolean) {
  const { tenantId } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }, []);

  const checkReminders = useCallback(async () => {
    if (!tenantId) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const now = new Date().toISOString();
    const { data: dueReminders } = await supabase
      .from("reminders")
      .select("id, message, reminder_date, contact_id")
      .eq("is_active", true)
      .lte("reminder_date", now)
      .order("reminder_date", { ascending: true })
      .limit(20);

    if (!dueReminders || dueReminders.length === 0) return;

    const notified = getNotifiedIds();

    for (const reminder of dueReminders) {
      if (notified.has(reminder.id)) continue;

      // Fetch contact name
      const { data: contact } = await supabase
        .from("contacts")
        .select("name, phone")
        .eq("id", reminder.contact_id)
        .single();

      const contactName = contact?.name || "Unknown";
      const body = reminder.message || `Follow-up reminder for ${contactName}`;

      new Notification(`🔔 Follow-up: ${contactName}`, {
        body,
        icon: "/favicon.ico",
        tag: reminder.id,
      });

      addNotifiedId(reminder.id);

      // Mark reminder as inactive after firing
      await supabase
        .from("reminders")
        .update({ is_active: false })
        .eq("id", reminder.id);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!enabled || !tenantId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Request permission on enable
    requestPermission();

    // Initial check
    checkReminders();

    // Poll
    intervalRef.current = setInterval(checkReminders, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, tenantId, checkReminders, requestPermission]);

  return { requestPermission };
}
