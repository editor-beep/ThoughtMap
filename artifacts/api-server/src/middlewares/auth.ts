import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthUser {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = header.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Server misconfiguration: missing JWT_SECRET" });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as { userId: string; email: string };
    req.user = { id: payload.userId, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
