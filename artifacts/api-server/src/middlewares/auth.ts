import { getAuth, clerkClient } from "@clerk/express";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.userId = userId;
  next();
}

export async function isAdminUser(userId: string, storedEmail?: string): Promise<boolean> {
  if (ADMIN_EMAILS.length === 0) return false;
  if (storedEmail && ADMIN_EMAILS.includes(storedEmail.toLowerCase())) return true;
  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    return ADMIN_EMAILS.includes(email.toLowerCase());
  } catch {
    return false;
  }
}
