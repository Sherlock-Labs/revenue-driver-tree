import { type Request, type Response } from "express";
import { Webhook } from "svix";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";

interface ClerkWebhookEvent {
  type: string;
  data: Record<string, unknown>;
}

interface ClerkUserData {
  id: string;
  email_addresses: Array<{ email_address: string }>;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
}

/**
 * Handle Clerk webhook events.
 * - user.created: Create user record in our DB
 * - user.updated: Update user record
 * - user.deleted: Delete user record
 *
 * Uses Svix for signature verification and processedEvents for idempotency.
 */
export async function handleClerkWebhook(req: Request, res: Response): Promise<void> {
  const webhookSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SIGNING_SECRET is not set");
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  // Verify the webhook signature
  const svixId = req.headers["svix-id"] as string | undefined;
  const svixTimestamp = req.headers["svix-timestamp"] as string | undefined;
  const svixSignature = req.headers["svix-signature"] as string | undefined;

  if (!svixId || !svixTimestamp || !svixSignature) {
    res.status(400).json({ error: "Missing Svix headers" });
    return;
  }

  let event: ClerkWebhookEvent;
  try {
    const wh = new Webhook(webhookSecret);
    const body = req.body instanceof Buffer ? req.body.toString() : JSON.stringify(req.body);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  // Idempotency check
  const eventId = svixId;
  const existing = await db
    .select()
    .from(schema.processedEvents)
    .where(eq(schema.processedEvents.eventId, eventId))
    .limit(1);

  if (existing.length > 0) {
    // Already processed — return 200 to prevent retries
    res.status(200).json({ received: true, deduplicated: true });
    return;
  }

  try {
    const userData = event.data as unknown as ClerkUserData;

    switch (event.type) {
      case "user.created": {
        const email = userData.email_addresses?.[0]?.email_address ?? "";
        const name = [userData.first_name, userData.last_name].filter(Boolean).join(" ") || null;

        await db.insert(schema.users).values({
          clerkUserId: userData.id,
          email,
          name,
          avatarUrl: userData.image_url ?? null,
        });
        break;
      }

      case "user.updated": {
        const email = userData.email_addresses?.[0]?.email_address ?? "";
        const name = [userData.first_name, userData.last_name].filter(Boolean).join(" ") || null;

        await db
          .update(schema.users)
          .set({
            email,
            name,
            avatarUrl: userData.image_url ?? null,
            updatedAt: new Date(),
          })
          .where(eq(schema.users.clerkUserId, userData.id));
        break;
      }

      case "user.deleted": {
        await db.delete(schema.users).where(eq(schema.users.clerkUserId, userData.id));
        break;
      }

      default:
        // Unhandled event type — acknowledge but don't process
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    // Mark event as processed for idempotency
    await db.insert(schema.processedEvents).values({
      eventId,
      source: "clerk",
    });

    res.status(200).json({ received: true });
  } catch (err) {
    console.error(`Error processing webhook event ${event.type}:`, err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}
