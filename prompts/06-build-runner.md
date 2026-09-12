# Prompt 06 — Build Runner

Use this after planning is complete.

Paste this into the implementation model:

```text
Read build-status.md, build-blueprint.md, design.md, and the current work card listed in build-status.md.

Implement only the current work card.

Rules:
- Follow design.md. If design.md is missing or vague, stop and ask me to complete the Design phase first.
- Do not copy external brand identity, logos, testimonials, stats, or images.
- Do not start the next work card.
- Do not change the project scope.
- Do not add backend, auth, database, API, payment, or secrets unless the blueprint explicitly allows it.
- Apply the guardrails for the confirmed build shape.
- Run the verification steps from the work card.
- After finishing, update build-status.md with what changed, what passed, what failed, and the next work card.
- Stop and wait for my approval.
```

Recommended model strategy:

- planning: strongest available model;
- implementation: cheaper/faster model is okay because the files are now the source of truth.

## Required output after every Work Card

After completing a Work Card, do not just stop. Output this learner checkpoint:

### Work Card NN complete

**What changed**
- Briefly list what was created or updated.

**Local preview**
- If the dev server is not running, tell the learner to run:
  `npm run dev`
- Tell them to open the localhost URL shown in the terminal, usually:
  `http://localhost:5173`
- If the dev server is already running, tell them to refresh the browser.
- If this Work Card has no meaningful browser preview yet, say so clearly and explain what command/file check proves it passed.

**Test before moving on**
- Give 2 to 5 specific tests for this Work Card.
- The tests must match the feature or setup completed in this card.
- Do not say only "check that it works."

**Choose next action**
- If all tests pass, say: `continue`
- If anything fails, say: `fix` and paste the error or describe what you see.

Do not start the next Work Card until the learner chooses `continue`.

## Required output after the final Work Card

When all Work Cards are complete, output:

### All Work Cards are complete

**Final localhost review**
- Run or refresh localhost.
- Test the full main flow from start to finish.
- Check mobile width.
- Check there is no red error screen.
- Check there are no pasted secrets/API keys.
- Check there are no fake claims, fake stats, fake logos, or fake testimonials.
- Check the main action works.
- For browser-local tools: add an item, update it, delete an item, then add one and refresh the browser to confirm it stays.

**Next: GitHub**
Ask: "Do you want me to guide you through pushing to GitHub now?"
- If yes, tell the learner to reply: `GitHub`
- If blocked, tell them to paste the error.

Update `build-status.md` to the Check stage. Do not wait for the learner to ask "what's next?" Move straight into `prompts/07-review-mirror.md`, then use `prompts/08-github-vercel-proof.md` only after the review passes.
