import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  User, Phone, MapPin, CalendarDays, Users, Mail,
  MessageCircle, Clock, Bell, FileText
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";

type Contact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  adults_count: number | null;
  kids_count: number | null;
  guests_count: number | null;
  city: string | null;
  source: string | null;
  type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Reminder = {
  id: string;
  message: string | null;
  reminder_date: string;
  is_active: boolean | null;
  created_at: string;
};

interface LeadProfileDialogProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LeadProfileDialog({ contact, open, onOpenChange }: LeadProfileDialogProps) {
  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders", contact?.id],
    queryFn: async () => {
      if (!contact) return [];
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("contact_id", contact.id)
        .order("reminder_date", { ascending: false });
      if (error) throw error;
      return data as Reminder[];
    },
    enabled: !!contact?.id && open,
  });

  const { data: callHistory = [] } = useQuery({
    queryKey: ["call-history", contact?.id],
    queryFn: async () => {
      if (!contact) return [];
      const { data, error } = await supabase
        .from("call_history")
        .select("*")
        .eq("contact_id", contact.id)
        .order("called_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!contact?.id && open,
  });

  if (!contact) return null;

  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(contact.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="w-9 h-9 rounded-full bg-secondary/15 flex items-center justify-center text-secondary font-semibold text-sm shrink-0">
              {contact.name.charAt(0).toUpperCase()}
            </div>
            {contact.name}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
            {contact.phone && (
              <span className="flex items-center gap-1 text-xs">
                <Phone className="w-3 h-3" /> {contact.phone}
              </span>
            )}
            {contact.email && (
              <span className="flex items-center gap-1 text-xs">
                <Mail className="w-3 h-3" /> {contact.email}
              </span>
            )}
            {contact.city && (
              <span className="flex items-center gap-1 text-xs">
                <MapPin className="w-3 h-3" /> {contact.city}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">{contact.type}</Badge>
          {contact.source && <Badge variant="secondary" className="text-xs">{contact.source}</Badge>}
          <Badge variant="destructive" className="text-xs">
            <Clock className="w-3 h-3 mr-1" /> Cold {daysSinceUpdate}d
          </Badge>
        </div>

        {/* Stay info */}
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted/50 p-3">
          <div className="text-center">
            <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">Check-in</p>
            <p className="font-semibold text-sm text-foreground">
              {contact.check_in_date ? format(parseISO(contact.check_in_date), "dd MMM") : "—"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">Check-out</p>
            <p className="font-semibold text-sm text-foreground">
              {contact.check_out_date ? format(parseISO(contact.check_out_date), "dd MMM") : "—"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">Guests</p>
            <p className="font-semibold text-sm text-foreground flex items-center justify-center gap-1">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              {(contact.adults_count || 0) + (contact.kids_count || 0)}
            </p>
          </div>
        </div>

        {/* Notes */}
        {contact.notes && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
              <FileText className="w-3.5 h-3.5" /> Notes
            </p>
            <p className="text-sm text-foreground bg-muted/30 rounded-lg p-2.5">{contact.notes}</p>
          </div>
        )}

        <Separator />

        {/* Reminder History */}
        <div className="space-y-3">
          <p className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
            <Bell className="w-3.5 h-3.5" /> Reminder History
          </p>
          {reminders.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No reminders set for this lead</p>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {reminders.map((r) => (
                <div key={r.id} className="flex items-start gap-2.5 rounded-lg bg-muted/30 p-2.5">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${r.is_active ? "bg-primary" : "bg-muted-foreground/40"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground">
                      {format(parseISO(r.reminder_date), "dd MMM yyyy, hh:mm a")}
                    </p>
                    {r.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.message}</p>}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(parseISO(r.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {r.is_active && <Badge className="text-[9px] px-1.5 py-0 shrink-0">Active</Badge>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Call History */}
        {callHistory.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <p className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
                <Phone className="w-3.5 h-3.5" /> Call History
              </p>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {callHistory.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5 rounded-lg bg-muted/30 p-2.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">
                        {format(parseISO(c.called_at), "dd MMM yyyy, hh:mm a")}
                      </p>
                      {c.duration && <p className="text-[10px] text-muted-foreground">Duration: {c.duration}</p>}
                      {c.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Quick actions */}
        <div className="flex items-center gap-2 pt-1">
          {contact.phone && (
            <>
              <Button size="sm" variant="outline" className="rounded-xl text-xs flex-1" onClick={() => window.open(`tel:${contact.phone}`)}>
                <Phone className="w-3.5 h-3.5 mr-1" /> Call
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl text-xs flex-1 text-green-600" onClick={() => window.open(`https://wa.me/${contact.phone?.replace(/\D/g, "")}`)}>
                <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
