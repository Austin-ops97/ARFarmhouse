import { readPublicFirebaseConfig } from "@/lib/firebase/env";

/**
 * Dynamic FCM service worker — inlines public Firebase config (safe for client bundles).
 */
export async function GET() {
  const cfg = readPublicFirebaseConfig();
  if (!cfg) {
    return new Response("// Firebase not configured", {
      status: 503,
      headers: { "Content-Type": "application/javascript" },
    });
  }

  const body = `
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js");

firebase.initializeApp(${JSON.stringify({
    apiKey: cfg.apiKey,
    authDomain: cfg.authDomain,
    projectId: cfg.projectId,
    storageBucket: cfg.storageBucket,
    messagingSenderId: cfg.messagingSenderId,
    appId: cfg.appId,
  })});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // Data-only FCM payloads: we display once here. Skip if a notification block slipped through.
  if (payload.notification) return;

  const title = payload.data?.title || "AR Farmhouse";
  const body = payload.data?.body || "";
  const deepLink = payload.data?.deepLink || payload.fcmOptions?.link || "/";
  const tag = payload.data?.notificationId || "ar-farmhouse";

  return self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag,
    data: { ...payload.data, deepLink },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const deepLink = event.notification?.data?.deepLink || "/";
  const url = deepLink.startsWith("http") ? deepLink : new URL(deepLink, self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
`.trim();

  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
