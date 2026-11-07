import { describe, expect, it } from "vitest";
import type { QueuePublisher } from "../src/infrai_queue.ts";
import { fanOutShipmentEvent } from "../src/shipment_fanout.ts";
import { fanoutRequestSchema } from "../src/shipment_event.ts";

describe("shipment subscriber fanout", () => {
  it("publishes one isolated message per subscriber with stable delivery keys", async () => {
    const published: Array<{ payload: unknown; key: string }> = [];
    const queue: QueuePublisher = {
      async publish(payload, key) {
        published.push({ payload, key });
      },
    };
    const request = fanoutRequestSchema.parse({
      event: {
        eventId: "27c31998-e840-4e5e-9d70-127ad7416679",
        shipmentId: "SHP-2048",
        type: "shipment.exception",
        occurredAt: "2026-09-18T08:30:00.000Z",
        category: "damage",
        actionRequired: true,
      },
      subscribers: [
        { subscriberId: "clinic-desk", channel: "operations" },
        { subscriberId: "patient-contact", channel: "email" },
      ],
    });

    const first = await fanOutShipmentEvent(request, queue);
    const second = await fanOutShipmentEvent(request, queue);

    expect(first.accepted).toBe(2);
    expect(published).toHaveLength(4);
    expect(first.deliveries.map((item) => item.idempotencyKey)).toEqual(
      second.deliveries.map((item) => item.idempotencyKey),
    );
    expect(new Set(first.deliveries.map((item) => item.idempotencyKey)).size).toBe(2);
    expect(published[0].payload).toMatchObject({
      subscriber: { subscriberId: "clinic-desk" },
      shipment: { type: "shipment.exception", actionRequired: true },
    });
  });
});
