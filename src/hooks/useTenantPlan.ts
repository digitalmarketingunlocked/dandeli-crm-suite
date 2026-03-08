import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PLAN_HIERARCHY = ["free", "startup", "business", "enterprise"] as const;
export type PlanName = (typeof PLAN_HIERARCHY)[number];

export function useTenantPlan() {
  const { tenantId } = useAuth();

  const { data: currentPlan, isLoading } = useQuery({
    queryKey: ["tenant-plan", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("current_plan")
        .eq("id", tenantId!)
        .single();
      if (error) throw error;
      return (data.current_plan as PlanName) || "free";
    },
    enabled: !!tenantId,
  });

  const hasAccess = (requiredPlan: PlanName) => {
    const currentIdx = PLAN_HIERARCHY.indexOf(currentPlan || "free");
    const requiredIdx = PLAN_HIERARCHY.indexOf(requiredPlan);
    return currentIdx >= requiredIdx;
  };

  return { currentPlan: currentPlan || "free", isLoading, hasAccess };
}
