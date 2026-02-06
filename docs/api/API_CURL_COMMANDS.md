# API cURL Commands - Complete Reference

This document contains all cURL commands for APIs used in this project.

**Base URL**: `https://api.freighttiger.com` (or use proxy `/__ft_tms` in development)

**Common Headers**:
- `Authorization: Bearer YOUR_TOKEN_HERE` (for most APIs)
- `Content-Type: application/json`
- `Accept: application/json`
- `X-FT-ORGID: YOUR_ORG_ID` (derived from token)
- `X-FT-USERID: YOUR_USER_ID` (derived from token)

---

## 1. Authentication APIs

### 1.1 Login
```bash
curl -X POST "https://api.freighttiger.com/api/authentication/v1/auth/login" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "x-ft-unique-id: YOUR_DYNAMIC_ID" \
  -d '{
    "username": "your_username",
    "password": "encrypted_password",
    "grant_type": "password",
    "app_id": "web"
  }'
```

**Note**: Password is AES encrypted using SHA256(username + dynamicId) as key.

### 1.2 Refresh Token
```bash
curl -X POST "https://api.freighttiger.com/api/authentication/v1/auth/login/refresh" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "x-ft-userid: YOUR_USER_ID" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### 1.3 Get Desks
```bash
curl "https://api.freighttiger.com/api/entity-service/v1/desk" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -H "Source: platform"
```

### 1.4 Get Desk Token
```bash
curl "https://api.freighttiger.com/api/authentication/v1/auth/token/desk/DSK-{desk_fteid}" \
  -H "Content-Type: application/json" \
  -H "token: YOUR_LOGIN_TOKEN"
```

### 1.5 Validate Token
```bash
curl "https://api.freighttiger.com/api/authentication/v1/auth/login/validate" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

### 1.6 Logout
```bash
curl -X POST "https://api.freighttiger.com/api/authentication/v1/auth/login/logout" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

### 1.7 Forgot Password
```bash
curl -X POST "https://api.freighttiger.com/api/authentication/v1/auth/login/forgot-password" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

### 1.8 Reset Password
```bash
curl -X POST "https://api.freighttiger.com/api/authentication/v1/auth/login/reset-password" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset_token",
    "newPassword": "new_password",
    "confirmPassword": "new_password"
  }'
```

### 1.9 Get User Profile
```bash
curl "https://api.freighttiger.com/api/authentication/v1/auth/login/profile" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

---

## 2. Journey APIs

### 2.1 Get Journey Counts (Milestones)
```bash
curl "https://api.freighttiger.com/journey-snapshot/v1/journeys/count?page=1&size=20&entity_type=CNR&journey_status=IN_TRANSIT&start_time_utc=2025-12-22+18:30:00&end_time_utc=2026-01-22+18:29:59&journey_direction=outbound&journey_stop_type=source&sort[sort_by]=created_at&sort[sort_by_order]=DESC&milestones[]=PLANNED&milestones[]=BEFORE_ORIGIN&milestones[]=AT_ORIGIN&milestones[]=IN_TRANSIT&milestones[]=AT_DESTINATION&milestones[]=IN_RETURN&milestones[]=AFTER_DESTINATION&milestones[]=CLOSED&active_alerts[]=long_stoppage&active_alerts[]=route_deviation&active_alerts[]=eway_bill&active_analytics[]=delay_in_minutes&active_analytics[]=expected_arrival&alert_names[]=long_stoppage" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

