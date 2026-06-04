import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set — Stripe sync skipped");
    return;
  }
  try {
    const { runMigrations } = await import("stripe-replit-sync");
    await runMigrations({ databaseUrl });
    logger.info("Stripe schema ready");

    const { getStripeSync } = await import("./stripeClient");
    const stripeSync = await getStripeSync();

    // Webhook setup is best-effort — don't let it block the backfill
    const domains = process.env.REPLIT_DOMAINS?.split(",") ?? [];
    const webhookBaseUrl = domains[0] ? `https://${domains[0]}` : null;
    if (webhookBaseUrl) {
      stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`)
        .then(() => logger.info("Stripe webhook configured"))
        .catch((err: any) => logger.warn({ err }, "Stripe webhook setup skipped"));
    }

    stripeSync.syncBackfill().catch((err: any) => {
      logger.error({ err }, "Stripe backfill error");
    });
  } catch (err) {
    logger.error({ err }, "Stripe init failed — continuing without Stripe");
  }
}

await initStripe();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
