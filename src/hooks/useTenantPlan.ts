import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PLAN_HIERARCHY = ["free", "startup", "business", "enterprise"] as const;
export type PlanName = (typeof PLAN_HIERARCHY)[number];

export type FeatureKey =
  | "leads"
  | "follow_ups"
  | "cold_follow_up"
  | "bookings"
  | "deals"
  | "team_management";

type FeatureAccessMap = Record<string, FeatureKey[]>;

export function useTenantPlan() {
  const { tenantId } = useAuth();

  const { data: currentPlan, isLoading: planLoading } = useQuery({
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

  const { data: featureAccess, isLoading: featuresLoading } = useQuery({
    queryKey: ["plan-feature-access"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "plan_feature_access")
        .single();
      if (error) throw error;
      return data.value as unknown as FeatureAccessMap;
    },
    staleTime: 5 * 60 * 1000,
  });

  const plan = currentPlan || "free";
  const isLoading = planLoading || featuresLoading;

  const hasAccess = (requiredPlan: PlanName) => {
    const currentIdx = PLAN_HIERARCHY.indexOf(plan);
    const requiredIdx = PLAN_HIERARCHY.indexOf(requiredPlan);
    return currentIdx >= requiredIdx;
  };

  const hasFeature = (feature: FeatureKey): boolean => {
    if (!featureAccess) return true; // permissive while loading
    const allowed = featureAccess[plan] || [];
    return allowed.includes(feature);
  };

  const getRequiredPlan = (feature: FeatureKey): PlanName | null => {
    if (!featureAccess) return null;
    for (const tier of PLAN_HIERARCHY) {
      const allowed = featureAccess[tier] || [];
      if (allowed.includes(feature)) return tier;
    }
    return "enterprise";
  };

  return { currentPlan: plan, isLoading, hasAccess, hasFeature, getRequiredPlan };
}
