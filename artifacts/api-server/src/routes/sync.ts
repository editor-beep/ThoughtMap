import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, userSnapshotsTable } from "@workspace/db";
import { requireSubscription } from "../middlewares/subscription.js";

const router: IRouter = Router();

const MAX_SNAPSHOT_BYTES = 10 * 1024 * 1024; // 10 MB

router.get("/sync", requireSubscription, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const snapshot = (
    await db.select().from(userSnapshotsTable).where(eq(userSnapshotsTable.userId, userId)).limit(1)
  )[0];

  if (!snapshot) {
    res.json({ data: null, updatedAt: null });
    return;
  }

  res.json({ data: snapshot.data, updatedAt: snapshot.updatedAt });
});

router.put("/sync", requireSubscription, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { data } = req.body as { data?: unknown };

  if (data === undefined || data === null) {
    res.status(400).json({ error: "data is required" });
    return;
  }

  const bodySize = Buffer.byteLength(JSON.stringify(data));
  if (bodySize > MAX_SNAPSHOT_BYTES) {
    res.status(413).json({ error: "Snapshot too large" });
    return;
  }

  const now = new Date();
  await db
    .insert(userSnapshotsTable)
    .values({ userId, data, updatedAt: now })
    .onConflictDoUpdate({
      target: userSnapshotsTable.userId,
      set: { data, updatedAt: now },
    });

  res.json({ updatedAt: now });
});

export default router;
