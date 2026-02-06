# PTL Orders Webhook for Orders Tab Sync

Purpose: Push order updates from PTL to your system, then pull full order details and refresh the Orders tab.

## Event Types
- `order_created`
- `order_updated`
- `order_status_changed`

## Delivery
- HTTPS webhook (server-to-server `POST`)
- Signed requests (HMAC SHA-256)
- Retries with backoff on non-2xx responses

## Headers
```
Content-Type: application/json
X-FT-Event-Id: evt_01J5XQJ4Q9K7Y8Z5N1J2K3L4M5
X-FT-Timestamp: 2025-06-03T05:50:26Z
X-FT-Signature: t=2025-06-03T05:50:26Z, v1=base64(hmac_sha256(secret, "{timestamp}.{raw_body}"))
```

## Webhook Envelope
```json
{
  "event": "order_updated",
  "event_id": "evt_01J5XQJ4Q9K7Y8Z5N1J2K3L4M5",
  "occurred_at": "2025-06-03T05:50:26Z",
  "schema_version": "2025-06-01",
  "tenant_id": "TEN-12345",
  "data": {
    "reference_number": "ABHI03062025011115",
    "docket_number": null,
    "ptl_shipment_id": "PTL-000123",
    "order_status": "FAILED",
    "order_substatus": "FAILED",
    "updated_at": "2025-06-03T05:50:26Z"
  }
}
```

## How Orders Tab Sync Works
1. PTL emits `order_created`/`order_updated`/`order_status_changed`.
2. Your webhook receiver:
   - Validates signature and timestamp.
   - Checks idempotency using `event_id`.
   - Enqueues a fetch job keyed by `reference_number`.
3. Fetch job calls:
   - `GET /order/{reference_number}` (PTL Booking API).
4. Persist the API response in your Orders store.
5. Orders tab reads from your store and displays the latest data.

## Idempotency & Retries
- Treat `event_id` as a global unique key; ignore duplicates.
- Acknowledge with `2xx` only after the event is accepted for processing.
- Retry policy: exponential backoff (e.g., 1m, 5m, 15m, 1h, 6h) for up to 24h.

## Minimal Receiver Pseudocode
```pseudo
POST /webhooks/ptl/orders
  verify_signature(headers, raw_body)
  if too_old(headers.timestamp) => 400
  if event_id already seen => 200
  enqueue_fetch(reference_number)
  return 202

worker:
  order = GET /order/{reference_number}
  upsert_order(order)
```

## Notes
- Keep the webhook payload minimal; rely on `GET /order/{reference_number}` for full data.
- If `reference_number` is missing, return `400` and do not retry.
- If `GET` returns `404`, keep the event in a retry queue for a short period (eventual consistency).
