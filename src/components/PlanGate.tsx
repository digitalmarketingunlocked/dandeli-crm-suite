import { ReactNode } from "react";
import { useTenantPlan, type PlanName, type FeatureKey } from "@/hooks/useTenantPlan";
import UpgradeGateDialog from "@/components/UpgradeGateDialog";

interface PlanGateProps {
  feature?: FeatureKey;
  requiredPlan?: PlanName;
  featureName: string;
  children: ReactNode;
}

export default function PlanGate({ feature, requiredPlan, featureName, children }: PlanGateProps) {
  const { hasAccess, hasFeature, getRequiredPlan, isLoading } = useTenantPlan();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Feature-based gating (dynamic, admin-controlled)
  if (feature && !hasFeature(feature)) {
    const needed = getRequiredPlan(feature) || "startup";
    return <UpgradeGateDialog open={true} requiredPlan={needed} featureName={featureName} />;
  }

  // Legacy plan-based gating
  if (requiredPlan && !hasAccess(requiredPlan)) {
    return <UpgradeGateDialog open={true} requiredPlan={requiredPlan} featureName={featureName} />;
  }

  return <>{children}</>;
}
