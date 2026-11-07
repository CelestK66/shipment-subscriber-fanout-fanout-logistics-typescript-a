import { createHash } from "node:crypto";
import type { QueuePublisher } from "./infrai_queue.ts";
import type { FanoutRequest } from "./shipment_event.ts";

export type FanoutReceipt = {
  eventId: string;
  accepted: number;
  deliveries: Array<{ subscriberId: string; idempotencyKey: string }>;
};

function deliveryKey(eventId: string, subscriberId: string): string {
  return createHash("sha256")
    .update(`${eventId}:${subscriberId}`)
    .digest("hex");
}

export async function fanOutShipmentEvent(
  request: FanoutRequest,
  queue: QueuePublisher,
): Promise<FanoutReceipt> {
  const deliveries = request.subscribers.map((subscriber) => ({
    subscriberId: subscriber.subscriberId,
    idempotencyKey: deliveryKey(request.event.eventId, subscriber.subscriberId),
  }));

  await Promise.all(request.subscribers.map((subscriber, index) =>
    queue.publish(
      {
        kind: "logistics.subscriber_notification",
        subscriber,
        shipment: request.event,
      },
      deliveries[index].idempotencyKey,
    ),
  ));

  return {
    eventId: request.event.eventId,
    accepted: deliveries.length,
    deliveries,
  };
}
