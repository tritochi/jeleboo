// Jeleboo — push subscription hook. Requests permission and registers a
// service-worker push subscription, then POSTs it to the device.
// On iOS Safari the Push API doesn't exist until the app is running in
// standalone mode, so this hook reports `unsupported` rather than failing
// silently.

import { useEffect, useState } from "react";

const BACKEND = (import.meta.env.VITE_BACKEND_URL as string) ?? "";
const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string) ?? "";

export interface PushState {
    supported: boolean;
    permission: NotificationPermission | "unsupported" | "off";
    subscribed: boolean;
    error: string | null;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(b64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
    return output;
}

export function usePushSubscription(deviceId: string, enabled = true) {
    const [state, setState] = useState<PushState>({
        supported: "serviceWorker" in navigator && "PushManager" in window && "Notification" in window,
        permission: "unsupported",
        subscribed: false,
        error: null,
    });

    useEffect(() => {
        if (!enabled) {
            setState({ supported: state.supported, permission: "off", subscribed: false, error: null });
            return;
        }
        if (!state.supported) return;

        let cancelled = false;

        async function subscribe() {
            try {
                const permission = await Notification.requestPermission();
                if (cancelled) return;
                if (permission !== "granted") {
                    setState({ supported: true, permission, subscribed: false, error: null });
                    return;
                }

                const registration = await navigator.serviceWorker.ready;
                const existing = await registration.pushManager.getSubscription();
                if (existing) {
                    // Already subscribed — make sure the backend has it.
                    await postSubscription(deviceId, existing);
                    if (!cancelled) setState({ supported: true, permission, subscribed: true, error: null });
                    return;
                }

                if (!VAPID_PUBLIC_KEY) {
                    if (!cancelled) {
                        setState({
                            supported: true,
                            permission,
                            subscribed: false,
                            error: "Push is not configured on this device.",
                        });
                    }
                    return;
                }

                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
                });
                await postSubscription(deviceId, subscription);
                if (!cancelled) setState({ supported: true, permission, subscribed: true, error: null });
            } catch (err) {
                if (cancelled) return;
                setState({
                    supported: true,
                    permission: state.permission,
                    subscribed: false,
                    error: err instanceof Error ? err.message : "Could not subscribe to push.",
                });
            }
        }

        // Check current permission without prompting.
        if ("Notification" in navigator) {
            setState((s) => ({ ...s, permission: Notification.permission }));
        }

        subscribe();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deviceId, state.supported, enabled]);

    return state;
}

async function postSubscription(deviceId: string, subscription: PushSubscription) {
    const subscriptionJSON = subscription.toJSON();
    await fetch(`${BACKEND}/api/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deviceId, push_subscription: subscriptionJSON }),
    });
}