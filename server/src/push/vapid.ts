// Jeleboo — VAPID keys. Read from environment only; the private key is never
// committed. `web-push` is applied here so every caller shares one config.

import webPush from "web-push";

export interface VapidKeys {
    publicKey: string;
    privateKey: string;
    subject: string;
}

export function getVapidKeys(): VapidKeys {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT ?? process.env.VAPIDmailto ?? "mailto:ahmadtermizi1994@gmail.com";

    if (!publicKey || !privateKey) {
        throw new Error(
            "VAPID keys are not set. Generate them with web-push and add " +
            "VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to server/.env.local."
        );
    }

    webPush.setVapidDetails(subject, publicKey, privateKey);
    return { publicKey, privateKey, subject };
}