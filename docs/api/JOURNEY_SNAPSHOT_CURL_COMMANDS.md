# Journey Snapshot API Curl Commands

## Endpoint
`GET /journey-snapshot/v1/journeys/count`

## Query Parameters
- `page=1`
- `size=20`
- `entity_type=CNR`
- `journey_status=IN_TRANSIT`
- `start_time_utc={start_date}` (format: `YYYY-MM-DD+HH:MM:SS`)
- `end_time_utc={end_date}` (format: `YYYY-MM-DD+HH:MM:SS`)
- `journey_direction=outbound`
- `journey_stop_type=source`
- `sort[sort_by]=created_at`
- `sort[sort_by_order]=DESC`
- `milestones[]=PLANNED`
- `milestones[]=BEFORE_ORIGIN`
- `milestones[]=AT_ORIGIN`
- `milestones[]=IN_TRANSIT`
- `milestones[]=AT_DESTINATION`
- `milestones[]=IN_RETURN`
- `milestones[]=AFTER_DESTINATION`
- `milestones[]=CLOSED`
- `active_alerts[]=long_stoppage`
- `active_alerts[]=route_deviation`
- `active_alerts[]=eway_bill`
- `active_analytics[]=delay_in_minutes`
- `active_analytics[]=expected_arrival`

---

## Option 1: Using ftTmsFetch (with all extra headers)

This matches what `ftTmsFetch` sends - includes all headers that `ftTmsFetch` adds automatically.

### Production (Direct API)

```bash
curl --location 'https://api.freighttiger.com/journey-snapshot/v1/journeys/count?page=1&size=20&entity_type=CNR&journey_status=IN_TRANSIT&start_time_utc=2025-01-15+18:30:00&end_time_utc=2026-01-22+18:29:59&journey_direction=outbound&journey_stop_type=source&sort[sort_by]=created_at&sort[sort_by_order]=DESC&milestones[]=PLANNED&milestones[]=BEFORE_ORIGIN&milestones[]=AT_ORIGIN&milestones[]=IN_TRANSIT&milestones[]=AT_DESTINATION&milestones[]=IN_RETURN&milestones[]=AFTER_DESTINATION&milestones[]=CLOSED&active_alerts[]=long_stoppage&active_alerts[]=route_deviation&active_alerts[]=eway_bill&active_analytics[]=delay_in_minutes&active_analytics[]=expected_arrival' \
--header 'Authorization: Bearer <token>' \
--header 'token: <token>' \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--header 'X-FT-ORGID: <org_id>' \
--header 'X-FT-USERID: <user_id>' \
--header 'X-Org-Id: <org_id>' \
--header 'X-Branch-Id: <branch_id>' \
--header 'X-User-Role: <user_role>' \
--header 'X-User-Id: <user_id>'
```

### Development (Via Proxy)

```bash
curl --location 'http://localhost:5173/__ft_tms/journey-snapshot/v1/journeys/count?page=1&size=20&entity_type=CNR&journey_status=IN_TRANSIT&start_time_utc=2025-01-15+18:30:00&end_time_utc=2026-01-22+18:29:59&journey_direction=outbound&journey_stop_type=source&sort[sort_by]=created_at&sort[sort_by_order]=DESC&milestones[]=PLANNED&milestones[]=BEFORE_ORIGIN&milestones[]=AT_ORIGIN&milestones[]=IN_TRANSIT&milestones[]=AT_DESTINATION&milestones[]=IN_RETURN&milestones[]=AFTER_DESTINATION&milestones[]=CLOSED&active_alerts[]=long_stoppage&active_alerts[]=route_deviation&active_alerts[]=eway_bill&active_analytics[]=delay_in_minutes&active_analytics[]=expected_arrival' \
--header 'Authorization: Bearer <token>' \
--header 'token: <token>' \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--header 'X-FT-ORGID: <org_id>' \
--header 'X-FT-USERID: <user_id>' \
--header 'X-Org-Id: <org_id>' \
--header 'X-Branch-Id: <branch_id>' \
--header 'X-User-Role: <user_role>' \
--header 'X-User-Id: <user_id>'
```

---

## Option 2: Bearer-only with X-FT-ORGID/X-FT-USERID (no token header)

