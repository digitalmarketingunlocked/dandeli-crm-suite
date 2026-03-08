import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, ArrowUpRight, Crown, Check } from "lucide-react";
import type { PlanName } from "@/hooks/useTenantPlan";

interface UpgradeGateDialogProps {
  open: boolean;
  requiredPlan: PlanName;
  featureName: string;
}

const PLAN_DETAILS: Record<string, { price: string; features: string[] }> = {
  startup: {
    price: "₹999/mo",
    features: ["Unlimited leads", "Cold follow-up page", "Advanced analytics", "Custom lead statuses"],
  },
  business: {
    price: "₹1,999/mo",
    features: ["Everything in Startup", "3 team members", "Bookings page", "Export data", "API access"],
  },
  enterprise: {
    price: "₹2,999/mo",
    features: ["Everything in Business", "Unlimited team members", "Dedicated support", "White-label"],
  },
};

export default function UpgradeGateDialog({ open, requiredPlan, featureName }: UpgradeGateDialogProps) {
  const navigate = useNavigate();
  const plan = PLAN_DETAILS[requiredPlan];

  return (
    <Dialog open={open} onOpenChange={() => navigate(-1)}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader className="text-center items-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">Upgrade Required</DialogTitle>
          <DialogDescription className="text-center">
            <span className="font-semibold text-foreground">{featureName}</span> is available on the{" "}
            <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30 rounded-md text-xs mx-1">
              {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}
            </Badge>
            plan and above.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {plan && (
            <div className="p-4 rounded-xl border border-border/50 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-primary" />
                  <span className="font-semibold capitalize">{requiredPlan} Plan</span>
                </div>
                <span className="font-bold text-lg">{plan.price}</span>
              </div>
              <ul className="space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              className="w-full rounded-xl gap-2"
              onClick={() => navigate("/settings")}
            >
              <ArrowUpRight className="w-4 h-4" /> View Plans & Upgrade
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-xl"
              onClick={() => navigate(-1)}
            >
              Go Back
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
