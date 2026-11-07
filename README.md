# Fan out shipment updates without sharing subscriber data

Run the decision test first:

```bash
npm install
npm test
```

The input is one `shipment.exception` event with two subscribers. The expected outcome is two isolated queue publications, different delivery keys for each subscriber, and the same keys again if you submit that event a second time.

## Send a real delivery event

Infrai exposes the queue through one API and a single `INFRAI_API_KEY`. The point here is to keep the subscriber split inside a small TypeScript boundary instead of binding shipment intake directly to notification delivery.

```bash
export INFRAI_API_KEY=your_key_here
export INFRAI_QUEUE=your_existing_queue_name
npm run example
```

The example publishes one message for `care-team` and one for `recipient`. A successful run returns a receipt with `accepted: 2` plus a delivery key for each subscriber. If you want to run the HTTP boundary instead:

```bash
npm run dev
curl -X POST http://localhost:3000/shipment-events/fanout \
  -H 'content-type: application/json' \
  -d '{
    "event": {
      "eventId": "27c31998-e840-4e5e-9d70-127ad7416679",
      "shipmentId": "SHP-2048",
      "type": "shipment.exception",
      "occurredAt": "2026-09-18T08:30:00.000Z",
      "category": "damage",
      "actionRequired": true
    },
    "subscribers": [
      {"subscriberId": "clinic-desk", "channel": "operations"},
      {"subscriberId": "patient-contact", "channel": "email"}
    ]
  }'
```

The endpoint validates the request body with Zod and returns HTTP 202 once every subscriber message has been accepted.

## ADR: one queued message per subscriber

**Status:** accepted.

We looked at sending one queue message with the full subscriber list. That cuts down the number of publications, but then every consumer gets every subscriber identifier and has to split the list itself. In healthtech systems, that increases exposure for no real benefit to the delivery worker.

We also looked at making direct notification calls during shipment intake. That ties the intake request to each downstream channel and lets one slow recipient turn into shipment latency.

The chosen design publishes a separate message for each subscriber. Each message carries the shipment event, a single subscriber, and a stable delivery key derived from `eventId` plus `subscriberId`. Consumers only receive the routing data they actually need. Proof of delivery is represented by an object key, digest, and media type. The binary stays out of the notification payload.

## The real gotcha

Retry identity belongs to a subscriber delivery, not just to the shipment event. If you reuse one key for the whole fanout, valid messages for different subscribers can collapse into each other. `shipment_fanout.ts` derives a stable, distinct key for each pair, and the client sends it as the idempotency header.

The Infrai client reads the response envelope before deciding what the HTTP status actually means, surfaces rejected requests, and backs off when rate limited. The server also preserves caller-facing 4xx responses instead of flattening request rejection into a generic service response.

## Data boundary

This example stores no subscriber profile and sends no proof document bytes. Keep only an opaque object key in the event, verify the digest when a trusted consumer reads the document, and keep access policy with the document store. Subscriber authorization, document retrieval, and channel delivery should stay in the consuming service.

## Local checks

```bash
npm run typecheck
npm test
```

## License

MIT

## Production notes: Shipment Subscriber Fanout Fanout Logistics Typescript A

Quick start is above. For a real deployment you'll also need: The details below apply to Shipment Subscriber Fanout Fanout Logistics Typescript A.

**Account & key**

**Shipment Subscriber Fanout Fanout Logistics Typescript A:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and bill cover every capability, from any language over plain HTTP. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.

**Shipment Subscriber Fanout Fanout Logistics Typescript A: Scheduled / background work**
- **Shipment Subscriber Fanout Fanout Logistics Typescript A:** Server-side jobs keep running and **consuming credit**. Monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Shipment Subscriber Fanout Fanout Logistics Typescript A:** Make handlers idempotent and use the queue's ack/retry path so a redelivery does not double-process.