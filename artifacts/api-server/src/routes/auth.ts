import { Router, type IRouter, type Request, type Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, usersTable, subscriptionsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function signJwt(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ userId, email }, secret, { expiresIn: "90d" });
}

router.post("/auth/google", async (req: Request, res: Response) => {
  const { idToken } = req.body as { idToken?: string };
  if (!idToken) {
    res.status(400).json({ error: "idToken is required" });
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const jwtSecret = process.env.JWT_SECRET;
  if (!clientId || !jwtSecret) {
    res.status(500).json({ error: "Server misconfiguration" });
    return;
  }

  let googleId: string;
  let email: string;
  let name: string | undefined;

  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      res.status(401).json({ error: "Invalid Google token" });
      return;
    }
    googleId = payload.sub;
    email = payload.email;
    name = payload.name;
  } catch {
    res.status(401).json({ error: "Failed to verify Google token" });
    return;
  }

  // Upsert user
  let user = (await db.select().from(usersTable).where(eq(usersTable.googleId, googleId)).limit(1))[0];
  if (!user) {
    const id = generateId();
    await db.insert(usersTable).values({ id, googleId, email, name });
    // Create a blank subscription record so there's always one row
    await db.insert(subscriptionsTable).values({ id: generateId(), userId: id });
    user = (await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1))[0]!;
  }

  const token = signJwt(user.id, user.email);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

router.get("/auth/me", requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const user = (await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1))[0];
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const subscription = (
    await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId)).limit(1)
  )[0];

  const isActive =
    subscription?.status === "active" &&
    (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > new Date());

  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    subscription: {
      status: subscription?.status ?? "none",
      isActive,
      requestsThisPeriod: subscription?.requestsThisPeriod ?? 0,
      monthlyRequestLimit: subscription?.monthlyRequestLimit ?? 0,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    },
  });
});

export default router;
