import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CreditCard, Check, Zap, Crown, ArrowUpRight, Smartphone, Clock, CheckCircle2, XCircle } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";

import phonePeLogo from "@/assets/phonepe-logo.png";
import gpayLogo from "@/assets/gpay-logo.png";
import amazonPayLogo from "@/assets/amazonpay-logo.png";
import credLogo from "@/assets/cred-logo.png";
import upiLogo from "@/assets/upi-logo.png";

const UPI_ID = "digitalmarketingunlocked@ybl";

const UPI_APPS = [
  { name: "PhonePe", icon: phonePeLogo, scheme: "phonepe" },
  { name: "Google Pay", icon: gpayLogo, scheme: "gpay" },
  { name: "Amazon Pay", icon: amazonPayLogo, scheme: "amazonpay" },
  { name: "CRED", icon: credLogo, scheme: "cred" },
  { name: "Any UPI App", icon: upiLogo, scheme: "upi" },
];

interface Plan {
  name: string;
  subtitle?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  current?: boolean;
  recommended?: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: ["Up to 50 leads", "1 team member", "Basic analytics", "Email support", "1 data export"],
    current: true,
  },
  {
    name: "Startup",
    subtitle: "For solo founders",
    monthlyPrice: 999,
    yearlyPrice: 9999,
    features: ["Unlimited leads", "1 team member", "Advanced analytics", "Priority support", "Custom lead statuses"],
    recommended: true,
  },
  {
    name: "Business",
    subtitle: "For growing business with sales team",
    monthlyPrice: 1999,
    yearlyPrice: 19999,
    features: ["Everything in Startup", "3 team members", "Priority support", "Custom integrations", "Export data", "Advanced reporting", "Bookings page access"],
  },
  {
    name: "Enterprise",
    subtitle: "For large organizations",
    monthlyPrice: 2999,
    yearlyPrice: 29999,
    features: ["Everything in Business", "Unlimited team members", "Dedicated support", "White-label options", "SLA guarantee", "Custom onboarding"],
  },
];

const formatPrice = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

