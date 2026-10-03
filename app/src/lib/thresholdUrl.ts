// Jeleboo — settings-portability URL (Card 24): `?threshold=NN` read on load
// pre-fills the threshold setter. It NEVER auto-saves — a share link must not
// silently overwrite a device's own alert — and the param is stripped from
// the address bar right after consumption so a later manual edit isn't
// re-applied on refresh. Threshold only; saved locations are blocked work.

import { MIN_THRESHOLD, MAX_THRESHOLD } from "../components/ThresholdSetter";

/** Parse `?threshold=`/`&threshold=` from a location.search string. Integer
 *  digits within the setter's own range, else null (absent/invalid share the
 *  same honest "nothing happened" path). */
export function readThresholdParam(search: string): number | null {
    const match = /[?&]threshold=([\d.]+)/.exec(search);
    if (!match) return null;
    if (!/^\d+$/.test(match[1])) return null; // fractional/malformed → ignore whole value
    const n = Number(match[1]);
    if (!Number.isInteger(n) || n < MIN_THRESHOLD || n > MAX_THRESHOLD) return null;
    return n;
}

/** The href with `threshold` removed (other params and the hash survive). */
export function consumeThresholdParam(href: string): string {
    try {
        const url = new URL(href);
        url.searchParams.delete("threshold");
        return url.toString();
    } catch {
        return href; // unparseable input — never break navigation over it
    }
}
