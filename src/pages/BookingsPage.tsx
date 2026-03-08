import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CalendarDays, Users, MapPin, Phone, Search,
  CalendarCheck, User, MessageCircle
} from "lucide-react";
import { format, isToday, isTomorrow, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import BookingDetailDialog from "@/components/BookingDetailDialog";

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
};

type DateFilter = "all" | "today" | "tomorrow" | "this_week" | "this_month" | "custom";

export default function BookingsPage() {
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [search, setSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Contact | null>(null);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("type", "booked")
        .order("check_in_date", { ascending: true });
      if (error) throw error;
      return data as Contact[];
    },
  });

  const filtered = bookings.filter((b) => {
    // Search filter
    if (search) {
      const q = search.toLowerCase();
      if (
        !b.name.toLowerCase().includes(q) &&
        !(b.phone || "").toLowerCase().includes(q) &&
        !(b.city || "").toLowerCase().includes(q)
      )
        return false;
    }

    // Date filter
    if (dateFilter === "all") return true;
    if (!b.check_in_date) return false;

    const checkin = parseISO(b.check_in_date);
    const now = new Date();

    switch (dateFilter) {
      case "today":
        return isToday(checkin);
      case "tomorrow":
        return isTomorrow(checkin);
      case "this_week":
        return isWithinInterval(checkin, { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) });
      case "this_month":
        return isWithinInterval(checkin, { start: startOfMonth(now), end: endOfMonth(now) });
      case "custom":
        if (customFrom && customTo) {
          return isWithinInterval(checkin, { start: customFrom, end: customTo });
        }
        if (customFrom) return checkin >= customFrom;
        return true;
      default:
        return true;
    }
  });

  const getNights = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn || !checkOut) return null;
    const diff = Math.ceil((parseISO(checkOut).getTime() - parseISO(checkIn).getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Bookings</h1>
        <p className="text-muted-foreground text-sm mt-1">Confirmed bookings by check-in date</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>

        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
          <SelectTrigger className="w-[180px] rounded-xl">
            <CalendarCheck className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bookings</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="tomorrow">Tomorrow</SelectItem>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {dateFilter === "custom" && (
          <div className="flex gap-2 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="rounded-xl text-sm">
                  <CalendarDays className="w-4 h-4 mr-1" />
                  {customFrom ? format(customFrom, "dd MMM") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customFrom}
                  onSelect={setCustomFrom}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-sm">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="rounded-xl text-sm">
                  <CalendarDays className="w-4 h-4 mr-1" />
                  {customTo ? format(customTo, "dd MMM") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customTo}
                  onSelect={setCustomTo}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <Badge variant="secondary" className="rounded-xl px-3 py-1.5 text-sm">
          {filtered.length} booking{filtered.length !== 1 ? "s" : ""}
        </Badge>
        <Badge variant="outline" className="rounded-xl px-3 py-1.5 text-sm">
          {filtered.reduce((s, b) => s + (b.adults_count || 0) + (b.kids_count || 0), 0)} total guests
        </Badge>
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading bookings...</div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center text-muted-foreground">
            <CalendarCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No bookings found</p>
            <p className="text-sm mt-1">
              {dateFilter !== "all" ? "Try a different date filter" : "Booked leads will appear here"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((booking) => {
            const nights = getNights(booking.check_in_date, booking.check_out_date);
            const checkinDate = booking.check_in_date ? parseISO(booking.check_in_date) : null;
            const isCheckinToday = checkinDate ? isToday(checkinDate) : false;
            const isCheckinTomorrow = checkinDate ? isTomorrow(checkinDate) : false;

            return (
              <Card
                key={booking.id}
                className={cn(
                  "rounded-2xl transition-all hover:shadow-md",
                  isCheckinToday && "border-primary/50 bg-primary/5"
                )}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                    {/* Name & Contact */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{booking.name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            {booking.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {booking.phone}
                              </span>
                            )}
                            {booking.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {booking.city}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Check-in / Check-out */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">Check-in</p>
                        <p className={cn(
                          "font-semibold",
                          isCheckinToday ? "text-primary" : isCheckinTomorrow ? "text-accent-foreground" : "text-foreground"
                        )}>
                          {booking.check_in_date ? format(parseISO(booking.check_in_date), "dd MMM") : "—"}
                        </p>
                        {isCheckinToday && <Badge className="text-[9px] px-1.5 py-0 mt-0.5">Today</Badge>}
                        {isCheckinTomorrow && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 mt-0.5">Tomorrow</Badge>}
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">Check-out</p>
                        <p className="font-semibold text-foreground">
                          {booking.check_out_date ? format(parseISO(booking.check_out_date), "dd MMM") : "—"}
                        </p>
                        {nights && <span className="text-[10px] text-muted-foreground">{nights}N</span>}
                      </div>
                    </div>

                    {/* Guests */}
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {booking.adults_count || 0}A
                        {(booking.kids_count || 0) > 0 && ` + ${booking.kids_count}K`}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {booking.phone && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => window.open(`tel:${booking.phone}`)}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg text-green-600"
                            onClick={() => window.open(`https://wa.me/${booking.phone?.replace(/\D/g, "")}`)}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {booking.notes && (
                    <p className="text-xs text-muted-foreground mt-3 pl-11 line-clamp-1">{booking.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
