import Stripe from "stripe";
import { getUncachableStripeClient } from "./stripeClient";
import { storage } from "./storage";
import { logger } from "./lib/logger";

function subEndDate(sub: Stripe.Subscription): Date | null {
  const epoch = (sub as unknown as Record<string, unknown>)["current_period_end"];
  return typeof epoch === "number" ? new Date(epoch * 1000) : null;
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
          "Ensure webhook route is registered BEFORE app.use(express.json()).",
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripe = await getUncachableStripeClient();

    let event: Stripe.Event;
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      logger.warn("STRIPE_WEBHOOK_SECRET not set — skipping signature verification");
      event = JSON.parse(payload.toString()) as Stripe.Event;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string | null;
        const subscriptionId = session.subscription as string | null;
        if (customerId) {
          await storage.updateSubscriptionStatusByCustomerId(
            customerId,
            "active",
            subscriptionId ?? undefined,
          );
          logger.info({ customerId, subscriptionId }, "Subscription activated via checkout");
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const endDate = sub.status === "active" ? null : subEndDate(sub);
        await storage.updateSubscriptionStatusByCustomerId(
          customerId,
          sub.status,
          sub.id,
          endDate,
        );
        logger.info({ customerId, status: sub.status }, "Subscription updated");
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        await storage.updateSubscriptionStatusByCustomerId(
          customerId,
          "canceled",
          sub.id,
          subEndDate(sub),
        );
        logger.info({ customerId }, "Subscription canceled");
        break;
      }

      default:
        break;
    }
  }
}
