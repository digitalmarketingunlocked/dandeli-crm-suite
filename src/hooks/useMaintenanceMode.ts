import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MaintenanceModeValue {
  enabled: boolean;
  message: string;
  deadline: string | null;
}

const DEFAULT_MESSAGE = "System is under maintenance.";

const normalizeMaintenanceValue = (value: unknown): MaintenanceModeValue => {
  const raw = (value ?? {}) as Record<string, unknown>;
  const deadline = typeof raw.deadline === "string" && !Number.isNaN(Date.parse(raw.deadline))
    ? raw.deadline
    : null;

  return {
    enabled: !!raw.enabled,
    message: typeof raw.message === "string" && raw.message.trim().length > 0 ? raw.message : DEFAULT_MESSAGE,
    deadline,
  };
};

export function useMaintenanceMode() {
  const [now, setNow] = useState(() => Date.now());

  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-mode-setting"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .maybeSingle();

      if (error) throw error;
      return normalizeMaintenanceValue(data?.value);
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const maintenance = data ?? normalizeMaintenanceValue(undefined);

  useEffect(() => {
    if (!maintenance.deadline) return;

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [maintenance.deadline]);

  const derived = useMemo(() => {
    const deadlineMs = maintenance.deadline ? Date.parse(maintenance.deadline) : null;
    const countdownMs = deadlineMs ? Math.max(deadlineMs - now, 0) : null;
    const maintenanceActive = maintenance.enabled || (deadlineMs !== null && now >= deadlineMs);

    return {
      maintenanceActive,
      countdownMs,
      hasCountdown: !maintenanceActive && countdownMs !== null && countdownMs > 0,
    };
  }, [maintenance.enabled, maintenance.deadline, now]);

  return {
    isLoading,
    message: maintenance.message,
    deadline: maintenance.deadline,
    ...derived,
  };
}