const STATUS_CONFIG: Record<string, { icon: typeof Clock; label: string; className: string }> = {
  pending: { icon: Clock, label: "Pending Approval", className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  approved: { icon: CheckCircle2, label: "Approved", className: "bg-green-500/15 text-green-600 border-green-500/30" },
  rejected: { icon: XCircle, label: "Rejected", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

type DialogStep = "select-app" | "confirm-payment";

export default function SubscriptionSettings() {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [dialogStep, setDialogStep] = useState<DialogStep>("select-app");

  const { data: tenant } = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("name, current_plan")
        .eq("id", tenantId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
    refetchInterval: 10_000, // Check for plan updates
  });

  const { data: existingRequests } = useQuery({
    queryKey: ["subscription_requests", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_requests")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts-count", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members-count", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const submitRequest = useMutation({
    mutationFn: async (plan: Plan) => {
      const amount = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
      const { error } = await supabase.from("subscription_requests").insert({
        tenant_id: tenantId!,
        user_id: user!.id,
        plan_name: plan.name,
        billing_period: billing,
        amount,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription_requests"] });
      toast.success("Upgrade request submitted! We'll verify your payment and activate your plan shortly.");
      closeDialog();
    },
    onError: () => {
      toast.error("Failed to submit upgrade request. Please try again.");
    },
  });

  const resortName = tenant?.name || "Resort";
  const currentPlan = (tenant?.current_plan || "free").toLowerCase();
  const isYearly = billing === "yearly";

  const PLAN_ORDER = ["free", "startup", "business", "enterprise"];
  const currentPlanIndex = PLAN_ORDER.indexOf(currentPlan);

  const getPrice = (plan: Plan) => (isYearly ? plan.yearlyPrice : plan.monthlyPrice);
  const getPeriod = () => (isYearly ? "/year" : "/month");
  const isCurrentPlan = (plan: Plan) => plan.name.toLowerCase() === currentPlan;
  const canUpgrade = (plan: Plan) => PLAN_ORDER.indexOf(plan.name.toLowerCase()) > currentPlanIndex;

  const getMonthlySaving = (plan: Plan) => {
    if (plan.monthlyPrice === 0) return 0;
    return plan.monthlyPrice * 12 - plan.yearlyPrice;
  };

  const buildUpiUrl = (scheme: string, plan: Plan) => {
    const amount = getPrice(plan);
    const remark = `${resortName} - ${plan.name} Plan (${isYearly ? "Annual" : "Monthly"})`;
    const params = new URLSearchParams({
      pa: UPI_ID,
      pn: "Digital Marketing Unlocked",
      am: amount.toString(),
      cu: "INR",
      tn: remark,
    });

    if (scheme === "gpay") return `tez://upi/pay?${params.toString()}`;
    if (scheme === "phonepe") return `phonepe://pay?${params.toString()}`;
    if (scheme === "cred") return `cred://upi/pay?${params.toString()}`;
    if (scheme === "amazonpay") return `amazonpay://upi/pay?${params.toString()}`;
    return `upi://pay?${params.toString()}`;
  };

  const openDialog = (plan: Plan) => {
    setSelectedPlan(plan);
    setDialogStep("select-app");
  };

  const closeDialog = () => {
    setSelectedPlan(null);
    setDialogStep("select-app");
  };

  const handleUpiAppClick = () => {
    // After user clicks UPI app link, show confirmation step
    setTimeout(() => setDialogStep("confirm-payment"), 500);
  };

  const pendingRequest = existingRequests?.find((r) => r.status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Subscription & Billing</h3>
        <p className="text-sm text-muted-foreground">Manage your plan, usage, and billing information.</p>
      </div>

      {/* Pending Request Banner */}
      {pendingRequest && (
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/5">
          <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Upgrade to {pendingRequest.plan_name} is pending approval</p>
            <p className="text-xs text-muted-foreground">
              {formatPrice(Number(pendingRequest.amount))} ({pendingRequest.billing_period}) — submitted{" "}
              {new Date(pendingRequest.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge className={STATUS_CONFIG.pending.className + " rounded-md text-[10px]"}>
            Pending
          </Badge>
        </div>
      )}

      {/* Current Plan */}
      {(() => {
        const activePlan = PLANS.find((p) => p.name.toLowerCase() === currentPlan) || PLANS[0];
        return (
          <div className="glass-card bg-card p-5 space-y-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Current Plan
              </h4>
              <Badge className="bg-primary/15 text-primary border-primary/30 rounded-md text-xs capitalize">{currentPlan} Plan</Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{formatPrice(activePlan.monthlyPrice)}</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            {currentPlan !== "free" && (
              <p className="text-sm text-muted-foreground">You have full access to {activePlan.name} features.</p>
            )}
          </div>
        );
      })()}

      {/* Usage */}
      {(() => {
        const PLAN_LIMITS: Record<string, { leads: number; team: number; exports: number }> = {
          free: { leads: 50, team: 1, exports: 5 },
          startup: { leads: Infinity, team: 1, exports: 20 },
          business: { leads: Infinity, team: 3, exports: Infinity },
          enterprise: { leads: Infinity, team: Infinity, exports: Infinity },
        };
        const limits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.free;
        const leadsCount = contacts?.length ?? 0;
        const teamCount = teamMembers?.length ?? 0;
        const leadsPercent = limits.leads === Infinity ? (leadsCount > 0 ? 15 : 0) : Math.min(100, (leadsCount / limits.leads) * 100);
        const teamPercent = limits.team === Infinity ? (teamCount > 0 ? 15 : 0) : Math.min(100, (teamCount / limits.team) * 100);
        const leadsLabel = limits.leads === Infinity ? `${leadsCount} / Unlimited` : `${leadsCount} / ${limits.leads}`;
        const teamLabel = limits.team === Infinity ? `${teamCount} / Unlimited` : `${teamCount} / ${limits.team}`;

        return (
          <div className="glass-card bg-card p-5 space-y-4 rounded-2xl">
            <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
              <Zap className="w-4 h-4" /> Usage
            </h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Leads</span>
                  <span className="font-medium">{leadsLabel}</span>
                </div>
                <Progress value={leadsPercent} className="h-2 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Team Members</span>
                  <span className="font-medium">{teamLabel}</span>
                </div>
                <Progress value={teamPercent} className="h-2 rounded-full" />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Available Plans */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-2">
            <Crown className="w-4 h-4" /> Available Plans
          </h4>
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              value={billing}
              onValueChange={(v) => v && setBilling(v as "monthly" | "yearly")}
              className="bg-muted/50 rounded-xl p-1"
            >
              <ToggleGroupItem
                value="monthly"
                className="rounded-lg px-4 py-1.5 text-xs font-medium data-[state=on]:bg-card data-[state=on]:shadow-sm"
              >
                Monthly
              </ToggleGroupItem>
              <ToggleGroupItem
                value="yearly"
                className="rounded-lg px-4 py-1.5 text-xs font-medium data-[state=on]:bg-card data-[state=on]:shadow-sm"
              >
                Yearly
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 bg-green-500/15 text-green-600 border-green-500/30">
                  2 months free
                </Badge>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`glass-card bg-card p-5 rounded-2xl space-y-4 relative ${
                plan.recommended && !isCurrentPlan(plan) ? "ring-2 ring-primary" : ""
              } ${isCurrentPlan(plan) ? "ring-2 ring-primary/50" : ""}`}
            >
              {isCurrentPlan(plan) && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] rounded-md px-3">
                  Current Plan
                </Badge>
              )}
              {plan.recommended && !isCurrentPlan(plan) && (
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
                  <span className="text-2xl font-bold">{formatPrice(getPrice(plan))}</span>
                  <span className="text-xs text-muted-foreground">{getPeriod()}</span>
                </div>
                {isYearly && plan.monthlyPrice > 0 && (
                  <p className="text-[11px] text-green-600 mt-1 font-medium">
                    Save {formatPrice(getMonthlySaving(plan))}/year
                  </p>
                )}
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
                variant={isCurrentPlan(plan) ? "outline" : plan.recommended ? "default" : "outline"}
                disabled={isCurrentPlan(plan) || !canUpgrade(plan) || !!pendingRequest}
                onClick={() => canUpgrade(plan) && openDialog(plan)}
              >
                {isCurrentPlan(plan) ? "Current Plan" : !canUpgrade(plan) ? "Included" : pendingRequest ? "Upgrade Pending" : "Upgrade"}
                {canUpgrade(plan) && !pendingRequest && <ArrowUpRight className="w-3.5 h-3.5" />}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Requests */}
      {existingRequests && existingRequests.length > 0 && (
        <div className="glass-card bg-card p-5 space-y-3 rounded-2xl">
          <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Upgrade History
          </h4>
          <div className="space-y-2">
            {existingRequests.slice(0, 5).map((req) => {
              const config = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
              const StatusIcon = config.icon;
              return (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
                  <div className="flex items-center gap-3">
                    <StatusIcon className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{req.plan_name} Plan</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(Number(req.amount))} · {req.billing_period} · {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge className={config.className + " rounded-md text-[10px]"}>
                    {config.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* UPI Payment Dialog */}
      <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          {dialogStep === "select-app" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  Pay via UPI
                </DialogTitle>
                <DialogDescription>
                  Upgrade to <span className="font-semibold text-foreground">{selectedPlan?.name}</span> plan for{" "}
                  <span className="font-semibold text-foreground">
                    {selectedPlan && formatPrice(getPrice(selectedPlan))}{getPeriod()}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-bold">{selectedPlan && formatPrice(getPrice(selectedPlan))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Billing</span>
                    <span className="text-xs font-medium">{isYearly ? "Annual" : "Monthly"}</span>
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
                      onClick={handleUpiAppClick}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <img src={app.icon} alt={app.name} className="w-8 h-8 rounded-lg object-contain" />
                      <span className="font-medium text-sm">{app.name}</span>
                      <ArrowUpRight className="w-4 h-4 ml-auto text-muted-foreground" />
                    </a>
                  ))}
                </div>

                <p className="text-[11px] text-muted-foreground text-center">
                  You will be redirected to your UPI app to complete the payment.
                </p>
              </div>
            </>
          )}

          {dialogStep === "confirm-payment" && selectedPlan && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Confirm Payment
                </DialogTitle>
                <DialogDescription>
                  Did you complete the payment for the {selectedPlan.name} plan?
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-semibold">{selectedPlan.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-bold">{formatPrice(getPrice(selectedPlan))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Billing</span>
                    <span className="font-medium">{isYearly ? "Annual" : "Monthly"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid To</span>
                    <span className="font-mono text-xs">{UPI_ID}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20 text-xs text-yellow-700 dark:text-yellow-400">
                  ⏳ Your plan will be activated once the admin verifies and approves your payment. This usually takes a few hours.
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full rounded-xl gap-2"
                    onClick={() => submitRequest.mutate(selectedPlan)}
                    disabled={submitRequest.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {submitRequest.isPending ? "Submitting..." : "I Have Completed Payment"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full rounded-xl text-sm"
                    onClick={() => setDialogStep("select-app")}
                  >
                    Go Back to Payment Options
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
