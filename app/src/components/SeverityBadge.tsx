// Jeleboo — severity badge. Renders colour AND label together; colour alone
// never conveys meaning, per design.md.

import React from "react";
import { classifyAqi, type Severity } from "../theme/severity";

interface SeverityBadgeProps {
    aqi: number;
    severity?: Severity;
    className?: string;
}

export function SeverityBadge({ aqi, severity, className }: SeverityBadgeProps) {
    const s = severity ?? classifyAqi(aqi);
    const style: React.CSSProperties = {
        color: `var(${s.cssVar})`,
    };

    return (
        <span className={`severity-badge ${className ?? ""}`.trim()} style={style} role="status">
            <span className="severity-dot" aria-hidden="true" />
            <span className="severity-label">{s.label}</span>
        </span>
    );
}