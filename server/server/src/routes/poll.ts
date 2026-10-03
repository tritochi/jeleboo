// Jeleboo — POST /api/jobs/poll/run. Manual trigger for the poll job.
// Card 04/05/08 promised this endpoint for on-demand verification and for a
// host scheduler to call; it was documented but never actually created or
// mounted — this file fixes that gap so the deployed backend can prove a
// threshold crossing end to end.

import { Router } from "express";
import { triggerPoll } from "../jobs/poll";

const router = Router();

router.post("/jobs/poll/run", async (_req, res) => {
    try {
        const result = await triggerPoll();
        res.json({ ok: true, ...result });
    } catch (err) {
        // Never echo the token or any upstream body.
        res.status(500).json({
            ok: false,
            error: err instanceof Error ? err.message : "Poll job failed.",
        });
    }
});

export default router;