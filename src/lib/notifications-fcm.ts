"use client";

import { getMessaging, getToken, deleteToken, onMessage, Messaging } from "firebase/messaging";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { app } from "@/lib/firebase"; // your initialized app
import { toast } from "@/hooks/use-toast"; // or pass a toaster in

let cachedRegistration: ServiceWorkerRegistration | null = null;
let cachedMessaging: Messaging | null = null;

export async function ensureSw(): Promise<ServiceWorkerRegistration> {
  if (cachedRegistration) return cachedRegistration;
  if (!("serviceWorker" in navigator)) throw new Error("Service worker not supported");
  cachedRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  await navigator.serviceWorker.ready;
  return cachedRegistration!;
}

function messaging(): Messaging {
  if (cachedMessaging) return cachedMessaging;
  cachedMessaging = getMessaging(app);
  return cachedMessaging!;
}

export async function subscribeFCM(userId: string, timezone: string) {
  if (!("Notification" in window)) throw new Error("Notifications not supported");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Permission not granted");

  const registration = await ensureSw();
  const token = await getToken(messaging(), {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) throw new Error("Failed to get FCM token");

  // store token under user for multi-device support
  await setDoc(
    doc(firestore, "users", userId, "devices", token),
    {
      token,
      tz: timezone,
      ua: navigator.userAgent,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    },
    { merge: true }
  );

  // optional: foreground preview
  onMessage(messaging(), (payload) => {
    const t = payload?.data?.title || "Centsei";
    const b = payload?.data?.body || "You have a new reminder.";
    toast?.({ title: t, description: b });
  });

  return token;
}

export async function unsubscribeFCM(userId: string, token?: string) {
  try {
    const activeMessaging = messaging();
    if (token) {
        await deleteDoc(doc(firestore, "users", userId, "devices", token));
    }
    await deleteToken(activeMessaging);
  } catch (_) {}
}
