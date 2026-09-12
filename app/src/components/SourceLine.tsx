// Jeleboo — source + last-updated line. A number is never shown without
// provenance, per design.md.

interface SourceLineProps {
    source: string;
    recordedAt: string;
    lastUpdatedMinutesAgo: number;
    className?: string;
}

function formatAge(minutes: number): string {
    if (!Number.isFinite(minutes) || minutes < 0) return "just now";
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
}

export function SourceLine({ source, recordedAt, lastUpdatedMinutesAgo, className }: SourceLineProps) {
    const sourceLabel = source === "waqi" ? "WAQI" : source;
    const timeLabel = formatAge(lastUpdatedMinutesAgo);

    return (
        <p className={`source-line ${className ?? ""}`.trim()} aria-live="off">
            <span className="source-name">{sourceLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="source-time" title={recordedAt}>{timeLabel}</span>
        </p>
    );
}