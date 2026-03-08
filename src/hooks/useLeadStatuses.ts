import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type LeadStatus = {
  id: string;
  tenant_id: string;
  value: string;
  label: string;
  color: string;
  sort_order: number;
  is_default: boolean;
  created_at: string;
};

const DEFAULT_STATUSES = [
  { value: "lead", label: "NEW LEAD", color: "secondary", sort_order: 0, is_default: true },
  { value: "interested", label: "INTERESTED", color: "primary", sort_order: 1, is_default: true },
  { value: "follow-up", label: "FOLLOW UP", color: "accent", sort_order: 2, is_default: true },
  { value: "negotiation", label: "NEGOTIATION", color: "warning", sort_order: 3, is_default: true },
  { value: "booked", label: "BOOKED", color: "primary", sort_order: 4, is_default: true },
  { value: "lost", label: "LOST", color: "destructive", sort_order: 5, is_default: true },
  { value: "not-interested", label: "NOT INTERESTED", color: "destructive", sort_order: 6, is_default: true },
  { value: "booked-with-others", label: "BOOKED WITH OTHERS", color: "warning", sort_order: 7, is_default: true },
  { value: "cancelled", label: "CANCELLED", color: "destructive", sort_order: 8, is_default: true },
];

export const STAGE_COLOR_MAP: Record<string, string> = {
  primary: "bg-primary/15 text-primary border-primary/30",
  secondary: "bg-secondary/15 text-secondary border-secondary/30",
  accent: "bg-accent/15 text-accent border-accent/30",
  warning: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  destructive: "bg-destructive/15 text-destructive border-destructive/30",
};

export const COLOR_OPTIONS = [
  { value: "primary", label: "Green" },
  { value: "secondary", label: "Blue" },
  { value: "accent", label: "Orange" },
  { value: "warning", label: "Yellow" },
  { value: "destructive", label: "Red" },
];

export function useLeadStatuses() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const { data: statuses, isLoading } = useQuery({
    queryKey: ["lead_statuses", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_statuses")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;

      // If no statuses exist, seed defaults
      if (data.length === 0 && tenantId) {
        const toInsert = DEFAULT_STATUSES.map((s) => ({ ...s, tenant_id: tenantId }));
        const { data: inserted, error: insertErr } = await supabase
          .from("lead_statuses")
          .insert(toInsert)
          .select();
        if (insertErr) throw insertErr;
        return inserted as LeadStatus[];
      }

      return data as LeadStatus[];
    },
    enabled: !!tenantId,
  });

  const addStatus = useMutation({
    mutationFn: async (status: { value: string; label: string; color: string }) => {
      const maxOrder = statuses?.length ? Math.max(...statuses.map((s) => s.sort_order)) + 1 : 0;
      const { error } = await supabase.from("lead_statuses").insert({
        tenant_id: tenantId!,
        value: status.value,
        label: status.label.toUpperCase(),
        color: status.color,
        sort_order: maxOrder,
        is_default: false,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lead_statuses"] }),
  });

  const updateStatus = useMutation({
    mutationFn: async (status: { id: string; label: string; color: string }) => {
      const { error } = await supabase
        .from("lead_statuses")
        .update({ label: status.label.toUpperCase(), color: status.color })
        .eq("id", status.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lead_statuses"] }),
  });

  const deleteStatus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lead_statuses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lead_statuses"] }),
  });

  return { statuses: statuses || [], isLoading, addStatus, updateStatus, deleteStatus };
}
