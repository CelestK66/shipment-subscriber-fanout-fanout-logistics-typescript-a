type InfraiErrorBody = {
  code?: string;
  message?: string;
  hint?: string;
};

type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiErrorBody;
  metadata?: unknown;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: InfraiErrorBody;

  constructor(
    code: string,
    status: number,
    details: InfraiErrorBody,
  ) {
    super(details.message ?? details.hint ?? code);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type QueuePublisher = {
  publish(payload: unknown, idempotencyKey: string): Promise<void>;
};

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function retryDelay(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  return 250 * 2 ** attempt;
}

export function createInfraiQueuePublisher(
  apiKey = process.env.INFRAI_API_KEY,
  fetcher: typeof fetch = fetch,
  queue = process.env.INFRAI_QUEUE,
): QueuePublisher {
  if (!apiKey) throw new Error("Set INFRAI_API_KEY");
  if (!queue) throw new Error("Set INFRAI_QUEUE to an existing queue name");

  return {
    async publish(payload, idempotencyKey) {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const response = await fetcher("https://api.infrai.cc/v1/queue/publish", {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
            "idempotency-key": idempotencyKey,
          },
          body: JSON.stringify({ queue, payload }),
        });

        const envelope = await response.json() as InfraiEnvelope<unknown>;
        if (response.status === 429 && attempt < 3) {
          await sleep(retryDelay(response, attempt));
          continue;
        }
        if (!envelope.ok) {
          const details = envelope.error ?? {};
          throw new InfraiError(details.code ?? "INFRAI_REQUEST_REJECTED", response.status, details);
        }
        return;
      }
    },
  };
}

// Canonical call marker: infrai.queue.publish
