import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, GripVertical } from "lucide-react";

const STAGES = [
  { key: "inquiry", label: "Inquiry", color: "bg-info/20 text-info border-info/30" },
  { key: "proposal", label: "Proposal", color: "bg-warning/20 text-warning border-warning/30" },
  { key: "negotiation", label: "Negotiation", color: "bg-accent/20 text-accent border-accent/30" },
  { key: "booked", label: "Booked", color: "bg-primary/20 text-primary border-primary/30" },
  { key: "completed", label: "Completed", color: "bg-success/20 text-success border-success/30" },
  { key: "lost", label: "Lost", color: "bg-destructive/20 text-destructive border-destructive/30" },
];

const PACKAGES = [
  { value: "rafting", label: "🏄 Rafting" },
  { value: "kayaking", label: "🚣 Kayaking" },
  { value: "jungle-safari", label: "🐘 Jungle Safari" },
  { value: "resort-stay", label: "🏨 Resort Stay" },
  { value: "camping", label: "⛺ Camping" },
  { value: "custom", label: "✨ Custom" },
];

export default function DealsPage() {
  const { tenantId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", value: "", stage: "inquiry", package_type: "rafting", expected_date: "" });

  const { data: deals, isLoading } = useQuery({
    queryKey: ["deals", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("*, contacts(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const createDeal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("deals").insert({
        title: form.title,
        value: parseFloat(form.value) || 0,
        stage: form.stage,
        package_type: form.package_type,
        expected_date: form.expected_date || null,
        tenant_id: tenantId!,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setDialogOpen(false);
      setForm({ title: "", value: "", stage: "inquiry", package_type: "rafting", expected_date: "" });
      toast({ title: "Deal created!" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase.from("deals").update({ stage }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deals"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Deals Pipeline</h1>
          <p className="text-muted-foreground mt-1">Track your bookings and deals</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> New Deal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">New Deal</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createDeal.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. River Rafting Group Booking" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Value (₹)</Label>
                  <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="25000" />
                </div>
                <div className="space-y-2">
                  <Label>Package</Label>
                  <Select value={form.package_type} onValueChange={(v) => setForm({ ...form, package_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PACKAGES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Expected Date</Label>
                <Input type="date" value={form.expected_date} onChange={(e) => setForm({ ...form, expected_date: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={createDeal.isPending}>
                {createDeal.isPending ? "Creating..." : "Create Deal"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageDeals = deals?.filter((d) => d.stage === stage.key) ?? [];
          const stageTotal = stageDeals.reduce((s, d) => s + (d.value ?? 0), 0);

          return (
            <div key={stage.key} className="min-w-[280px] flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={stage.color}>{stage.label}</Badge>
                  <span className="text-xs text-muted-foreground">({stageDeals.length})</span>
                </div>
                <span className="text-xs font-medium text-muted-foreground">₹{stageTotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="space-y-3">
                {isLoading ? (
                  <Card className="border-border"><CardContent className="p-4 text-sm text-muted-foreground">Loading...</CardContent></Card>
                ) : stageDeals.length > 0 ? (
                  stageDeals.map((deal) => (
                    <Card key={deal.id} className="border-border hover:shadow-md transition-shadow cursor-pointer group">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <h3 className="font-medium text-sm leading-tight">{deal.title}</h3>
                          <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {deal.package_type && (
                          <span className="text-xs text-muted-foreground capitalize">
                            {PACKAGES.find((p) => p.value === deal.package_type)?.label || deal.package_type}
                          </span>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-primary">₹{(deal.value ?? 0).toLocaleString("en-IN")}</span>
                          {deal.expected_date && (
                            <span className="text-xs text-muted-foreground">{new Date(deal.expected_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                          )}
                        </div>
                        {/* Quick stage change */}
                        <Select value={deal.stage} onValueChange={(v) => updateStage.mutate({ id: deal.id, stage: v })}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STAGES.map((s) => (
                              <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="border border-dashed border-border rounded-lg p-6 text-center text-xs text-muted-foreground">
                    No deals
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