**Query Parameters**:
- `page`: Page number (default: 1)
- `size`: Page size (default: 20)
- `entity_type`: Entity type (e.g., CNR)
- `journey_status`: Journey status (e.g., IN_TRANSIT)
- `start_time_utc`: Start date in format `YYYY-MM-DD+HH:MM:SS`
- `end_time_utc`: End date in format `YYYY-MM-DD+HH:MM:SS`
- `journey_direction`: Direction (e.g., outbound)
- `journey_stop_type`: Stop type (e.g., source)
- `sort[sort_by]`: Sort field (e.g., created_at)
- `sort[sort_by_order]`: Sort order (ASC/DESC)
- `milestones[]`: Array of milestone keys (PLANNED, BEFORE_ORIGIN, AT_ORIGIN, IN_TRANSIT, AT_DESTINATION, IN_RETURN, AFTER_DESTINATION, CLOSED)
- `active_alerts[]`: Array of alert types (long_stoppage, route_deviation, eway_bill)
- `active_analytics[]`: Array of analytics types (delay_in_minutes, expected_arrival)
- `alert_names[]`: Array of alert names
- `consignor_fteid`: (Optional) Filter by consignor
- `transporter_fteid`: (Optional) Filter by transporter

### 2.2 Search Journeys
```bash
curl "https://api.freighttiger.com/api/journey-snapshot/v1/journeys/search?page=1&size=20&entity_type=CNR&journey_status=IN_TRANSIT&start_time_utc=2025-12-22+18:30:00&end_time_utc=2026-01-22+18:29:59&journey_direction=outbound&journey_stop_type=source&sort[sort_by]=created_at&sort[sort_by_order]=DESC&milestones[]=PLANNED&milestones[]=BEFORE_ORIGIN&milestones[]=AT_ORIGIN&milestones[]=IN_TRANSIT&milestones[]=AT_DESTINATION&milestones[]=IN_RETURN&milestones[]=AFTER_DESTINATION&milestones[]=CLOSED&active_alerts[]=long_stoppage&active_alerts[]=route_deviation&active_alerts[]=eway_bill&active_analytics[]=delay_in_minutes&active_analytics[]=expected_arrival&alert_names[]=long_stoppage" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

### 2.3 Get ePOD Summary
```bash
# Get ePODs by status
curl "https://api.freighttiger.com/trip-snapshot/api/v1/epods?page=1&size=1&epod_status=AWAITING_APPROVAL" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"

curl "https://api.freighttiger.com/trip-snapshot/api/v1/epods?page=1&size=1&epod_status=PENDING_SUBMISSION" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"

curl "https://api.freighttiger.com/trip-snapshot/api/v1/epods?page=1&size=1&epod_status=VERIFIED_AS_REJECTED" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"

curl "https://api.freighttiger.com/trip-snapshot/api/v1/epods?page=1&size=1&epod_status=APPROVED" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"

curl "https://api.freighttiger.com/trip-snapshot/api/v1/epods?page=1&size=1&delivery_status=VERIFIED_AS_SUCCESSFULLY_DELIVERED" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"

curl "https://api.freighttiger.com/trip-snapshot/api/v1/epods?page=1&size=1&delivery_status=VERIFIED_AS_DELIVERED_WITH_ISSUES" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

---

## 3. Orders APIs

### 3.1 Get Orders Bucket Summary
```bash
curl "https://api.freighttiger.com/ptl-booking/api/v1/order/myOrdersBucketSummary?from_booking_date=1703260800000&to_booking_date=1705852800000" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

**Query Parameters**:
- `from_booking_date`: Start date timestamp (milliseconds)
- `to_booking_date`: End date timestamp (milliseconds)

### 3.2 Get Orders List
```bash
curl "https://api.freighttiger.com/ptl-booking/api/v1/order/myOrders?page=1&size=50&sort[sort_by]=created_at&sort[sort_by_order]=DESC" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

**Query Parameters**:
- `page`: Page number (default: 1)
- `size`: Page size (default: 50)
- `sort[sort_by]`: Sort field (e.g., created_at)
- `sort[sort_by_order]`: Sort order (ASC/DESC)

### 3.3 Get Order Details
```bash
curl "https://api.freighttiger.com/ptl-booking/api/v1/order/{order_id}/details" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

### 3.5 Get Order Comments
```bash
curl "https://api.freighttiger.com/ptl-booking/api/v1/order/{order_id}/comments" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

### 3.6 Add Order Comment
```bash
curl -X POST "https://api.freighttiger.com/ptl-booking/api/v1/order/{order_id}/comments" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Your comment text",
    "template_id": "optional_template_id"
  }'
```

