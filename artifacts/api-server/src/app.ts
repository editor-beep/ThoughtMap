import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import stripeWebhookRouter from "./routes/stripe-webhook.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : null;

// The Expo mobile artifact is served from `<repl-id>.expo.<cluster>.replit.dev`,
// a different origin from the api-server (`<repl-id>.<cluster>.replit.dev`).
// Cross-origin POSTs to /api/chat trigger a CORS preflight that must reflect
// the Expo origin when `credentials: true` is set. We always allow the
// configured Replit dev domains so mobile works in dev and prod alike.
const replitDevDomain = process.env.REPLIT_DEV_DOMAIN;
const replitExpoDomain = process.env.REPLIT_EXPO_DEV_DOMAIN;
const replitDomainAllowList = [replitDevDomain, replitExpoDomain]
  .filter((d): d is string => Boolean(d))
  .map((d) => `https://${d}`);

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true; // same-origin / non-browser request
  if (replitDomainAllowList.includes(origin)) return true;
  if (allowedOrigins?.includes(origin)) return true;
  // In production with no explicit list, fall through to the cors callback denial.
  return false;
};

app.use(
  cors({
    origin: (origin, cb) => {
      // Always reflect the Replit dev / Expo dev origin when present.
      if (isAllowedOrigin(origin)) return cb(null, true);
      // Dev fallback: when no explicit allowlist is set, reflect any origin.
      if (!allowedOrigins && process.env.NODE_ENV !== 'production') {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: true,
  }),
);
// Stripe webhook must receive raw body — register before express.json()
app.use("/api", stripeWebhookRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
