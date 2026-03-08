import { ReactNode } from "react";
import { useTenantPlan, PlanName } from "@/hooks/useTenantPlan";
import UpgradeGateDialog from "@/components/UpgradeGateDialog";

interface PlanGateProps {
  requiredPlan: PlanName;
  featureName: string;
  children: ReactNode;
}

export default function PlanGate({ requiredPlan, featureName, children }: PlanGateProps) {
  const { hasAccess, isLoading } = useTenantPlan();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!hasAccess(requiredPlan)) {
    return <UpgradeGateDialog open={true} requiredPlan={requiredPlan} featureName={featureName} />;
  }

  return <>{children}</>;
}
