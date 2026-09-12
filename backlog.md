# Backlog

Short entries only — a sentence or two each. See `prompts/09-iterate.md` for how items get promoted into Work Cards.

Format per item: `- [size guess] Description (how it was noticed)`

## Open

- No items yet — this fills up once v1 has shipped and real usage starts surfacing rough edges.

## Promoted

- [S] → `work-cards/09-severity-scale-split.md` — split the app's severity system into the official 6-band US EPA/WAQI scale (`app/src/theme/severity.ts` and `app/src/styles.css` still merge USG/Unhealthy/Very Unhealthy into one "Unhealthy" band up to 300), giving each band a `--sev-*` pair per `design.md`; also point the AQI number at the band's dark text color instead of the bright accent (`--sev-moderate` is currently `#F9A825`, ~1.85:1 on the app background) (noticed during the `design.md` revision — see Decisions made in `build-status.md`)
