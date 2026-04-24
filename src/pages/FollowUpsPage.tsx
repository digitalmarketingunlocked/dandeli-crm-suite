import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle2, Phone, MessageCircle } from "lucide-react";
import LeadProfileDialog from "@/components/LeadProfileDialog";
import CallFlowDialog from "@/components/CallFlowDialog";

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
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [callFlowOpen, setCallFlowOpen] = useState(false);
  const [callFlowContact, setCallFlowContact] = useState<{ id: string; name: string; phone: string | null; type: string } | null>(null);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["followup-contacts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .in("type", ["follow-up", "lead", "interested", "negotiation"])
        .order("updated_at", { ascending: true });
      if (error) throw error;
      const todayStr = new Date().toISOString().slice(0, 10);
      // Exclude cold leads: no interaction in 3+ days AND check-in is not today/past AND not cancelled
      return data.filter((c) => {
        const lastTouchDays = Math.floor(
          (Date.now() - new Date(c.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        const checkInDueOrPast = c.check_in_date && c.check_in_date <= todayStr;
        const isCancelled = c.type === "cancelled" || c.type === "lost";
        const isCold = lastTouchDays > 3 && !checkInDueOrPast && !isCancelled;
        return !isCold;
      });
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
            <div key={contact.id} className="glass-card bg-card p-4 sm:p-5 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setSelectedContact(contact)}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0 text-accent font-semibold text-sm">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{contact.name}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                    {contact.phone && (
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" />{contact.phone}</span>
                    )}
                    {contact.check_in_date && <span>Check-in: {contact.check_in_date}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-2 sm:gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Badge variant="outline" className={`${TYPE_BADGE[contact.type] || ""} rounded-lg capitalize`}>{contact.type.replace("-", " ")}</Badge>
                <span className="text-xs text-muted-foreground whitespace-nowrap">Last: {getTimeAgo(contact.updated_at)}</span>
                <Select value={contact.type} onValueChange={(v) => updateType.mutate({ id: contact.id, type: v })}>
                  <SelectTrigger className="h-8 w-[120px] text-xs rounded-lg"><SelectValue /></SelectTrigger>
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg" onClick={() => {
                      window.open(`tel:${contact.phone}`);
                      setCallFlowContact({ id: contact.id, name: contact.name, phone: contact.phone, type: contact.type });
                      setTimeout(() => setCallFlowOpen(true), 1500);
                    }}>
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

      <LeadProfileDialog
        contact={selectedContact}
        open={!!selectedContact}
        onOpenChange={(open) => { if (!open) setSelectedContact(null); }}
      />

      {callFlowContact && (
        <CallFlowDialog
          open={callFlowOpen}
          onOpenChange={setCallFlowOpen}
          contactId={callFlowContact.id}
          contactName={callFlowContact.name}
          contactPhone={callFlowContact.phone}
          currentType={callFlowContact.type}
        />
      )}
    </div>
  );
}
