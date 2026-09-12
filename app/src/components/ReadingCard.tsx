// Jeleboo — first-screen reading card. The reading is the clear focus of the
// first screen: this is a check-and-go app, not a browse app. Calm, low-density,
// generous whitespace, monospace numbers. No clinical tone.

import { SeverityBadge } from "./SeverityBadge";
import { SourceLine } from "./SourceLine";
import { classifyAqi } from "../theme/severity";
import type { Reading } from "../hooks/useReading";

interface ReadingCardProps {
    reading: Reading;
}

export function ReadingCard({ reading }: ReadingCardProps) {
    const severity = classifyAqi(reading.aqi_value);

    return (
        <section className="reading-card" aria-live="polite">
            <div className="reading-row">
                <div className="reading-value" style={{ color: `var(${severity.cssVar})` }}>
                    <span className="reading-number" style={{ color: `var(${severity.cssVar})` }}>
                        {Math.round(reading.aqi_value)}
                    </span>
                </div>
                <SeverityBadge aqi={reading.aqi_value} severity={severity} />
            </div>

            <SourceLine
                source={reading.source}
                recordedAt={reading.recorded_at}
                lastUpdatedMinutesAgo={reading.last_updated_minutes_ago}
            />

            <p className="reading-station">
                {reading.station_name}
                {reading.via === "city" ? (
                    <span className="reading-via"> · via nearby city station</span>
                ) : null}
            </p>
        </section>
    );
}

export function LoadingCard() {
    return (
        <section className="reading-card reading-card--loading" aria-busy="true">
            <div className="skeleton skeleton-number" />
            <div className="skeleton skeleton-badge" />
            <div className="skeleton skeleton-source" />
        </section>
    );
}

interface ErrorCardProps {
    message: string;
    lastReading: Reading | null;
    onRetry?: () => void;
}

export function ErrorCard({ message, lastReading, onRetry }: ErrorCardProps) {
    return (
        <section className="reading-card reading-card--error" role="alert">
            {lastReading ? (
                <>
                    <div className="reading-row">
                        <div className="reading-value">
                            <span className="reading-number">
                                {Math.round(lastReading.aqi_value)}
                            </span>
                        </div>
                        <SeverityBadge aqi={lastReading.aqi_value} />
                    </div>
                    <SourceLine
                        source={lastReading.source}
                        recordedAt={lastReading.recorded_at}
                        lastUpdatedMinutesAgo={lastReading.last_updated_minutes_ago}
                    />
                    <p className="reading-stale">
                        Stale — last known reading. {message}
                    </p>
                </>
            ) : (
                <p className="reading-error">{message}</p>
            )}
            {onRetry ? (
                <button className="retry-button" onClick={onRetry}>
                    Retry
                </button>
            ) : null}
        </section>
    );
}