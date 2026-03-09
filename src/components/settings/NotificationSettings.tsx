import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, Smartphone, Loader2 } from "lucide-react";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { toast } from "sonner";

export default function NotificationSettings() {
  const [pushNotifications, setPushNotifications] = useState(() => {
    return localStorage.getItem("followup_notifications") !== "false";
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("notification_sound") !== "false";
  });

  const { isSubscribed, isSupported, loading: pushLoading, subscribe, unsubscribe } = usePushSubscription();

  const handleNotificationToggle = async (checked: boolean) => {
    setPushNotifications(checked);
    localStorage.setItem("followup_notifications", checked ? "true" : "false");
    if (checked && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const handleSoundToggle = (checked: boolean) => {
    setSoundEnabled(checked);
    localStorage.setItem("notification_sound", checked ? "true" : "false");
  };

  const handlePushToggle = async () => {
    if (isSubscribed) {
      const ok = await unsubscribe();
      if (ok) toast.success("Push notifications disabled");
      else toast.error("Failed to unsubscribe");
    } else {
      const ok = await subscribe();
      if (ok) toast.success("Push notifications enabled!");
      else toast.error("Failed to enable push notifications. Check browser permissions.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Notifications</h3>
        <p className="text-sm text-muted-foreground">Configure how and when you receive alerts.</p>
      </div>

      <div className="glass-card bg-card p-5 space-y-5 rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Follow-up Reminders</p>
            <p className="text-xs text-muted-foreground">Receive in-app notifications & alarms for scheduled follow-ups</p>
          </div>
          <Switch checked={pushNotifications} onCheckedChange={handleNotificationToggle} />
        </div>

        <div className="border-t border-border/50" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Notification Sound</p>
            <p className="text-xs text-muted-foreground">Play a sound when notifications arrive</p>
          </div>
          <Switch checked={soundEnabled} onCheckedChange={handleSoundToggle} />
        </div>

        {isSupported && (
          <>
            <div className="border-t border-border/50" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    {isSubscribed
                      ? "Receiving push notifications even when app is closed"
                      : "Get notified on your device even when the app is closed"}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant={isSubscribed ? "outline" : "default"}
                onClick={handlePushToggle}
                disabled={pushLoading}
                className="rounded-xl gap-2"
              >
                {pushLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Bell className="h-3.5 w-3.5" />
                )}
                {isSubscribed ? "Disable" : "Enable"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
