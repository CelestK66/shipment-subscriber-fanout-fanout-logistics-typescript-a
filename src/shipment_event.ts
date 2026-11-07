import { z } from "zod";

const proofOfDeliverySchema = z.object({
  objectKey: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  mediaType: z.string().min(1),
});

const baseEventSchema = z.object({
  eventId: z.string().uuid(),
  shipmentId: z.string().min(1),
  occurredAt: z.string().datetime(),
});

const shipmentEventSchema = z.discriminatedUnion("type", [
  baseEventSchema.extend({
    type: z.literal("shipment.in_transit"),
    location: z.string().min(1),
  }),
  baseEventSchema.extend({
    type: z.literal("shipment.delivered"),
    proofOfDelivery: proofOfDeliverySchema,
  }),
  baseEventSchema.extend({
    type: z.literal("shipment.exception"),
    category: z.enum(["address", "customs", "damage", "weather"]),
    actionRequired: z.boolean(),
  }),
]);

export const fanoutRequestSchema = z.object({
  event: shipmentEventSchema,
  subscribers: z.array(z.object({
    subscriberId: z.string().min(1),
    channel: z.enum(["webhook", "email", "operations"]),
  })).min(1).max(100),
});

export type FanoutRequest = z.infer<typeof fanoutRequestSchema>;
export type ShipmentEvent = z.infer<typeof shipmentEventSchema>;
