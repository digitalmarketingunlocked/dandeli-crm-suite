import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLeadStatuses } from "@/hooks/useLeadStatuses";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { MessageCircle, Save, Clock, CalendarDays } from "lucide-react";

interface CallFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  contactPhone: string | null;
  currentType: string;
}

export default function CallFlowDialog({
  open, onOpenChange, contactId, contactName, contactPhone, currentType,
}: CallFlowDialogProps) {
  const { tenantId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { statuses: leadStatuses } = useLeadStatuses();
  const STAGE_OPTIONS = leadStatuses.map((s) => ({ value: s.value, label: s.label }));

  const [step, setStep] = useState<1 | 2>(1);
  const [callNotes, setCallNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [newStatus, setNewStatus] = useState(currentType);

  const resetState = () => {
    setStep(1);
    setCallNotes("");
    setFollowUpDate("");
    setFollowUpTime("");
    setNewStatus(currentType);
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) resetState();
    onOpenChange(val);
  };

  const logCallMutation = useMutation({
    mutationFn: async ({ notes, spoke }: { notes: string; spoke: boolean }) => {
      if (!tenantId) throw new Error("No tenant");

      // Insert call history
      const { error: callErr } = await supabase.from("call_history").insert({
        contact_id: contactId,
        tenant_id: tenantId,
        notes: spoke ? (notes.trim() || "Outgoing Call") : "No Answer / Busy",
        created_by: user?.id || null,
      });
      if (callErr) throw callErr;

      // If spoke, update contact
      if (spoke) {
        const updates: Record<string, unknown> = { type: newStatus };
        if (followUpDate) {
          updates.follow_up_date = followUpDate;
          if (followUpTime) updates.lead_time = followUpTime;
        }
        const { error: updateErr } = await supabase
          .from("contacts").update(updates).eq("id", contactId);
        if (updateErr) throw updateErr;

        // Create a reminder if follow-up date is set
        if (followUpDate) {
          const reminderDateTime = followUpTime
            ? `${followUpDate}T${followUpTime}:00`
            : `${followUpDate}T09:00:00`;
          const { error: reminderErr } = await supabase.from("reminders").insert({
            contact_id: contactId,
            tenant_id: tenantId,
            created_by: user?.id || null,
            reminder_date: reminderDateTime,
            message: `Follow-up call with ${contactName}${notes.trim() ? `: ${notes.trim()}` : ""}`,
            is_active: true,
          });
          if (reminderErr) throw reminderErr;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_history", contactId] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["reminders", contactId] });
      toast({ title: "Call logged!" });
      handleOpenChange(false);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleSpoke = () => {
    setStep(2);
  };

  const handleNotSpoke = () => {
    logCallMutation.mutate({ notes: "No Answer / Busy", spoke: false });
  };

  const handleSaveAndClose = () => {
    logCallMutation.mutate({ notes: callNotes, spoke: true });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-strong bg-card rounded-2xl sm:max-w-md p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-primary/15 px-6 pt-6 pb-4">
          <h2 className="text-lg font-heading font-bold text-foreground">
            Call with {contactName}
          </h2>
          <p className="text-sm font-medium text-primary">
            {step === 1 ? "Confirm interaction" : "Log your interaction details"}
          </p>
        </div>

        {step === 1 ? (
          /* Step 1: Did you speak? */
          <div className="px-6 pb-6 pt-4 space-y-6">
            <p className="text-center text-base font-semibold text-foreground">
              Did you speak to {contactName}?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                className="h-16 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground"
                onClick={handleSpoke}
              >
                Yes, I spoke
              </Button>
              <Button
                variant="outline"
                className="h-16 rounded-xl text-sm font-semibold"
                onClick={handleNotSpoke}
                disabled={logCallMutation.isPending}
              >
                No / Busy
              </Button>
            </div>
          </div>
        ) : (
          /* Step 2: Log details */
          <div className="px-6 pb-6 pt-4 space-y-5">
            {/* Call Outcome / Notes */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Call Outcome / Notes
              </Label>
              <div className="relative">
                <Textarea
                  placeholder="What did you discuss? Any specific requirements?"
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  className="rounded-xl min-h-[100px] border-primary/30 focus:border-primary pr-10"
                />
                <button
                  type="button"
                  className="absolute bottom-3 right-3 text-primary hover:text-primary/80 transition-colors"
                  onClick={() => {
                    if (contactPhone)
                      window.open(`https://wa.me/${contactPhone.replace(/\D/g, "")}?text=${encodeURIComponent(callNotes)}`);
                  }}
                  title="Send via WhatsApp"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Schedule Next Follow-up */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Schedule Next Follow-up
              </Label>
              <DateInput
                value={followUpDate}
                onChange={setFollowUpDate}
                placeholder="Pick follow-up date"
                className="rounded-xl"
              />
              <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  type="time"
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                  className="border-0 p-0 h-auto text-sm focus-visible:ring-0 bg-transparent"
                />
              </div>
            </div>

            {/* Update Status */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Update Status
              </Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-strong bg-card rounded-xl">
                  {STAGE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Save */}
            <Button
              className="w-full h-12 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground gap-2"
              onClick={handleSaveAndClose}
              disabled={logCallMutation.isPending}
            >
              <Save className="w-4 h-4" /> Save & Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
