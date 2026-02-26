import { Webhooks } from "@polar-sh/nextjs";
import { db } from "@repo/db";
import { logger } from "@repo/logger";

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onPayload: async (payload) => {
    logger.info("Polar webhook received", { type: payload.type });

    switch (payload.type) {
      case "subscription.created": {
        const { id, productId, customerId, status } = payload.data;
        await db.subscription.create({
          data: {
            polarSubscriptionId: id,
            polarProductId: productId,
            userId: customerId,
            status,
          },
        });
        logger.info("Subscription created", { subscriptionId: id });
        break;
      }

      case "subscription.updated": {
        const { id, status, currentPeriodEnd, cancelAtPeriodEnd } = payload.data;
        await db.subscription.update({
          where: { polarSubscriptionId: id },
          data: {
            status,
            currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
            cancelAtPeriodEnd: cancelAtPeriodEnd ?? false,
          },
        });
        logger.info("Subscription updated", { subscriptionId: id, status });
        break;
      }

      case "subscription.canceled": {
        const { id } = payload.data;
        await db.subscription.update({
          where: { polarSubscriptionId: id },
          data: { status: "canceled" },
        });
        logger.info("Subscription canceled", { subscriptionId: id });
        break;
      }

      default:
        logger.info("Unhandled webhook type", { type: payload.type });
    }
  },
});
