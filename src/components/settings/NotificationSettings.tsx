import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";

export default function NotificationSettings() {
  const [pushNotifications, setPushNotifications] = useState(() => {
    return localStorage.getItem("followup_notifications") !== "false";
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("notification_sound") !== "false";
  });

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
            <p className="text-xs text-muted-foreground">Receive push notifications & alarms for scheduled follow-ups</p>
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
      </div>
    </div>
  );
}
