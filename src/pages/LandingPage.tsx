import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Users, Clock, Target, BarChart3, Shield, Smartphone, Zap,
  Check, ArrowRight, CalendarCheck, Phone, ChevronRight, Star, Crown,
} from "lucide-react";

const FEATURES = [
  {
    icon: Users,
    title: "Lead Management",
    description: "Track every inquiry from first call to booking with custom statuses and detailed guest profiles.",
  },
  {
    icon: Phone,
    title: "One-Tap Follow-ups",
    description: "Call or WhatsApp leads directly from the app. Never miss a follow-up with smart reminders.",
  },
  {
    icon: CalendarCheck,
    title: "Booking Tracker",
    description: "Manage check-in/out dates, guest counts, room types, and activities all in one place.",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "Visual lead funnel, conversion rates, and source tracking to optimize your marketing spend.",
  },
  {
    icon: Shield,
    title: "Team & Multi-tenant",
    description: "Invite your sales team with role-based access. Each resort gets its own isolated workspace.",
  },
  {
    icon: Smartphone,
    title: "Mobile-First Design",
    description: "Built for on-the-go resort managers. Fully responsive with dark mode support.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "/month",
    features: ["Up to 50 leads", "1 team member", "Basic analytics", "Email support", "1 data export"],
  },
  {
    name: "Startup",
    subtitle: "For solo founders",
    price: "₹999",
    period: "/month",
    features: ["Unlimited leads", "1 team member", "Advanced analytics", "Priority support", "Custom lead statuses", "Cold follow-up page"],
    recommended: true,
  },
  {
    name: "Business",
    subtitle: "For growing teams",
    price: "₹1,999",
    period: "/month",
    features: ["Everything in Startup", "3 team members", "Priority support", "Export data", "Bookings page access", "Advanced reporting"],
  },
  {
    name: "Enterprise",
    subtitle: "For large organizations",
    price: "₹2,999",
    period: "/month",
    features: ["Everything in Business", "Unlimited team members", "Dedicated support", "White-label options", "SLA guarantee"],
  },
];

const TESTIMONIALS = [
  { name: "Rahul M.", role: "Resort Owner, Dandeli", text: "DandeliCRM transformed how we handle inquiries. Our bookings went up 40% in the first month." },
  { name: "Priya S.", role: "Sales Manager, Rishikesh", text: "The follow-up reminders alone are worth it. We never lose a lead now." },
  { name: "Amit K.", role: "Adventure Camp, Coorg", text: "Simple, fast, and built exactly for our business. Best CRM decision we made." },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-heading font-bold">
              Dandeli<span className="text-primary">CRM</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Testimonials</a>
          </nav>
          <div className="flex items-center gap-2">
            {!loading && user ? (
              <Button onClick={() => navigate("/dashboard")} className="rounded-xl gap-2">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")} className="rounded-xl text-sm">
                  Log In
                </Button>
                <Button onClick={() => navigate("/auth")} className="rounded-xl text-sm gap-1.5">
                  Sign Up <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32 relative">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <Badge variant="secondary" className="rounded-full px-4 py-1.5 text-xs font-medium bg-primary/10 text-primary border-primary/20">
              <Zap className="w-3 h-3 mr-1.5" /> Built for Adventure Tourism & Resorts
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold tracking-tight leading-[1.1]">
              Turn Every Inquiry Into a{" "}
              <span className="text-primary">Booking</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The CRM built specifically for resorts, adventure camps, and tourism businesses. 
              Track leads, automate follow-ups, and boost your conversion rate.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Button size="lg" onClick={() => navigate("/auth")} className="rounded-xl gap-2 px-8 text-base shadow-lg shadow-primary/25">
                Start Free <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="rounded-xl gap-2 px-8 text-base">
                See Features
              </Button>
            </div>
            <p className="text-xs text-muted-foreground pt-2">No credit card required · Free plan available · Set up in 2 minutes</p>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border/40 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "500+", label: "Resorts & Camps" },
              { value: "50K+", label: "Leads Tracked" },
              { value: "35%", label: "Avg. Conversion Lift" },
              { value: "4.8★", label: "User Rating" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs mb-4 bg-secondary/10 text-secondary border-secondary/20">
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold">
              Everything You Need to Grow Bookings
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Purpose-built tools for resort and adventure tourism businesses.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass-card bg-card p-6 rounded-2xl space-y-3 group hover:shadow-lg transition-shadow">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 sm:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs mb-4 bg-accent/10 text-accent border-accent/20">
              Pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Start free. Upgrade as you grow. Save 2 months with annual billing.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`glass-card bg-card p-6 rounded-2xl space-y-5 relative ${
                  plan.recommended ? "ring-2 ring-primary shadow-lg shadow-primary/10" : ""
                }`}
              >
                {plan.recommended && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] rounded-md px-3">
                    Most Popular
                  </Badge>
                )}
                <div>
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  {plan.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{plan.subtitle}</p>}
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full rounded-xl gap-2"
                  variant={plan.recommended ? "default" : "outline"}
                  onClick={() => navigate("/auth")}
                >
                  Get Started <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs mb-4 bg-primary/10 text-primary border-primary/20">
              Testimonials
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold">
              Loved by Resort Owners
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="glass-card bg-card p-6 rounded-2xl space-y-4">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">"{t.text}"</p>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold">
            Ready to Grow Your Bookings?
          </h2>
          <p className="text-lg text-muted-foreground">
            Join hundreds of resorts already using DandeliCRM to convert more leads into paying guests.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="rounded-xl gap-2 px-10 text-base shadow-lg shadow-primary/25">
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold">Dandeli<span className="text-primary">CRM</span></span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} DandeliCRM. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