This is a minimal approach - only Bearer token and the two required FT headers.

### Production (Direct API)

```bash
curl --location 'https://api.freighttiger.com/journey-snapshot/v1/journeys/count?page=1&size=20&entity_type=CNR&journey_status=IN_TRANSIT&start_time_utc=2025-01-15+18:30:00&end_time_utc=2026-01-22+18:29:59&journey_direction=outbound&journey_stop_type=source&sort[sort_by]=created_at&sort[sort_by_order]=DESC&milestones[]=PLANNED&milestones[]=BEFORE_ORIGIN&milestones[]=AT_ORIGIN&milestones[]=IN_TRANSIT&milestones[]=AT_DESTINATION&milestones[]=IN_RETURN&milestones[]=AFTER_DESTINATION&milestones[]=CLOSED&active_alerts[]=long_stoppage&active_alerts[]=route_deviation&active_alerts[]=eway_bill&active_analytics[]=delay_in_minutes&active_analytics[]=expected_arrival' \
--header 'Authorization: Bearer <token>' \
--header 'Accept: application/json' \
--header 'X-FT-ORGID: <org_id>' \
--header 'X-FT-USERID: <user_id>'
```

### Development (Via Proxy)

```bash
curl --location 'http://localhost:5173/__ft_tms/journey-snapshot/v1/journeys/count?page=1&size=20&entity_type=CNR&journey_status=IN_TRANSIT&start_time_utc=2025-01-15+18:30:00&end_time_utc=2026-01-22+18:29:59&journey_direction=outbound&journey_stop_type=source&sort[sort_by]=created_at&sort[sort_by_order]=DESC&milestones[]=PLANNED&milestones[]=BEFORE_ORIGIN&milestones[]=AT_ORIGIN&milestones[]=IN_TRANSIT&milestones[]=AT_DESTINATION&milestones[]=IN_RETURN&milestones[]=AFTER_DESTINATION&milestones[]=CLOSED&active_alerts[]=long_stoppage&active_alerts[]=route_deviation&active_alerts[]=eway_bill&active_analytics[]=delay_in_minutes&active_analytics[]=expected_arrival' \
--header 'Authorization: Bearer <token>' \
--header 'Accept: application/json' \
--header 'X-FT-ORGID: <org_id>' \
--header 'X-FT-USERID: <user_id>'
```

---

## Current Implementation (Bearer-only, no extra headers)

This is what the code currently does (using `fetch` directly):

```bash
curl --location 'https://api.freighttiger.com/journey-snapshot/v1/journeys/count?page=1&size=20&entity_type=CNR&journey_status=IN_TRANSIT&start_time_utc=2025-01-15+18:30:00&end_time_utc=2026-01-22+18:29:59&journey_direction=outbound&journey_stop_type=source&sort[sort_by]=created_at&sort[sort_by_order]=DESC&milestones[]=PLANNED&milestones[]=BEFORE_ORIGIN&milestones[]=AT_ORIGIN&milestones[]=IN_TRANSIT&milestones[]=AT_DESTINATION&milestones[]=IN_RETURN&milestones[]=AFTER_DESTINATION&milestones[]=CLOSED&active_alerts[]=long_stoppage&active_alerts[]=route_deviation&active_alerts[]=eway_bill&active_analytics[]=delay_in_minutes&active_analytics[]=expected_arrival' \
--header 'Authorization: Bearer <token>' \
--header 'Accept: application/json'
```

---

## Notes

- Replace `<token>` with your actual Bearer token
- Replace `<org_id>` with your organization ID (e.g., `1583874`)
- Replace `<user_id>` with your user ID (e.g., `431463`)
- Replace `<branch_id>` with your branch ID (optional, only for Option 1)
- Replace `<user_role>` with your user role (optional, only for Option 1)
- Date format: `YYYY-MM-DD+HH:MM:SS` (e.g., `2025-01-15+18:30:00`)
- The `+` in the date format should be URL-encoded as `%2B` if needed, but curl handles it automatically

## Code Reference

- **Current implementation:** `src/modules/summary-dashboard/data/journeyApiService.ts` (lines 357-364)
- **ftTmsFetch implementation:** `src/modules/summary-dashboard/data/ftTmsClient.ts` (lines 69-113)
