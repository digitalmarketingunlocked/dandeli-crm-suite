import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle2, Phone, MessageCircle } from "lucide-react";

const TYPE_BADGE: Record<string, string> = {
  lead: "bg-secondary/15 text-secondary border-secondary/30",
  interested: "bg-primary/15 text-primary border-primary/30",
  "follow-up": "bg-accent/15 text-accent border-accent/30",
  negotiation: "bg-warning/15 text-warning border-warning/30",
};

export default function FollowUpsPage() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["followup-contacts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .in("type", ["follow-up", "lead", "interested", "negotiation"])
        .order("updated_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const updateType = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: string }) => {
      const { error } = await supabase.from("contacts").update({ type }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followup-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({ title: "Lead updated!" });
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
        <p className="text-muted-foreground mt-1 text-sm">Leads that need your attention</p>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="glass-card bg-card p-8 text-center text-muted-foreground">Loading...</div>
        ) : contacts && contacts.length > 0 ? (
          contacts.map((contact) => (
            <div key={contact.id} className="glass-card bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0 text-accent font-semibold text-sm">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{contact.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {contact.phone && (
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{contact.phone}</span>
                    )}
                    {contact.check_in_date && <span>Check-in: {contact.check_in_date}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant="outline" className={`${TYPE_BADGE[contact.type] || ""} rounded-lg capitalize`}>{contact.type.replace("-", " ")}</Badge>
                <span className="text-xs text-muted-foreground whitespace-nowrap">Last: {getTimeAgo(contact.updated_at)}</span>
                <Select value={contact.type} onValueChange={(v) => updateType.mutate({ id: contact.id, type: v })}>
                  <SelectTrigger className="h-8 w-[130px] text-xs rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent className="glass-strong bg-card rounded-xl">
                    <SelectItem value="lead">New Lead</SelectItem>
                    <SelectItem value="interested">Interested</SelectItem>
                    <SelectItem value="follow-up">Follow Up</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="booked">Booked ✓</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
                {contact.phone && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg" onClick={() => window.open(`tel:${contact.phone}`)}>
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg" onClick={() => window.open(`https://wa.me/${contact.phone?.replace(/\D/g, "")}`)}>
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </div>
                )}
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