### 4.1 Get Indents Count
```bash
curl -X POST "https://api.freighttiger.com/cyclops/indent/consignor/list/count?consignor_fteid=BRH-xxx&transporter_fteid=COM-xxx" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "token: YOUR_DESK_TOKEN_OR_LOGIN_TOKEN" \
  -d '{}'
```

**Note**: Indent API uses `token` header instead of `Authorization: Bearer`. Do NOT include user context headers (X-Org-Id, X-Branch-Id, etc.) as they cause 401 errors.

**Query Parameters**:
- `consignor_fteid`: (Optional) Filter by consignor
- `transporter_fteid`: (Optional) Filter by transporter

---

## 5. Shipments APIs

### 5.1 Get Shipment Bucket Summary
```bash
curl "https://api.freighttiger.com/ptl-v2/api/v1/shipment/myShipmentBucketSummary?from_booking_date=1703260800000&to_booking_date=1705852800000&consignor_fteid=BRH-xxx&transporter_fteid=COM-xxx&priority=high&priority=standard" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

**Query Parameters**:
- `from_booking_date`: Start date timestamp (milliseconds)
- `to_booking_date`: End date timestamp (milliseconds)
- `consignor_fteid`: (Optional) Filter by consignor
- `transporter_fteid`: (Optional) Filter by transporter
- `priority`: (Optional, multiple) Filter by priority (high, standard, low)

### 5.2 Get Shipment Specific Bucket Summary
```bash
curl "https://api.freighttiger.com/ptl-v2/api/v1/shipment/myShipmentSpecificBucketSummary?bucket_name=ACTIVE&from_booking_date=1703260800000&to_booking_date=1705852800000&consignor_fteid=BRH-xxx&transporter_fteid=COM-xxx&priority=high" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

**Query Parameters**:
- `bucket_name`: Bucket name (ACTIVE, DELIVERED)
- `from_booking_date`: Start date timestamp (milliseconds)
- `to_booking_date`: End date timestamp (milliseconds)
- `consignor_fteid`: (Optional) Filter by consignor
- `transporter_fteid`: (Optional) Filter by transporter
- `priority`: (Optional, multiple) Filter by priority

### 5.3 Get Shipments List
```bash
curl "https://api.freighttiger.com/ptl-v2/api/v1/shipment/myShipments?page=1&size=1&from_booking_date=1703260800000&to_booking_date=1705852800000&milestone=DELIVERED&pod_status=AVAILABLE&sort_by=created_at&sort_by_order=DESC&consignor_fteid=BRH-xxx&transporter_fteid=COM-xxx" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

**Query Parameters**:
- `page`: Page number
- `size`: Page size
- `from_booking_date`: Start date timestamp (milliseconds)
- `to_booking_date`: End date timestamp (milliseconds)
- `milestone`: Milestone filter (e.g., DELIVERED)
- `pod_status`: POD status (AVAILABLE, PENDING)
- `sort_by`: Sort field
- `sort_by_order`: Sort order (ASC/DESC)
- `consignor_fteid`: (Optional) Filter by consignor
- `transporter_fteid`: (Optional) Filter by transporter

### 5.4 Get Shipment Box Invoices
```bash
curl "https://api.freighttiger.com/api/ptl-v2/api/v2/shipment/boxes/{box_fteid}/invoices" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

---

## 6. Planning Engine APIs

### 6.1 Get User Settings
```bash
curl "https://planning-engine-service.freighttiger.com/planning-engine-service/v1/api/configurations/user-settings" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

### 6.2 Get Order Status Counts
```bash
curl "https://planning-engine-service.freighttiger.com/planning-engine-service/v1/api/orders/status-counts?branch_fteid=BRH-xxx" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

**Query Parameters**:
- `branch_fteid`: Branch FTEID

