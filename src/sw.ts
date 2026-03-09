/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope;

// Precache assets injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);

// Handle push notifications
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "Follow-up Reminder";
  const options = {
    body: data.body || "You have a pending follow-up",
    icon: data.icon || "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
    vibrate: [200, 100, 200],
    tag: data.tag || "followup-reminder",
    renotify: true,
    data: { url: data.url || "/follow-ups" },
  } as any;

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
