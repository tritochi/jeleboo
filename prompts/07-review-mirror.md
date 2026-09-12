# Prompt 07 — Review Mirror

Use this when the current build version exists.

```text
Read project-brief.md, design.md, build-blueprint.md, build-status.md, and the latest implemented work card.

Review the current app/site against the brief, design, and blueprint.

Check:
1. Does it match the project goal?
2. Does it obey the confirmed build-shape guardrails?
3. Does the main user flow work?
4. Is it readable on mobile width?
5. Does it follow design.md?
6. Are there fake claims, fake logos, fake stats, or lorem ipsum?
7. Did it copy any external brand identity, logo, testimonials, or images?
8. Is there one clear primary action?
9. For a content-led site: are the content, sections, primary action, links, and responsive layout correct?
10. For a browser-local tool: does add/update/delete/save/refresh work?
11. For a Live-Data App: is the reading genuinely live (not sample/hardcoded), does the source + last-updated time always show, does the threshold save and actually trigger a notification, and does it degrade gracefully (last-known value, not a blank screen) when the source is slow or down?
12. For an Accounts App: can one logged-in user ever see or change another user's data by guessing or editing an ID? Does logout actually clear the session?
13. For a Commerce App: is the payment processor genuinely in test mode unless a deliberate go-live step was taken, and does a completed order actually require a confirmed payment rather than just a submitted form?

Return:
- PASS / NEEDS FIX / REDRAFT
- top 1–3 issues
- the single smallest useful fix

Do not redesign the whole project.
```

## After the final review

When this is the final review and the result is PASS, do not stop at "PASS." Move straight into shipping:

- Update `build-status.md` to the Ship stage.
- Hand off to `prompts/08-github-vercel-proof.md`.
- Guide the learner through GitHub push, Vercel deploy, and proof submission.
- If GitHub or Vercel is blocked, use the fallback proof options in `prompts/08-github-vercel-proof.md`.
