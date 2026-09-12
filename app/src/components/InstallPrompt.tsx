// Jeleboo — platform-aware install prompt, per architecture.md's Component Map.
//
// - Android/Chrome: captures the browser's native beforeinstallprompt event
//   (preventing its default mini-infobar) and offers Jeleboo's own button that
//   triggers the native prompt and handles the userChoice outcome.
// - iOS Safari: there is no programmatic trigger at all — shows manual
//   instructions (Share icon → Add to Home Screen), in plain language.
// - Other platforms / once installed: nothing is shown. Per design.md, if
//   install isn't supported the banner is hidden — no fake buttons.
//
// Always secondary and dismissible; never a modal that blocks the reading.

import { useEffect, useState } from "react";

interface NativeInstallPromptEvent {
    prompt(): { userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
}

function isIos(): boolean {
    return typeof navigator !== "undefined" && /iP(ad|od|hone)/i.test(navigator.userAgent);
}

function isStandaloneApp(): boolean {
    if (typeof window === "undefined") return false;
    try {
        const mm = (window as any).matchMedia;
        if (typeof mm === "function" && mm("(display-mode: standalone)").matches) {
            return true;
        }
    } catch {
        // fall through to the legacy check
    }
    return "standalone" in window;
}

export function InstallPrompt() {
    const [deferred, setDeferred] = useState<NativeInstallPromptEvent | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const [appInstalled, setAppInstalled] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        function handler(e: Event) {
            e.preventDefault();
            setDeferred(e as unknown as NativeInstallPromptEvent);
        }
        function onInstalled() {
            setAppInstalled(true);
            setDeferred(null);
        }
        window.addEventListener("beforeinstallprompt", handler);
        window.addEventListener("appinstalled", onInstalled);
        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
            window.removeEventListener("appinstalled", onInstalled);
        };
    }, []);

    async function trigger() {
        if (!deferred) return;
        setBusy(true);
        try {
            const { userChoice } = deferred.prompt();
            const { outcome } = await userChoice;
            if (outcome === "accepted") {
                setAppInstalled(true);
            }
        } catch {
            // User cancelled or the event expired — hide; they can re-open the
            // app to be prompted again by the platform.
        } finally {
            setBusy(false);
            setDismissed(true);
        }
    }

    if (appInstalled) return null;

    // iOS before standalone: no programmatic trigger — plain-language manual steps.
    if (isIos() && !isStandaloneApp()) {
        if (dismissed) return null;
        return (
            <section className="install-prompt install-prompt--ios" aria-live="polite">
                <p className="install-text">
                    To get alert notifications on this iPhone, first add Jeleboo
                    to your Home Screen: tap the <strong>Share</strong> icon in
                    Safari, then <strong>Add to Home Screen</strong>.
                </p>
                <button
                    className="install-dismiss"
                    onClick={() => setDismissed(true)}
                >
                    Got it
                </button>
            </section>
        );
    }

    // Android/Chrome: only show a real button when the platform actually
    // offered an install prompt (no fake affordance otherwise).
    if (deferred && !dismissed) {
        return (
            <section className="install-prompt" aria-live="polite">
                <p className="install-text">
                    Add Jeleboo to your Home Screen for faster access and
                    notification alerts.
                </p>
                <button
                    className="install-button"
                    disabled={busy}
                    onClick={trigger}
                >
                    {busy ? "Adding…" : "Add to Home Screen"}
                </button>
                <button
                    className="install-dismiss"
                    onClick={() => setDismissed(true)}
                >
                    Not now
                </button>
            </section>
        );
    }

    return null;
}