import { Router, type IRouter } from "express";
import { clerkClient } from "@clerk/express";
import { storage } from "../storage";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/subscription/status", requireAuth, async (_req: any, res) => {
  return res.json({ subscribed: true, subscription: null, billingEnabled: false });
});

router.post("/subscription/checkout", requireAuth, async (_req: any, res) => {
  return res.status(410).json({ error: "Subscriptions are currently disabled." });
});

router.post("/subscription/portal", requireAuth, async (_req: any, res) => {
  return res.status(410).json({ error: "Billing portal is currently disabled." });
});

router.post("/user/sync", requireAuth, async (req: any, res) => {
  try {
    const clerkUser = await clerkClient.users.getUser(req.userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const user = await storage.upsertUser(req.userId, email);
    return res.json({ user: { id: user.id, email: user.email }, subscribed: true, billingEnabled: false });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
