import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Clerk proxy — must be BEFORE body parsers (streams raw bytes)
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : null;

const replitDevDomain = process.env.REPLIT_DEV_DOMAIN;
const replitExpoDomain = process.env.REPLIT_EXPO_DEV_DOMAIN;
const replitDomainAllowList = [replitDevDomain, replitExpoDomain]
  .filter((d): d is string => Boolean(d))
  .map((d) => `https://${d}`);

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true;
  if (replitDomainAllowList.includes(origin)) return true;
  if (allowedOrigins?.includes(origin)) return true;
  return false;
};

app.use(
  cors({
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) return cb(null, true);
      if (!allowedOrigins && process.env.NODE_ENV !== "production") {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

export default app;
