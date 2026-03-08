import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CreditCard, Check, Zap, Crown, ArrowUpRight, Smartphone } from "lucide-react";

const UPI_ID = "digitalmarketingunlocked@ybl";

const UPI_APPS = [
  { name: "PhonePe", icon: "📱", scheme: "phonepe" },
  { name: "Google Pay", icon: "💳", scheme: "gpay" },
  { name: "Amazon Pay", icon: "🛒", scheme: "amazonpay" },
  { name: "CRED", icon: "💎", scheme: "cred" },
  { name: "Any UPI App", icon: "📲", scheme: "upi" },
];

interface Plan {
  name: string;
  subtitle?: string;
  price: string;
  period: string;
  amount: number;
  features: string[];
  current?: boolean;
  recommended?: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "₹0",
    period: "/month",
    amount: 0,
    features: ["Up to 50 leads", "1 team member", "Basic analytics", "Email support"],
    current: true,
  },
  {
    name: "Startup",
    subtitle: "For solo founders",
    price: "₹999",
    period: "/month",
    amount: 999,
    features: ["Unlimited leads", "1 team member", "Advanced analytics", "Priority support", "Custom lead statuses"],
    recommended: true,
  },
  {
    name: "Business",
    subtitle: "For growing business with sales team",
    price: "₹1,999",
    period: "/month",
    amount: 1999,
    features: ["Everything in Startup", "3 team members", "API access", "Priority support", "Custom integrations", "Export data", "Advanced reporting"],
  },
  {
    name: "Enterprise",
    subtitle: "For large organizations",
    price: "₹2,999",
    period: "/month",
    amount: 2999,
    features: ["Everything in Business", "Unlimited team members", "Dedicated support", "White-label options", "SLA guarantee", "Custom onboarding"],
  },
];

export default function SubscriptionSettings() {
  const { tenantId } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const { data: tenant } = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("name")
        .eq("id", tenantId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const resortName = tenant?.name || "Resort";

  const buildUpiUrl = (scheme: string, plan: Plan) => {
    const remark = `${resortName} - ${plan.name} Plan`;
    const params = new URLSearchParams({
      pa: UPI_ID,
      pn: "Digital Marketing Unlocked",
      am: plan.amount.toString(),
      cu: "INR",
      tn: remark,
    });

    if (scheme === "gpay") {
      return `tez://upi/pay?${params.toString()}`;
    }
    if (scheme === "phonepe") {
      return `phonepe://pay?${params.toString()}`;
    }
    if (scheme === "cred") {
      return `cred://upi/pay?${params.toString()}`;
    }
    if (scheme === "amazonpay") {
      return `amazonpay://upi/pay?${params.toString()}`;
    }
    return `upi://pay?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Subscription & Billing</h3>
        <p className="text-sm text-muted-foreground">Manage your plan, usage, and billing information.</p>
      </div>

      {/* Current Plan */}
      <div className="glass-card bg-card p-5 space-y-4 rounded-2xl">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Current Plan
          </h4>
          <Badge className="bg-primary/15 text-primary border-primary/30 rounded-md text-xs">Free Plan</Badge>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">₹0</span>
          <span className="text-sm text-muted-foreground">/month</span>
        </div>
        <p className="text-sm text-muted-foreground">Your current billing cycle ends on April 8, 2026.</p>
      </div>

      {/* Usage */}
      <div className="glass-card bg-card p-5 space-y-4 rounded-2xl">
        <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
          <Zap className="w-4 h-4" /> Usage
        </h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Leads</span>
              <span className="font-medium">12 / 50</span>
            </div>
            <Progress value={24} className="h-2 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Team Members</span>
              <span className="font-medium">1 / 1</span>
            </div>
            <Progress value={100} className="h-2 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Data Exports</span>
              <span className="font-medium">2 / 5</span>
            </div>
            <Progress value={40} className="h-2 rounded-full" />
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
          <Crown className="w-4 h-4" /> Available Plans
        </h4>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`glass-card bg-card p-5 rounded-2xl space-y-4 relative ${
                plan.recommended ? "ring-2 ring-primary" : ""
              }`}
            >
              {plan.recommended && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] rounded-md px-3">
                  Recommended
                </Badge>
              )}
              <div>
                <h5 className="font-semibold">{plan.name}</h5>
                {plan.subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">{plan.subtitle}</p>
                )}
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <span className="text-xs text-muted-foreground">{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full rounded-xl gap-2"
                variant={plan.current ? "outline" : plan.recommended ? "default" : "outline"}
                disabled={plan.current}
                onClick={() => !plan.current && setSelectedPlan(plan)}
              >
                {plan.current ? "Current Plan" : "Upgrade"}
                {!plan.current && <ArrowUpRight className="w-3.5 h-3.5" />}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* UPI Payment Dialog */}
      <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Pay via UPI
            </DialogTitle>
            <DialogDescription>
              Upgrade to <span className="font-semibold text-foreground">{selectedPlan?.name}</span> plan for{" "}
              <span className="font-semibold text-foreground">{selectedPlan?.price}/month</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold">{selectedPlan?.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">UPI ID</span>
                <span className="font-mono text-xs">{UPI_ID}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remarks</span>
                <span className="text-xs">{resortName} - {selectedPlan?.name} Plan</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {UPI_APPS.map((app) => (
                <a
                  key={app.name}
                  href={selectedPlan ? buildUpiUrl(app.scheme, selectedPlan) : "#"}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <span className="text-2xl">{app.icon}</span>
                  <span className="font-medium text-sm">{app.name}</span>
                  <ArrowUpRight className="w-4 h-4 ml-auto text-muted-foreground" />
                </a>
              ))}
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              You will be redirected to your UPI app to complete the payment.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
