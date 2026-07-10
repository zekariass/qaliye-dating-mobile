# Pending Orders List Endpoint

## Overview

The pending orders list endpoint allows the mobile app to display the user's payment history and pending payment activity. This is particularly useful for showing orders that require user action (e.g., pending manual transfers, verification-pending payments, receipt-review orders).

## Endpoint

```
GET /api/v1/billing/orders
```

## Authentication

Requires a valid Bearer token (JWT from Supabase). The endpoint automatically filters orders to the authenticated user.

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `statuses` | `string` | No | *(all)* | Comma-separated list of status values to filter by. For pending orders, use `AWAITING_PAYMENT,VERIFICATION_PENDING,MANUAL_REVIEW` |
| `page` | `integer` | No | `1` | Page number (1-indexed) |
| `pageSize` | `integer` | No | `20` | Results per page (max 100) |

## Example: Fetch Pending Orders

To fetch only orders that require user attention:

```http
GET /api/v1/billing/orders?statuses=AWAITING_PAYMENT,VERIFICATION_PENDING,MANUAL_REVIEW&page=1&pageSize=20
Authorization: Bearer <your-jwt-token>
```

## Response

```json
{
  "orders": [
    {
      "id": "ffffffff-0000-0000-0000-000000000099",
      "orderReference": "QAL-A1B2C3D4",
      "status": "AWAITING_PAYMENT",
      "productCode": "PREMIUM_MONTHLY",
      "productType": "SUBSCRIPTION",
      "displayName": "PREMIUM_MONTHLY",
      "expectedAmountMinorUnits": 49900,
      "expectedCurrency": "ETB",
      "displayPrice": "ETB 499.00",
      "paymentMethodId": "aaaabbbb-0000-0000-0000-000000000001",
      "paymentMethodDisplayName": "CBE Bank Transfer",
      "paymentChannel": "MANUAL_TRANSFER",
      "paymentMethod": "CBE_BANK_TRANSFER",
      "expiresAt": "2026-07-02T16:00:00Z",
      "createdAt": "2026-07-02T12:00:00Z",
      "updatedAt": "2026-07-02T12:05:00Z",
      "canResumePayment": true,
      "canSubmitReference": true,
      "canSubmitReceipt": true,
      "canCreateNewOrder": false
    },
    {
      "id": "eeeeeeee-0000-0000-0000-000000000088",
      "orderReference": "QAL-B2C3D4E5",
      "status": "VERIFICATION_PENDING",
      "productCode": "BOOST_PACK_5",
      "productType": "CONSUMABLE",
      "displayName": "5 Boost Pack",
      "expectedAmountMinorUnits": 25000,
      "expectedCurrency": "ETB",
      "displayPrice": "ETB 250.00",
      "paymentMethodId": "aaaabbbb-0000-0000-0000-000000000002",
      "paymentMethodDisplayName": "Telebirr Direct",
      "paymentChannel": "DIRECT_TELEBIRR",
      "paymentMethod": "TELEBIRR_DIRECT",
      "expiresAt": "2026-07-02T18:00:00Z",
      "createdAt": "2026-07-02T13:00:00Z",
      "updatedAt": "2026-07-02T13:10:00Z",
      "canResumePayment": false,
      "canSubmitReference": false,
      "canSubmitReceipt": false,
      "canCreateNewOrder": false
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 2,
  "totalPages": 1
}
```

## Order Statuses

| Status | Description | User Action Required |
|--------|-------------|---------------------|
| `CREATED` | Order created, provider session not yet established | Resume payment |
| `AWAITING_PAYMENT` | Waiting for user to complete payment | **Yes** - complete payment or submit reference/receipt |
| `RECEIPT_SUBMITTED` | Receipt uploaded, awaiting review | No - wait for admin review |
| `VERIFICATION_PENDING` | Reference submitted, auto-verification running | No - wait for verification |
| `MANUAL_REVIEW` | Queued for admin review | No - wait for admin decision |
| `VERIFIED` | Payment confirmed, fulfillment triggered | No - entitlements granted |
| `REJECTED` | Payment declined by admin | **Yes** - create new order |
| `EXPIRED` | Order expired before payment | **Yes** - create new order |
| `CANCELLED` | Order cancelled by user or system | **Yes** - create new order |

## Action Flags

The response includes boolean flags to guide frontend UI behavior:

| Flag | When `true` | Frontend Action |
|------|-------------|-----------------|
| `canResumePayment` | Status is `CREATED` or `AWAITING_PAYMENT` | Show "Resume Payment" or "Complete Payment" button |
| `canSubmitReference` | Status is `AWAITING_PAYMENT` AND payment channel is manual (`MANUAL_*` or `DIRECT_*`) | Show "Submit Transaction Reference" form |
| `canSubmitReceipt` | Status is `AWAITING_PAYMENT` AND payment channel is manual | Show "Upload Receipt" button |
| `canCreateNewOrder` | Status is `REJECTED`, `EXPIRED`, or `CANCELLED` | Show "Try Again" or "Create New Order" button |

## Frontend Implementation Guide

### 1. Fetch Pending Orders on App Load

```typescript
const fetchPendingOrders = async () => {
  const response = await fetch(
    '/api/v1/billing/orders?statuses=AWAITING_PAYMENT,VERIFICATION_PENDING,MANUAL_REVIEW',
    {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    }
  );
  const data = await response.json();
  return data.orders;
};
```

### 2. Display Pending Orders in UI

For each order, check the status and action flags:

- **`AWAITING_PAYMENT` + manual channel**: Show payment instructions + reference/receipt submission forms
- **`VERIFICATION_PENDING`**: Show "Verifying payment..." status message
- **`MANUAL_REVIEW`**: Show "Under review" status message

### 3. Handle Order Actions

- **Submit Reference**: Call `POST /api/v1/billing/orders/{orderId}/reference`
- **Submit Receipt**: Call `POST /api/v1/billing/orders/{orderId}/receipt`
- **Resume Payment**: Call `GET /api/v1/billing/orders/{orderId}` to get full payment instructions

### 4. Refresh Order List

After submitting a reference or receipt, refresh the list to get updated status:

```typescript
const refreshOrders = async () => {
  const orders = await fetchPendingOrders();
  setOrders(orders);
};
```

## Common Use Cases

### Show All Orders (History)

```http
GET /api/v1/billing/orders
```

### Show Only Pending Orders

```http
GET /api/v1/billing/orders?statuses=AWAITING_PAYMENT,VERIFICATION_PENDING,MANUAL_REVIEW
```

### Show Completed Orders

```http
GET /api/v1/billing/orders?statuses=VERIFIED
```

### Show Failed Orders (for retry)

```http
GET /api/v1/billing/orders?statuses=REJECTED,EXPIRED,CANCELLED
```

## Error Handling

| Status | Error Code | Description |
|--------|------------|-------------|
| `400` | `invalid_order_status: <value>` | One or more status values are invalid |
| `401` | — | Missing or invalid authentication token |

## Notes

- Orders are sorted by `createdAt` (newest first)
- The endpoint never exposes sensitive data (full bank account numbers, receipt paths, admin notes)
- `FULFILLED` is not a database status; fulfilled orders remain at `VERIFIED`
- Manual payment channels are detected by `paymentChannel` starting with `MANUAL_` or `DIRECT_`
