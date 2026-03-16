import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  User, Phone, MapPin, CalendarDays, Users,
  Building2, BedDouble, IndianRupee, Sparkles, Save, MessageCircle, Car
} from "lucide-react";
import { format, parseISO } from "date-fns";
import CallFlowDialog from "@/components/CallFlowDialog";

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
  property_name?: string | null;
  room_type?: string | null;
  pricing?: number | null;
  pricing_total?: number | null;
  transport?: string | null;
  activities?: string | null;
};

interface BookingDetailDialogProps {
  booking: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BookingDetailDialog({ booking, open, onOpenChange }: BookingDetailDialogProps) {
  const queryClient = useQueryClient();
  const [propertyName, setPropertyName] = useState("");
  const [roomType, setRoomType] = useState("");
  const [pricing, setPricing] = useState("");
  const [pricingTotal, setPricingTotal] = useState("");
  const [transport, setTransport] = useState("");
  const [activities, setActivities] = useState("");
  const [notes, setNotes] = useState("");
  const [callFlowOpen, setCallFlowOpen] = useState(false);

  useEffect(() => {
    if (booking) {
      setPropertyName(booking.property_name || "");
      setRoomType(booking.room_type || "");
      setPricing(booking.pricing?.toString() || "");
      setPricingTotal(booking.pricing_total?.toString() || "");
      setTransport(booking.transport || "");
      setActivities(booking.activities || "");
      setNotes(booking.notes || "");
    }
  }, [booking]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!booking) return;
      const { error } = await supabase
        .from("contacts")
        .update({
          property_name: propertyName || null,
          room_type: roomType || null,
          pricing: pricing ? parseFloat(pricing) : null,
          pricing_total: pricingTotal ? parseFloat(pricingTotal) : null,
          transport: transport || null,
          activities: activities || null,
          notes: notes || null,
        })
        .eq("id", booking.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking details updated");
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to update booking"),
  });

  if (!booking) return null;

  const getNights = () => {
    if (!booking.check_in_date || !booking.check_out_date) return null;
    const diff = Math.ceil(
      (parseISO(booking.check_out_date).getTime() - parseISO(booking.check_in_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff > 0 ? diff : null;
  };

  const nights = getNights();

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            {booking.name}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-3 pt-1">
            {booking.phone && (
              <span className="flex items-center gap-1 text-xs">
                <Phone className="w-3 h-3" /> {booking.phone}
              </span>
            )}
            {booking.city && (
              <span className="flex items-center gap-1 text-xs">
                <MapPin className="w-3 h-3" /> {booking.city}
              </span>
            )}
            {booking.source && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{booking.source}</Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Stay info */}
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted/50 p-3">
          <div className="text-center">
            <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">Check-in</p>
            <p className="font-semibold text-sm text-foreground">
              {booking.check_in_date ? format(parseISO(booking.check_in_date), "dd MMM yyyy") : "—"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">Check-out</p>
            <p className="font-semibold text-sm text-foreground">
              {booking.check_out_date ? format(parseISO(booking.check_out_date), "dd MMM yyyy") : "—"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">Guests</p>
            <p className="font-semibold text-sm text-foreground flex items-center justify-center gap-1">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              {booking.adults_count || 0}A{(booking.kids_count || 0) > 0 && ` + ${booking.kids_count}K`}
            </p>
          </div>
          {nights && (
            <div className="col-span-3 text-center">
              <Badge variant="outline" className="text-xs">{nights} Night{nights > 1 ? "s" : ""}</Badge>
            </div>
          )}
        </div>

        <Separator />

        {/* Editable booking details */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-medium">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> Property Name
            </Label>
            <Input
              placeholder="e.g. Riverside Villa, Mountain Lodge"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-medium">
              <BedDouble className="w-3.5 h-3.5 text-muted-foreground" /> Room Type
            </Label>
            <Input
              placeholder="e.g. Deluxe Suite, Standard Room"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-medium">
                <IndianRupee className="w-3.5 h-3.5 text-muted-foreground" /> Pricing / Head
              </Label>
              <Input
                type="number" inputMode="numeric" pattern="[0-9]*"
                placeholder="e.g. 5000"
                value={pricing}
                onChange={(e) => setPricing(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-medium">
                <IndianRupee className="w-3.5 h-3.5 text-muted-foreground" /> Total
              </Label>
              <Input
                type="number" inputMode="numeric" pattern="[0-9]*"
                placeholder="e.g. 25000"
                value={pricingTotal}
                onChange={(e) => setPricingTotal(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-medium">
              <Car className="w-3.5 h-3.5 text-muted-foreground" /> Transport
            </Label>
            <Input
              placeholder="e.g. Self drive, Pickup from station"
              value={transport}
              onChange={(e) => setTransport(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" /> Activities
            </Label>
            <Textarea
              placeholder="e.g. Trekking, Bonfire, River Rafting"
              value={activities}
              onChange={(e) => setActivities(e.target.value)}
              className="rounded-xl min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Notes</Label>
            <Textarea
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl min-h-[60px]"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-1.5">
            {booking.phone && (
              <>
                <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => {
                  window.open(`tel:${booking.phone}`);
                  setTimeout(() => setCallFlowOpen(true), 1500);
                }}>
                  <Phone className="w-3.5 h-3.5 mr-1" /> Call
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl text-xs text-green-600" onClick={() => window.open(`https://wa.me/${booking.phone?.replace(/\D/g, "")}`)}>
                  <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                </Button>
              </>
            )}
          </div>
          <Button
            size="sm"
            className="rounded-xl"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <CallFlowDialog
      open={callFlowOpen}
      onOpenChange={setCallFlowOpen}
      contactId={booking.id}
      contactName={booking.name}
      contactPhone={booking.phone}
      currentType={booking.type}
    />
    </>
  );
}
