import { AlertTriangle, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MaintenanceNoticeProps {
  variant: "countdown" | "active";
  message: string;
  deadline: string | null;
  countdownMs?: number;
  onSignOut?: () => void;
}

const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${days.toString().padStart(2, "0")}d ${hours
    .toString()
    .padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m ${seconds
    .toString()
    .padStart(2, "0")}s`;
};

const formatDeadline = (deadline: string | null) => {
  if (!deadline) return null;
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
};

export default function MaintenanceNotice({
  variant,
  message,
  deadline,
  countdownMs = 0,
  onSignOut,
}: MaintenanceNoticeProps) {
  if (variant === "active") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm space-y-4">
          <div className="mx-auto w-12 h-12 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Maintenance in Progress</h1>
          <p className="text-muted-foreground">{message}</p>
          {onSignOut && (
            <Button variant="outline" onClick={onSignOut} className="rounded-xl">
              Sign Out
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-foreground flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Clock3 className="w-4 h-4 text-warning" />
        <p className="text-sm font-medium">Scheduled maintenance countdown</p>
      </div>
      <div className="text-sm">
        <span className="font-semibold">{formatCountdown(countdownMs)}</span>
        {formatDeadline(deadline) && (
          <span className="text-muted-foreground"> · starts at {formatDeadline(deadline)}</span>
        )}
      </div>
    </div>
  );
}
