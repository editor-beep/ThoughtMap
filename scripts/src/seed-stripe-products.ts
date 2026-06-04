/**
 * Creates the $10/month ThoughtMap subscription product in Stripe.
 * Run once per environment (dev / prod separately):
 *   pnpm --filter @workspace/scripts run seed-stripe-products
 */

const REPLIT_CONNECTORS_HOSTNAME = process.env.REPLIT_CONNECTORS_HOSTNAME;
const REPL_IDENTITY = process.env.REPL_IDENTITY;
const WEB_REPL_RENEWAL = process.env.WEB_REPL_RENEWAL;
const IS_PRODUCTION = process.env.REPLIT_DEPLOYMENT === "1";

const xReplitToken = REPL_IDENTITY
  ? "repl " + REPL_IDENTITY
  : WEB_REPL_RENEWAL
    ? "depl " + WEB_REPL_RENEWAL
    : null;

if (!REPLIT_CONNECTORS_HOSTNAME || !xReplitToken) {
  console.error("ERROR: Must be run inside the Replit environment (REPLIT_CONNECTORS_HOSTNAME / REPL_IDENTITY required).");
  process.exit(1);
}

const targetEnvironment = IS_PRODUCTION ? "production" : "development";

async function getStripeSecret(): Promise<string> {
  const url = new URL(`https://${REPLIT_CONNECTORS_HOSTNAME}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", "stripe");
  url.searchParams.set("environment", targetEnvironment);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-Replit-Token": xReplitToken!,
    },
  });

  if (!res.ok) throw new Error(`Connectors API error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  const secret = data.items?.[0]?.settings?.secret;
  if (!secret) throw new Error("Stripe secret key not found. Make sure the Stripe integration is connected.");
  return secret;
}

async function stripeRequest(secretKey: string, method: string, path: string, body?: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body
      ? Object.entries(body)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join("&")
      : undefined,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Stripe API error: ${err.error?.message ?? res.statusText}`);
  }
  return res.json();
}

async function main() {
  console.log(`\nSeeding Stripe products for ${targetEnvironment} environment...`);
  const secretKey = await getStripeSecret();

  const products = await stripeRequest(secretKey, "GET", "/products?active=true&limit=20");
  const existingProduct = products.data?.find(
    (p: any) => p.name === "ThoughtMap Pro" || p.metadata?.thoughtmap === "pro",
  );

  let productId: string;

  if (existingProduct) {
    productId = existingProduct.id;
    console.log(`✓ Product already exists: ${productId} (${existingProduct.name})`);
  } else {
    const product = await stripeRequest(secretKey, "POST", "/products", {
      name: "ThoughtMap Pro",
      description: "Unlock Navigator (AI Chat) and Cartographer AI features",
      "metadata[thoughtmap]": "pro",
    });
    productId = product.id;
    console.log(`✓ Created product: ${productId}`);
  }

  const prices = await stripeRequest(secretKey, "GET", `/prices?product=${productId}&active=true&type=recurring`);
  const existingPrice = prices.data?.find((p: any) => p.unit_amount === 1000 && p.currency === "usd");

  if (existingPrice) {
    console.log(`✓ Price already exists: ${existingPrice.id} ($10/month)`);
    console.log(`\nSet this as your STRIPE_MONTHLY_PRICE_ID env var:\n  ${existingPrice.id}`);
  } else {
    const price = await stripeRequest(secretKey, "POST", "/prices", {
      product: productId,
      unit_amount: "1000",
      currency: "usd",
      "recurring[interval]": "month",
    });
    console.log(`✓ Created price: ${price.id} ($10/month)`);
    console.log(`\nSet this as your STRIPE_MONTHLY_PRICE_ID env var:\n  ${price.id}`);
  }

  console.log("\nDone. Stripe products seeded successfully.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
