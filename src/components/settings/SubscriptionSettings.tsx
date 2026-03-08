import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CreditCard, Check, Zap, Crown, ArrowUpRight } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "/month",
    features: ["Up to 50 leads", "1 team member", "Basic analytics", "Email support"],
    current: true,
  },
  {
    name: "Startup",
    subtitle: "For solo founders",
    price: "₹999",
    period: "/month",
    features: ["Unlimited leads", "5 team members", "Advanced analytics", "Priority support", "Custom lead statuses", "Export data"],
    recommended: true,
  },
  {
    name: "Business",
    subtitle: "For growing business with sales team",
    price: "₹1,999",
    period: "/month",
    features: ["Everything in Startup", "15 team members", "API access", "Priority support", "Custom integrations", "Advanced reporting"],
  },
  {
    name: "Enterprise",
    subtitle: "For large organizations",
    price: "₹2,999",
    period: "/month",
    features: ["Everything in Business", "Unlimited team members", "Dedicated support", "White-label options", "SLA guarantee", "Custom onboarding"],
  },
];

export default function SubscriptionSettings() {
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
        <div className="grid gap-4 md:grid-cols-3">
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
              >
                {plan.current ? "Current Plan" : "Upgrade"}
                {!plan.current && <ArrowUpRight className="w-3.5 h-3.5" />}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
