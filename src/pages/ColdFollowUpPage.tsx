import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, Phone, MessageCircle, Snowflake } from "lucide-react";
import LeadProfileDialog from "@/components/LeadProfileDialog";
import CallFlowDialog from "@/components/CallFlowDialog";

export default function ColdFollowUpPage() {
  const { tenantId } = useAuth();
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [callFlowOpen, setCallFlowOpen] = useState(false);
  const [callFlowContact, setCallFlowContact] = useState<{ id: string; name: string; phone: string | null; type: string } | null>(null);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["cold-contacts", tenantId],
    queryFn: async () => {
      const [contactsRes, callsRes, remindersRes] = await Promise.all([
        supabase.from("contacts").select("*").not("type", "in", "(booked,lost,cancelled)"),
        supabase.from("call_history").select("contact_id, called_at"),
        supabase.from("reminders").select("contact_id, reminder_date").eq("is_active", true),
      ]);
      if (contactsRes.error) throw contactsRes.error;

      const lastActivityMap = new Map<string, number>();
      const bump = (id: string, t: number) => {
        const cur = lastActivityMap.get(id) ?? 0;
        if (t > cur) lastActivityMap.set(id, t);
      };
      (callsRes.data || []).forEach((c: any) => bump(c.contact_id, new Date(c.called_at).getTime()));
      (remindersRes.data || []).forEach((r: any) => bump(r.contact_id, new Date(r.reminder_date).getTime()));

      const now = Date.now();
      const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

      const enriched = (contactsRes.data || []).map((c: any) => {
        const createdMs = new Date(c.created_at).getTime();
        const lastActivity = Math.max(createdMs, lastActivityMap.get(c.id) ?? 0);
        return { ...c, _lastActivity: lastActivity };
      });

      // Cold: last activity (created/call/reminder) older than 3 days
      return enriched
        .filter((c) => now - c._lastActivity > THREE_DAYS)
        .sort((a, b) => a._lastActivity - b._lastActivity);
    },
    enabled: !!tenantId,
  });

  const totalPeople = (c: any) => (c.adults_count || 0) + (c.kids_count || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold">Cold Follow Up</h1>
        <p className="text-muted-foreground mt-1 text-sm">Re-engage leads that have gone cold</p>
      </div>

      {isLoading ? (
        <div className="glass-card bg-card p-12 text-center text-muted-foreground">Loading...</div>
      ) : contacts && contacts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="glass-card bg-card p-5 cursor-pointer transition-all hover:shadow-md"
              onClick={() => setSelectedContact(contact)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-semibold text-sm">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.phone || "No phone"}</p>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0">
                  <p className="uppercase font-semibold">Last Contact</p>
                  <p className="truncate max-w-[120px]">{new Date(contact.updated_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="glass-card bg-card/50 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="w-3.5 h-3.5" /> CHECK-IN
                  </div>
                  <p className="text-sm font-medium">{contact.check_in_date || "Not set"}</p>
                </div>
                <div className="glass-card bg-card/50 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" /> GUESTS
                  </div>
                  <p className="text-sm font-medium">{totalPeople(contact)} People</p>
                </div>
              </div>

              <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-2">
                  {contact.phone && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg"
                        onClick={() => {
                          window.open(`tel:${contact.phone}`);
                          setCallFlowContact({ id: contact.id, name: contact.name, phone: contact.phone, type: contact.type });
                          setTimeout(() => setCallFlowOpen(true), 1500);
                        }}
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg"
                        onClick={() => window.open(`https://wa.me/${contact.phone?.replace(/\D/g, "")}`)}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card bg-card p-12 text-center">
          <Snowflake className="w-12 h-12 text-secondary mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-lg">No cold leads</h3>
          <p className="text-muted-foreground mt-1 text-sm">All your leads are being followed up on time!</p>
        </div>
      )}

      <LeadProfileDialog
        contact={selectedContact}
        open={!!selectedContact}
        onOpenChange={(open) => !open && setSelectedContact(null)}
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
