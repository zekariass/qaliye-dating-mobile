# Payment & Entitlement API — Frontend Implementation Guide

> **Base URL:** `/api/v1`
> **Authorization:** All endpoints require a valid JWT Bearer token in the `Authorization` header unless stated otherwise.
> All timestamps are **ISO-8601 UTC** strings (e.g. `"2025-09-01T12:00:00Z"`).
> Monetary amounts are always in **minor units** (e.g. `50000` = ETB 500.00).

---

## Table of Contents

1. [Concepts](#1-concepts)
2. [Entitlements](#2-entitlements)
3. [Payment Options](#3-payment-options)
4. [Offers](#4-offers)
5. [Orders](#5-orders)
   - 5.1 [Create Order](#51-create-order)
   - 5.2 [Get Order](#52-get-order)
   - 5.3 [Submit Transaction Reference](#53-submit-transaction-reference)
   - 5.4 [Submit Receipt Upload](#54-submit-receipt-upload)
6. [Boosts](#6-boosts)
7. [Admin — Order Management](#7-admin--order-management)
8. [Error Reference](#8-error-reference)
9. [Typical Frontend Flows](#9-typical-frontend-flows)

---

## 1. Concepts

### Billing Market

Every user is resolved to a **billing market** — a `(country_code, platform)` pair. The market determines which offers and payment methods are available.

**Resolution order for country:**
1. `billing_country_code` on the user's account (admin-set, highest trust)
2. `country_code` from the user's primary address
3. Falls back to `GLOBAL`

**Market fallback rule:** If the user's resolved country has no active offers **and** no active payment methods for the requested platform, the system transparently falls back to the `GLOBAL` market. The `PaymentOptionsResponse` always communicates the resolved market so the frontend can display appropriate messaging.

### Payments vs. RevenueCat

| Platform | Channel | Flow |
|---|---|---|
| **Android (Ethiopia)** | `CHAPA`, `MANUAL_TRANSFER`, `DIRECT_TELEBIRR` | Order-based — use the REST flow in this document |
| **Android (Global)** | `REVENUECAT_GOOGLE` | Handled entirely by the RevenueCat SDK; no order creation required |
| **iOS (all markets)** | `REVENUECAT_APPLE` | Handled entirely by the RevenueCat SDK; no order creation required |

For RevenueCat-based platforms, the frontend should use the RevenueCat SDK directly. Entitlement state is synced server-side via webhooks automatically.

---

## 2. Entitlements

Returns the current user's active subscription state, per-feature quotas, credits, and feature flags.

```
GET /billing/entitlements
```

**Authorization:** Bearer token (authenticated user)

**Query Parameters:** none

**Response `200 OK`:**

```json
{
  "plan": "PREMIUM",
  "subscription": {
    "status": "ACTIVE",
    "billingIntervalCount": 1,
    "billingIntervalUnit": "MONTH",
    "expiresAt": "2025-10-01T00:00:00Z",
    "autoRenew": true
  },
  "limits": {
    "DAILY_LIKES": {
      "used": 12,
      "limit": 100,
      "remaining": 88,
      "resetsAt": "2025-09-02T00:00:00Z"
    },
    "SUPER_LIKES": {
      "used": 1,
      "limit": 5,
      "remaining": 4,
      "resetsAt": "2025-10-01T00:00:00Z"
    }
  },
  "credits": {
    "boostsAvailable": 2,
    "superLikesAvailable": 4,
    "rewindsAvailable": 1
  },
  "activeBoost": null,
  "features": {
    "canSeeWhoLikedMe": true,
    "advancedFilters": true,
    "rewind": true
  }
}
```

| Field | Type | Description |
|---|---|---|
| `plan` | `string` | Current plan code: `FREE`, `PREMIUM`, etc. |
| `subscription` | `object\|null` | `null` when on the free plan |
| `subscription.status` | `string` | `ACTIVE`, `PAST_DUE`, `CANCELLED`, `EXPIRED` |
| `subscription.billingIntervalCount` | `integer\|null` | e.g. `1` |
| `subscription.billingIntervalUnit` | `string\|null` | `DAY`, `WEEK`, `MONTH`, `YEAR` |
| `subscription.expiresAt` | `timestamp\|null` | When the current period ends |
| `subscription.autoRenew` | `boolean` | Whether the subscription auto-renews |
| `limits` | `object` | Map of limit type to quota info |
| `limits[key].used` | `integer` | How many times the resource has been used |
| `limits[key].limit` | `integer\|null` | `null` = unlimited |
| `limits[key].remaining` | `integer\|null` | `null` = unlimited |
| `limits[key].resetsAt` | `timestamp\|null` | When quota resets |
| `credits` | `object` | Consumable credit balances |
| `activeBoost` | `object\|null` | `null` when no boost is running |
| `activeBoost.startedAt` | `timestamp` | When the boost started |
| `activeBoost.expiresAt` | `timestamp` | When the boost expires |
| `activeBoost.remainingSeconds` | `integer` | Seconds until boost expires |
| `features` | `object` | Map of feature flag to `boolean` |

---

## 3. Payment Options

Returns the available payment methods for a user on a given platform, with market metadata. Call this **before** showing the payment method selection screen.

```
GET /billing/payment-options?platform={platform}
```

**Authorization:** Bearer token (authenticated user)

**Query Parameters:**

| Parameter | Required | Default | Values | Description |
|---|---|---|---|---|
| `platform` | No | `ANDROID` | `ANDROID`, `IOS` | The user's app platform |

**Response `200 OK`:**

```json
{
  "platform": "ANDROID",
  "billingCountryCode": "ET",
  "resolvedMarketCountryCode": "ET",
  "fallbackToGlobal": false,
  "paymentMethods": [
    {
      "id": "aaaabbbb-0000-0000-0000-000000000001",
      "methodCode": "CHAPA_ET_ANDROID",
      "displayName": "Pay with Chapa",
      "paymentChannel": "CHAPA",
      "paymentMethod": "CHAPA_CHECKOUT",
      "paymentInstructions": null,
      "displayOrder": 1
    },
    {
      "id": "aaaabbbb-0000-0000-0000-000000000002",
      "methodCode": "MANUAL_TRANSFER_ET_ANDROID",
      "displayName": "Bank Transfer",
      "paymentChannel": "MANUAL_TRANSFER",
      "paymentMethod": "BANK_TRANSFER",
      "paymentInstructions": "Transfer {{EXPECTED_AMOUNT}} {{CURRENCY}} to account ...",
      "displayOrder": 2
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `platform` | `string` | Platform used for this resolution |
| `billingCountryCode` | `string` | Raw country code detected for the user (`ET`, `GLOBAL`, etc.) |
| `resolvedMarketCountryCode` | `string` | Country code whose market was actually used (may differ when fallback occurred) |
| `fallbackToGlobal` | `boolean` | `true` when the user's country had no active market and GLOBAL was used instead |
| `paymentMethods` | `array` | Ordered list of available payment methods |
| `paymentMethods[].id` | `UUID` | **Use as `paymentMethodId` when creating an order** |
| `paymentMethods[].methodCode` | `string` | Internal stable code (useful for analytics/debugging) |
| `paymentMethods[].displayName` | `string` | Human-readable label for the UI |
| `paymentMethods[].paymentChannel` | `string` | Technical routing channel: `CHAPA`, `MANUAL_TRANSFER`, `DIRECT_TELEBIRR`, `REVENUECAT_APPLE`, `REVENUECAT_GOOGLE` |
| `paymentMethods[].paymentMethod` | `string` | Sub-method within the channel |
| `paymentMethods[].paymentInstructions` | `string\|null` | Template text for manual methods; placeholders are resolved at order creation time |
| `paymentMethods[].displayOrder` | `integer` | Render methods in ascending order |

> **Note:** When `paymentChannel` is `REVENUECAT_APPLE` or `REVENUECAT_GOOGLE`, do **not** show the order creation UI. Launch the RevenueCat SDK purchase flow instead.

---

## 4. Offers

Returns subscription and consumable offers available to the user on a given platform. Each offer includes the price, billing interval, and whether payment methods are available for the current market.

```
GET /billing/offers?platform={platform}
```

**Authorization:** Bearer token (authenticated user)

**Query Parameters:**

| Parameter | Required | Default | Values | Description |
|---|---|---|---|---|
| `platform` | No | `ANDROID` | `ANDROID`, `IOS` | The user's app platform |

**Response `200 OK`:**

```json
[
  {
    "id": "d0000000-0000-0000-0000-000000000001",
    "productCode": "PREMIUM_MONTHLY",
    "productType": "SUBSCRIPTION",
    "currency": "ETB",
    "priceMinorUnits": 49900,
    "displayPrice": "ETB 499.00",
    "billingIntervalCount": 1,
    "billingIntervalUnit": "MONTH",
    "autoRenew": false,
    "externalProductId": null,
    "revenuecatOfferingId": null,
    "revenuecatPackageId": null,
    "hasAvailablePaymentMethods": true,
    "availablePaymentMethodCount": 2
  },
  {
    "id": "d0000000-0000-0000-0000-000000000010",
    "productCode": "PREMIUM_MONTHLY",
    "productType": "SUBSCRIPTION",
    "currency": "USD",
    "priceMinorUnits": 1499,
    "displayPrice": "USD 14.99",
    "billingIntervalCount": 1,
    "billingIntervalUnit": "MONTH",
    "autoRenew": true,
    "externalProductId": "com.qaliye.premium.monthly",
    "revenuecatOfferingId": "default",
    "revenuecatPackageId": "$rc_monthly",
    "hasAvailablePaymentMethods": true,
    "availablePaymentMethodCount": 1
  }
]
```

| Field | Type | Description |
|---|---|---|
| `id` | `UUID` | **Use as `paymentOfferId` when creating an order** |
| `productCode` | `string` | e.g. `PREMIUM_MONTHLY`, `PREMIUM_YEARLY`, `BOOST_5_PACK` |
| `productType` | `string` | `SUBSCRIPTION` or `CONSUMABLE` |
| `currency` | `string` | ISO 4217 currency code |
| `priceMinorUnits` | `integer` | Price in minor currency units (divide by 100 for display) |
| `displayPrice` | `string` | Pre-formatted price string ready for display |
| `billingIntervalCount` | `integer\|null` | Number of interval units; `null` for consumables |
| `billingIntervalUnit` | `string\|null` | `DAY`, `WEEK`, `MONTH`, `YEAR`; `null` for consumables |
| `autoRenew` | `boolean` | `true` for store-managed subscriptions (RevenueCat) |
| `externalProductId` | `string\|null` | App Store / Play Store product ID; non-null for RevenueCat offers |
| `revenuecatOfferingId` | `string\|null` | RevenueCat offering identifier |
| `revenuecatPackageId` | `string\|null` | RevenueCat package identifier |
| `hasAvailablePaymentMethods` | `boolean` | `false` means no payment methods are available — disable purchase UI for this offer |
| `availablePaymentMethodCount` | `integer` | Count of active payment methods in the resolved market |

---

## 5. Orders

### 5.1 Create Order

Creates a new payment order. The offer and payment method **must belong to the same billing market** (same `country_code` and `platform`).

```
POST /billing/orders
```

**Authorization:** Bearer token (authenticated user)

**Request Body (`application/json`):**

```json
{
  "paymentOfferId": "d0000000-0000-0000-0000-000000000001",
  "paymentMethodId": "aaaabbbb-0000-0000-0000-000000000001",
  "idempotencyKey": "unique-client-key-abc123",
  "platform": "ANDROID"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `paymentOfferId` | `UUID` | **Yes** | ID of the offer from `GET /billing/offers` |
| `paymentMethodId` | `UUID` | **Yes** | ID of the payment method from `GET /billing/payment-options` |
| `idempotencyKey` | `string\|null` | No | Client-generated key to prevent duplicate orders on retry. Same key returns the existing order. |
| `platform` | `string\|null` | No | `ANDROID` or `IOS`; used for market validation |

**Response `201 Created`:**

```json
{
  "id": "ffffffff-0000-0000-0000-000000000099",
  "orderReference": "QAL-A1B2C3D4",
  "status": "AWAITING_PAYMENT",
  "expectedAmountMinorUnits": 49900,
  "expectedCurrency": "ETB",
  "paymentMethodId": "aaaabbbb-0000-0000-0000-000000000001",
  "paymentChannel": "CHAPA",
  "paymentMethod": "CHAPA_CHECKOUT",
  "paymentMethodDisplayName": "Pay with Chapa",
  "providerCheckoutUrl": "https://checkout.chapa.co/checkout/payment/xxxxx",
  "paymentInstructions": {
    "paymentChannel": "CHAPA",
    "paymentMethod": "CHAPA_CHECKOUT",
    "methodCode": "CHAPA_ET_ANDROID",
    "displayName": "Pay with Chapa"
  },
  "expiresAt": "2025-09-01T14:00:00Z",
  "createdAt": "2025-09-01T12:00:00Z"
}
```

For **MANUAL_TRANSFER** and **DIRECT_TELEBIRR** methods, `paymentInstructions` contains resolved bank/account details:

```json
{
  "paymentChannel": "MANUAL_TRANSFER",
  "paymentMethod": "BANK_TRANSFER",
  "methodCode": "MANUAL_TRANSFER_ET_ANDROID",
  "displayName": "Bank Transfer",
  "accountName": "Qaliye Technology PLC",
  "accountNumber": "1000123456789",
  "bankName": "Commercial Bank of Ethiopia",
  "instructionText": "Transfer 499.00 ETB to Commercial Bank of Ethiopia account 1000123456789. Use reference QAL-A1B2C3D4. Order expires 2025-09-01 14:00 UTC."
}
```

| Field | Type | Description |
|---|---|---|
| `id` | `UUID` | Order ID — use for subsequent calls |
| `orderReference` | `string` | Human-readable reference (`QAL-XXXXXXXX`); instruct user to include this in their payment |
| `status` | `string` | See [Order Status Values](#order-status-values) |
| `expectedAmountMinorUnits` | `integer` | Exact amount the user must pay |
| `expectedCurrency` | `string` | Currency code |
| `paymentMethodId` | `UUID` | Payment method used for this order |
| `paymentChannel` | `string` | Routing channel |
| `paymentMethod` | `string` | Sub-method |
| `paymentMethodDisplayName` | `string` | Display label |
| `providerCheckoutUrl` | `string\|null` | Chapa only: redirect or WebView URL for hosted checkout |
| `paymentInstructions` | `object` | Snapshot of instructions frozen at order creation time |
| `expiresAt` | `timestamp` | Order expires at this time; user must complete payment before then |
| `createdAt` | `timestamp` | Order creation time |

#### Order Status Values

| Status | Description |
|---|---|
| `CREATED` | Order created but provider session not yet established |
| `AWAITING_PAYMENT` | Waiting for the user to complete payment |
| `VERIFICATION_PENDING` | Payment reference submitted; automated verification running |
| `MANUAL_REVIEW` | Queued for admin review (receipt uploaded or auto-verification inconclusive) |
| `VERIFIED` | Payment confirmed; fulfillment triggered |
| `FULFILLED` | Subscription or credits successfully granted |
| `REJECTED` | Payment declined by admin |
| `EXPIRED` | Order expired before payment was received |

**Error Responses:**

| Status | Code | Cause |
|---|---|---|
| `400` | `invalid_offer` | `paymentOfferId` does not exist or is inactive |
| `400` | `invalid_payment_method` | `paymentMethodId` does not exist |
| `400` | `payment_method_unavailable` | Payment method is currently disabled |
| `400` | `offer_method_market_mismatch` | Offer and payment method belong to different markets |

---

### 5.2 Get Order

Fetches a single order. Only the order owner can access it.

```
GET /billing/orders/{orderId}
```

**Authorization:** Bearer token (authenticated user, must be order owner)

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `orderId` | `UUID` | Order ID returned from `POST /billing/orders` |

**Response `200 OK`:** Same shape as the [Create Order response](#51-create-order).

**Error Responses:**

| Status | Code | Cause |
|---|---|---|
| `404` | `order_not_found` | Order does not exist |
| `403` | `access_denied` | Caller is not the order owner |

---

### 5.3 Submit Transaction Reference

Submit a manual payment reference (e.g. a Telebirr or bank transaction ID) for verification. Triggers automatic verification if a provider is configured; otherwise queues for manual review.

```
POST /billing/orders/{orderId}/reference
```

**Authorization:** Bearer token (authenticated user, must be order owner)

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `orderId` | `UUID` | Order ID |

**Request Body (`application/json`):**

```json
{
  "transactionReference": "TXN-ABCDEF123456",
  "paymentNetwork": "TELEBIRR",
  "submittedAmountMinorUnits": 49900,
  "submittedCurrency": "ETB"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `transactionReference` | `string` | **Yes** | Reference number from the payment network |
| `paymentNetwork` | `string\|null` | No | Network name for context (e.g. `TELEBIRR`, `CBE_BIRR`) |
| `submittedAmountMinorUnits` | `integer\|null` | No | Amount the user claims to have paid |
| `submittedCurrency` | `string\|null` | No | Currency of the submitted amount |

**Response `200 OK`:** Updated order object.
Status will be `VERIFICATION_PENDING` (auto-verification running) or `MANUAL_REVIEW` (verification failed or no auto-verifier configured).

**Error Responses:**

| Status | Code | Cause |
|---|---|---|
| `404` | `order_not_found` | |
| `403` | `access_denied` | |
| `400` | `order_not_awaiting_payment` | Order is not in `AWAITING_PAYMENT` status |

---

### 5.4 Submit Receipt Upload

Submit a receipt image that has been pre-uploaded to Supabase Storage. The order is queued for manual admin review.

```
POST /billing/orders/{orderId}/receipt
```

**Authorization:** Bearer token (authenticated user, must be order owner)

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `orderId` | `UUID` | Order ID |

**Request Body (`application/json`):**

```json
{
  "receiptStorageBucket": "payment-receipts",
  "receiptStoragePath": "receipts/user-uuid/order-uuid/receipt.jpg",
  "transactionReference": "TXN-OPTIONAL",
  "paymentNetwork": "CBE_BIRR",
  "submittedAmountMinorUnits": 49900,
  "submittedCurrency": "ETB"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `receiptStorageBucket` | `string` | **Yes** | Must be `payment-receipts` or `receipts` |
| `receiptStoragePath` | `string` | **Yes** | Full storage path of the uploaded receipt file |
| `transactionReference` | `string\|null` | No | Optional transaction ID visible on the receipt |
| `paymentNetwork` | `string\|null` | No | |
| `submittedAmountMinorUnits` | `integer\|null` | No | |
| `submittedCurrency` | `string\|null` | No | |

**Response `200 OK`:** Updated order object. Status will be `MANUAL_REVIEW`.

**Error Responses:**

| Status | Code | Cause |
|---|---|---|
| `404` | `order_not_found` | |
| `403` | `access_denied` | |
| `400` | `order_not_awaiting_payment` | Order is not in `AWAITING_PAYMENT` or `RECEIPT_SUBMITTED` |
| `400` | `invalid_receipt_bucket` | Bucket name not in the server whitelist |

---

## 6. Boosts

Activates a profile boost by consuming one boost credit from the user's balance.

```
POST /billing/boosts/activate
```

**Authorization:** Bearer token (authenticated user)

**Request Body (`application/json`, optional):**

```json
{
  "idempotencyKey": "boost-attempt-xyz"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `idempotencyKey` | `string\|null` | No | Prevents double-activation on retry |

**Response `200 OK`:**

```json
{
  "boostId": "cccccccc-0000-0000-0000-000000000001",
  "startedAt": "2025-09-01T12:00:00Z",
  "expiresAt": "2025-09-01T12:30:00Z",
  "creditsRemaining": 1
}
```

| Field | Type | Description |
|---|---|---|
| `boostId` | `UUID` | Active boost ID |
| `startedAt` | `timestamp` | When the boost was activated |
| `expiresAt` | `timestamp` | When the boost expires (typically 30 minutes) |
| `creditsRemaining` | `integer` | Remaining boost credits after this activation |

---

## 7. Admin — Order Management

All admin endpoints are under `/api/v1/admin/billing` and require the caller to have the `ADMIN` role. Requests from non-admin users receive `403 Forbidden`.

---

### List Orders

```
GET /admin/billing/orders
```

**Query Parameters:**

| Parameter | Required | Default | Description |
|---|---|---|---|
| `status` | No | `MANUAL_REVIEW` | Filter by order status (see [Order Status Values](#order-status-values)) |
| `methodCode` | No | — | Filter by payment method code (e.g. `MANUAL_TRANSFER_ET_ANDROID`) |
| `countryCode` | No | — | Filter by billing country code (e.g. `ET`, `GLOBAL`) |
| `page` | No | `1` | Page number (1-based) |
| `pageSize` | No | `20` | Results per page (max recommended: 100) |

**Response `200 OK`:**

```json
{
  "orders": [
    {
      "id": "...",
      "orderReference": "QAL-A1B2C3D4",
      "status": "MANUAL_REVIEW",
      "expectedAmountMinorUnits": 49900,
      "expectedCurrency": "ETB",
      "paymentMethodDisplayName": "Bank Transfer",
      "createdAt": "2025-09-01T12:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

---

### Get Order Details

```
GET /admin/billing/orders/{orderId}
```

**Response `200 OK`:**

```json
{
  "id": "ffffffff-0000-0000-0000-000000000099",
  "userId": "user-uuid",
  "orderReference": "QAL-A1B2C3D4",
  "status": "MANUAL_REVIEW",
  "expectedAmountMinorUnits": 49900,
  "expectedCurrency": "ETB",
  "paymentMethodId": "aaaabbbb-0000-0000-0000-000000000001",
  "paymentChannel": "MANUAL_TRANSFER",
  "paymentMethod": "BANK_TRANSFER",
  "paymentMethodDisplayName": "Bank Transfer",
  "createdAt": "2025-09-01T12:00:00Z",
  "receiptUrl": "https://signed-url-to-receipt-image"
}
```

`receiptUrl` is only present when a receipt has been uploaded. The URL is a time-limited signed URL.

---

### Approve Order

Marks the order as verified and triggers fulfillment (subscription activation or credit grant).

```
POST /admin/billing/orders/{orderId}/approve
```

**Request Body (`application/json`, optional):**

```json
{
  "decisionNote": "Verified manually against bank statement"
}
```

**Response `200 OK`:**

```json
{ "status": "VERIFIED", "orderId": "ffffffff-0000-0000-0000-000000000099" }
```

---

### Decline Order

Marks the order as rejected. `decisionNote` is required to ensure an audit trail.

```
POST /admin/billing/orders/{orderId}/decline
```

**Request Body (`application/json`):**

```json
{
  "decisionNote": "Screenshot does not match our account number"
}
```

**Response `200 OK`:**

```json
{ "status": "REJECTED", "orderId": "ffffffff-0000-0000-0000-000000000099" }
```

**Error Responses (approve and decline):**

| Status | Code | Cause |
|---|---|---|
| `404` | `order_not_found` | |
| `403` | `admin_required` | Caller does not have the ADMIN role |
| `400` | `order_not_reviewable` | Order is not in `MANUAL_REVIEW` or `VERIFICATION_PENDING` |

---

## 8. Error Reference

All error responses follow this shape:

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "offer_method_market_mismatch"
}
```

| HTTP Status | When |
|---|---|
| `400 Bad Request` | Invalid input or business rule violation (see `message` for the specific code) |
| `401 Unauthorized` | Missing or invalid JWT |
| `403 Forbidden` | Valid JWT but insufficient permissions (or not the resource owner) |
| `404 Not Found` | Resource does not exist |

---

## 9. Typical Frontend Flows

### Flow A — Manual Payment (Android / Ethiopia)

```
1. GET /billing/payment-options?platform=ANDROID
   Display paymentMethods list for user to choose from.
   Sort by displayOrder ascending.

2. GET /billing/offers?platform=ANDROID
   Display subscription plans.
   Only show offers where hasAvailablePaymentMethods = true.

3. User selects an offer and a payment method.

4. POST /billing/orders
   Body: { paymentOfferId, paymentMethodId, idempotencyKey, platform }
   Store: orderId, orderReference, status, expiresAt

5a. paymentChannel == "CHAPA"
    → Open providerCheckoutUrl in a WebView or browser tab.
    → Poll GET /billing/orders/{orderId} every 3–5 seconds.
    → Stop polling when status != "AWAITING_PAYMENT".

5b. paymentChannel == "MANUAL_TRANSFER" or "DIRECT_TELEBIRR"
    → Display paymentInstructions to the user:
        accountName, accountNumber, bankName, instructionText
    → Prompt user to pay externally and then submit proof.

6a. User has a transaction reference number:
    POST /billing/orders/{orderId}/reference
    Body: { transactionReference, paymentNetwork, submittedAmountMinorUnits, submittedCurrency }

6b. User has a receipt screenshot:
    → Upload image to Supabase Storage → obtain bucket + path.
    POST /billing/orders/{orderId}/receipt
    Body: { receiptStorageBucket, receiptStoragePath, ... }

7. Poll GET /billing/orders/{orderId} until terminal status:
   "FULFILLED"  → Show success; refresh entitlements.
   "REJECTED"   → Show decline reason; offer retry option.
   "EXPIRED"    → Show expiry message; offer a new order.
```

### Flow B — RevenueCat (iOS / Global Android)

```
1. GET /billing/offers?platform=IOS
   Use externalProductId, revenuecatOfferingId, revenuecatPackageId
   to configure the RevenueCat SDK purchase.

2. Launch RevenueCat SDK purchase flow directly.
   Do NOT create a REST order.

3. After SDK confirms purchase:
   GET /billing/entitlements
   The subscription is already synced server-side via webhook.
```

### Flow C — Activate a Boost

```
1. GET /billing/entitlements
   Check credits.boostsAvailable > 0 before showing the activate button.

2. POST /billing/boosts/activate
   Body: { idempotencyKey }

3. On success: display boost active screen with a countdown to expiresAt.
   Refresh entitlements to reflect the new creditsRemaining.
```