### 6.3 Get Custom Data Template
```bash
curl "https://planning-engine-service.freighttiger.com/planning-engine-service/v1/api/custom-data-template/order" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

**Path Parameters**:
- `{entity}`: Entity type (e.g., order)

### 6.4 Search Batches
```bash
curl "https://planning-engine-service.freighttiger.com/planning-engine-service/v1/api/batches/master-search?page=1&pageSize=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

**Query Parameters**:
- `page`: Page number (default: 1)
- `pageSize`: Page size (default: 10)

### 6.5 Get Company Hierarchy
```bash
curl "https://planning-engine-service.freighttiger.com/planning-engine-service/v1/api/external-services/eqs/company/child" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

### 6.6 Get Selected Orders Views
```bash
curl "https://planning-engine-service.freighttiger.com/planning-engine-service/v1/api/views/selected/orders" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

---

## 7. Access Control APIs

### 7.1 Get Permissions
```bash
curl "https://api.freighttiger.com/access-control/v1/accessControl/permissions" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

---

## 8. Entity Query Service (EQS) APIs

### 8.1 Get Consignors (Partners)
```bash
curl "https://api.freighttiger.com/eqs/v1/company/partners?parent_fteid=COM-xxx&filter={\"partner_type\":\"CNR\"}&sort=-updated_at&page=1&size=100&q=" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

**Query Parameters**:
- `parent_fteid`: Parent company FTEID
- `filter`: JSON stringified filter object (e.g., `{"partner_type":"CNR"}`)
- `sort`: Sort field (e.g., -updated_at)
- `page`: Page number
- `size`: Page size
- `q`: Search query

### 8.2 Get Transporters (Partners)
```bash
# For FTL transporters
curl "https://api.freighttiger.com/eqs/v1/company/partners?parent_fteid=COM-xxx&filter={\"partner_type\":\"TRN\"}&sort=-updated_at&page=1&size=100&q=" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"

# For PTL transporters
curl "https://api.freighttiger.com/eqs/v1/company/partners?parent_fteid=COM-xxx&filter={\"partner_type\":\"TRN\",\"tags\":\"PTL\"}&sort=-updated_at&page=1&size=100&q=" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

### 8.3 Get Branches
```bash
curl "https://api.freighttiger.com/eqs/v1/branch?company_fteid=COM-xxx&sort=-updated_at" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

**Query Parameters**:
- `company_fteid`: Company FTEID
- `sort`: Sort field (e.g., -updated_at)

### 8.5 Get Current Company
```bash
curl "https://api.freighttiger.com/eqs/v1/company/current" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Accept: application/json"
```

---

## Notes

### Authentication
- Most APIs use `Authorization: Bearer {token}` header
- Indent API uses `token: {token}` header instead
- Desk token API uses `token` header with login token
- User context headers (`X-FT-ORGID`, `X-FT-USERID`) are automatically added by `ftTmsFetch` helper

### Date Formats
- **Journey API**: `YYYY-MM-DD+HH:MM:SS` (e.g., `2025-12-22+18:30:00`)
- **Orders/Shipments API**: Timestamp in milliseconds (e.g., `1703260800000`)

### Common Query Parameters
- `page`: Page number (usually starts at 1)
- `size`: Page size (default varies by endpoint)
- `sort[sort_by]`: Sort field
- `sort[sort_by_order]`: Sort order (ASC/DESC)

### Array Parameters
Some APIs accept array parameters using bracket notation:
- `milestones[]=PLANNED&milestones[]=BEFORE_ORIGIN`
- `active_alerts[]=long_stoppage&active_alerts[]=route_deviation`
- `priority=high&priority=standard`

### Development vs Production
- **Development**: Use proxy paths like `/__ft_tms` or `/__planning`
- **Production**: Use full URLs like `https://api.freighttiger.com` or `https://planning-engine-service.freighttiger.com`

### Error Handling
- 401 Unauthorized: Token expired or invalid - refresh token or re-login
- 403 Forbidden: Insufficient permissions
- 404 Not Found: Resource doesn't exist
- 422 Unprocessable Entity: Invalid input data
- 500 Internal Server Error: Server-side error

---

**Last Updated**: January 21, 2026
