// Jeleboo — push dispatch. Called from the poll job on every crossing.
// Handles expiration/invalid subscription gracefully: a bad subscription is
// reported, never crashes the poll job.

import webPush from "web-push";
import { getVapidKeys } from "./vapid";
import type { Device } from "../db/queries";

export interface PushPayload {
    title: string;
    body: string;
    tag: string;
    data?: Record<string, unknown>;
}

export interface SendSuccess {
    ok: true;
}

export interface SendFailure {
    ok: false;
    reason: "expired" | "invalid" | "failed";
    message: string;
}

export type SendResult = SendSuccess | SendFailure;

/**
 * Send a Web Push notification to a device's subscription.
 * The subscription is stored as JSON on the device row.
 */
export async function sendPush(device: Device, payload: PushPayload): Promise<SendResult> {
    getVapidKeys();

    let subscription: any;
    try {
        subscription = JSON.parse(device.push_subscription);
    } catch {
        return { ok: false, reason: "invalid", message: "Device push subscription is not valid JSON." };
    }

    if (!subscription || !subscription.endpoint || !subscription.keys) {
        return { ok: false, reason: "invalid", message: "Device push subscription is missing endpoint or keys." };
    }

    const body = JSON.stringify(payload);
    try {
        await webPush.sendNotification(subscription, body, {
            vapidDetails: {
                publicKey: process.env.VAPID_PUBLIC_KEY!,
                privateKey: process.env.VAPID_PRIVATE_KEY!,
                subject: process.env.VAPID_SUBJECT ?? process.env.VAPIDmailto ?? "mailto:ahmadtermizi1994@gmail.com",
            },
            timeout: 15_000,
        });
        return { ok: true };
    } catch (err: any) {
        const message = err?.message ?? String(err);
        // A 410 Gone or a "subscription has expired" error means the push
        // subscription is dead — the device should be re-subscribed.
        const isExpired = err?.statusCode === 410 ||
            /expired|invalid subscription|not found/i.test(message);
        return {
            ok: false,
            reason: isExpired ? "expired" : "failed",
            message,
        };
    }
}

/**
 * Build the plain-language notification payload for a crossing.
 */
export function crossingPayload(readingValue: number, stationName: string, state: "crossed_above" | "cleared"): PushPayload {
    if (state === "crossed_above") {
        return {
            title: "Air quality crossed your threshold",
            body: `AQI ${Math.round(readingValue)} at ${stationName} — above your alert level.`,
            tag: "jeleboo-crossing",
            data: { readingValue, stationName, state },
        };
    }
    return {
        title: "Air quality dropped back down",
        body: `AQI ${Math.round(readingValue)} at ${stationName} — back below your alert level.`,
        tag: "jeleboo-cleared",
        data: { readingValue, stationName, state },
    };
}