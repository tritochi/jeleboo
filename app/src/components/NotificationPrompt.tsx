// Jeleboo — notification permission prompt. Explained in plain language,
// shown only once installation allows it, and secondary to the reading.
//
// On Android/Chrome the Push API is available in a normal browser tab, so
// the toggle can be offered directly.
// On iOS Safari the Push API does not exist until the app is running in
// standalone mode (added to the home screen), so this component defers to
// the InstallPrompt's iOS instructions and never shows a broken or
// silently-failing toggle. The Add-to-Home-Screen requirement is disclosed
// in plain language, not technical jargon.

import { useState } from "react";
import { usePushSubscription } from "../hooks/usePushSubscription";

interface NotificationPromptProps {
    deviceId: string;
    enabled?: boolean;
}

export function NotificationPrompt({ deviceId, enabled = true }: NotificationPromptProps) {
    // Always call the hook, before any branch: the `enabled` flag makes it a
    // no-op when notifications are off, and calling hooks in a stable order on
    // every render avoids React hook-order errors.
    const push = usePushSubscription(deviceId, enabled);

    const [dismissed, setDismissed] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const isIos =
        typeof navigator !== "undefined" &&
        /iP(ad|od|hone)/i.test(navigator.userAgent) &&
        !(typeof window !== "undefined" && "standalone" in window);

    const isStandalone =
        typeof window !== "undefined" &&
        ("standalone" in window ? (window as any).standalone === true : false);

    // On iOS before standalone, PushManager doesn't exist — don't offer the
    // toggle at all. The InstallPrompt's iOS instructions handle the setup.
    if (isIos && !isStandalone) {
        if (dismissed) return null;
        return (
            <section className="notification-prompt notification-prompt--ios" aria-live="polite">
                <p className="notification-text">
                    To get alerts on this iPhone, add Jeleboo to your Home Screen first.
                    Then you can turn notifications on from the app itself.
                </p>
                <button
                    className="notification-dismiss"
                    onClick={() => setDismissed(true)}
                >
                    Got it
                </button>
            </section>
        );
    }

    if (!enabled) {
        return (
            <section
                className="notification-prompt notification-prompt--off"
                aria-live="polite"
            >
                <p className="notification-text">
                    Notifications are off. You can turn them on in the threshold
                    section below.
                </p>
            </section>
        );
    }

    if (dismissed) return null;

    if (push.permission === "denied") {
        return (
            <section className="notification-prompt notification-prompt--denied" aria-live="polite">
                <p className="notification-text">
                    Notifications are turned off. You can enable them in your
                    browser settings to get alerts when the air quality crosses
                    your threshold.
                </p>
                <button
                    className="notification-dismiss"
                    onClick={() => setDismissed(true)}
                >
                    Dismiss
                </button>
            </section>
        );
    }

    if (push.subscribed) {
        return (
            <section className="notification-prompt notification-prompt--active" aria-live="polite">
                <p className="notification-text">
                    You will get an alert when the air quality where you are
                    crosses your threshold.
                </p>
                <button
                    className="notification-dismiss"
                    onClick={() => setDismissed(true)}
                >
                    Done
                </button>
            </section>
        );
    }

    return (
        <details
            className="notification-prompt"
            open={expanded}
            onToggle={(e) => setExpanded((e.currentTarget as HTMLDetailsElement).open)}
        >
            <summary
                className="notification-summary"
                onClick={() => setExpanded((e) => !e)}
            >
                Get an alert when the air where you are crosses your threshold?
            </summary>
            <div className="notification-body">
                {push.error ? (
                    <p className="notification-error" role="alert">{push.error}</p>
                ) : null}
                <button
                    className="notification-allow"
                    onClick={() => {
                        setExpanded(true);
                        // The hook requests permission on mount; clicking here
                        // gives the user a clear affordance.
                        window.dispatchEvent(new Event("jeleboo:prompt-notification"));
                    }}
                >
                    Allow notifications
                </button>
                <button
                    className="notification-dismiss"
                    onClick={() => setDismissed(true)}
                >
                    Not now
                </button>
            </div>
        </details>
    );
}