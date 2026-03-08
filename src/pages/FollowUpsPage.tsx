import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle2, Phone, Mail } from "lucide-react";

const STAGE_BADGE: Record<string, string> = {
  inquiry: "bg-secondary/15 text-secondary border-secondary/30",
  proposal: "bg-warning/15 text-warning border-warning/30",
  negotiation: "bg-accent/15 text-accent border-accent/30",
};

export default function FollowUpsPage() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deals, isLoading } = useQuery({
    queryKey: ["followup-deals", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, contacts(name, phone, email)")
        .in("stage", ["inquiry", "proposal", "negotiation"])
        .order("updated_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase.from("deals").update({ stage }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followup-deals"] });
      toast({ title: "Deal updated!" });
    },
  });

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold">Follow-ups</h1>
        <p className="text-muted-foreground mt-1 text-sm">Deals that need your attention</p>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="glass-card bg-card p-8 text-center text-muted-foreground">Loading...</div>
        ) : deals && deals.length > 0 ? (
          deals.map((deal) => (
            <div key={deal.id} className="glass-card bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{deal.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {deal.contacts?.name && <span>{deal.contacts.name}</span>}
                    {deal.contacts?.phone && (
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{deal.contacts.phone}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant="outline" className={`${STAGE_BADGE[deal.stage] || ""} rounded-lg`}>{deal.stage}</Badge>
                <span className="text-xs text-muted-foreground whitespace-nowrap">Last: {getTimeAgo(deal.updated_at)}</span>
                <Select value={deal.stage} onValueChange={(v) => updateStage.mutate({ id: deal.id, stage: v })}>
                  <SelectTrigger className="h-8 w-[130px] text-xs rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent className="glass-strong bg-card rounded-xl">
                    <SelectItem value="inquiry">Inquiry</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="booked">Booked ✓</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-card bg-card p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
            <h3 className="font-heading font-semibold text-lg">All caught up!</h3>
            <p className="text-muted-foreground mt-1 text-sm">No pending follow-ups right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
