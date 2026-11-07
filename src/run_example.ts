import { createInfraiQueuePublisher } from "./infrai_queue.ts";
import { fanOutShipmentEvent } from "./shipment_fanout.ts";
import { fanoutRequestSchema } from "./shipment_event.ts";

const input = fanoutRequestSchema.parse({
  event: {
    eventId: "27c31998-e840-4e5e-9d70-127ad7416679",
    shipmentId: "SHP-2048",
    type: "shipment.delivered",
    occurredAt: "2026-09-18T08:30:00.000Z",
    proofOfDelivery: {
      objectKey: "pod/SHP-2048/signature.pdf",
      sha256: "7f83b1657ff1fc53b92dc18148a1d65dfa13514c3224d7e65c4b11b7e2b0d33a",
      mediaType: "application/pdf",
    },
  },
  subscribers: [
    { subscriberId: "care-team", channel: "operations" },
    { subscriberId: "recipient", channel: "email" },
  ],
});

const receipt = await fanOutShipmentEvent(input, createInfraiQueuePublisher());
console.log(JSON.stringify(receipt, null, 2));
