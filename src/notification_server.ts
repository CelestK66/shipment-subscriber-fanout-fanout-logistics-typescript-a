import { createServer } from "node:http";
import { ZodError } from "zod";
import { createInfraiQueuePublisher, InfraiError } from "./infrai_queue.ts";
import { fanOutShipmentEvent } from "./shipment_fanout.ts";
import { fanoutRequestSchema } from "./shipment_event.ts";

const queue = createInfraiQueuePublisher();
const port = Number(process.env.PORT ?? 3000);

function sendJson(response: import("node:http").ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/shipment-events/fanout") {
    sendJson(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const input = fanoutRequestSchema.parse(await readJson(request));
    const receipt = await fanOutShipmentEvent(input, queue);
    sendJson(response, 202, receipt);
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      sendJson(response, 400, { error: "Invalid request body" });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      sendJson(response, status, { error: error.code, message: error.message });
      return;
    }
    sendJson(response, 502, { error: "Notification dispatch failed" });
  }
});

server.listen(port, () => {
  console.log(`Shipment fanout listening on http://localhost:${port}`);
});
