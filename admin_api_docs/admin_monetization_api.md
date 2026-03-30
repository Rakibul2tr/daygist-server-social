# Admin Monetization API Hitting Guide

Base route:

```bash
/admin
```

সব route-এই `authGuard` + `isAdmin` আছে, তাই token লাগবে:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 1) Get Monetization Application List

### Endpoint
```http
GET /admin/monetization/list
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Description
Admin monetization application list দেখতে পারবে।

### Query Params
- `status` = optional  
  possible values:
  - `pending`
  - `approved`
  - `rejected`

### Example
```http
GET /admin/monetization/list
```

### Example with status
```http
GET /admin/monetization/list?status=pending
```

```http
GET /admin/monetization/list?status=approved
```

```http
GET /admin/monetization/list?status=rejected
```

### cURL
```bash
curl -X GET http://localhost:5000/admin/monetization/list \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### cURL with status
```bash
curl -X GET "http://localhost:5000/admin/monetization/list?status=pending" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
fetch("http://localhost:5000/admin/monetization/list", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

### JavaScript fetch with status
```js
fetch("http://localhost:5000/admin/monetization/list?status=pending", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 2) Approve Monetization Application

### Endpoint
```http
POST /admin/monetization/:id/approve
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Description
Pending monetization application approve করার জন্য use হবে।

### Example
```http
POST /admin/monetization/65f1c9d8b12ab34cd56ef789/approve
```

### cURL
```bash
curl -X POST http://localhost:5000/admin/monetization/65f1c9d8b12ab34cd56ef789/approve \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const applicationId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/monetization/${applicationId}/approve`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 3) Reject Monetization Application

### Endpoint
```http
POST /admin/monetization/:id/reject
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Description
Pending monetization application reject করার জন্য use হবে।

### Body
```json
{
  "reason": "Documents are incomplete"
}
```

### Example
```http
POST /admin/monetization/65f1c9d8b12ab34cd56ef789/reject
```

### cURL
```bash
curl -X POST http://localhost:5000/admin/monetization/65f1c9d8b12ab34cd56ef789/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "reason": "Documents are incomplete"
  }'
```

### JavaScript fetch
```js
const applicationId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/monetization/${applicationId}/reject`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    reason: "Documents are incomplete"
  })
});
```

---

## 4) Reject Monetization Without Custom Reason

### Endpoint
```http
POST /admin/monetization/:id/reject
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body
```json
{}
```

### Notes
Reason না দিলে backend default `"Rejected"` set করবে।

### cURL
```bash
curl -X POST http://localhost:5000/admin/monetization/65f1c9d8b12ab34cd56ef789/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{}'
```

### JavaScript fetch
```js
const applicationId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/monetization/${applicationId}/reject`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({})
});
```

---

## 5) Common Frontend Header Example

### Auth Header
```js
const headers = {
  Authorization: `Bearer ${token}`
};
```

### JSON Request Header
```js
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`
};
```

---

## 6) React Native / Frontend Examples

### Get Pending Monetization List
```js
const getPendingMonetization = async () => {
  const res = await fetch("http://localhost:5000/admin/monetization/list?status=pending", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return await res.json();
};
```

### Get Approved Monetization List
```js
const getApprovedMonetization = async () => {
  const res = await fetch("http://localhost:5000/admin/monetization/list?status=approved", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return await res.json();
};
```

### Approve Application
```js
const approveMonetization = async applicationId => {
  const res = await fetch(`http://localhost:5000/admin/monetization/${applicationId}/approve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return await res.json();
};
```

### Reject Application
```js
const rejectMonetization = async applicationId => {
  const res = await fetch(`http://localhost:5000/admin/monetization/${applicationId}/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      reason: "Documents are incomplete"
    })
  });

  return await res.json();
};
```

---

## 7) Notes

### Base Route
```txt
/admin
```

### Routes
```txt
GET  /admin/monetization/list
POST /admin/monetization/:id/approve
POST /admin/monetization/:id/reject
```

### Query Params
```txt
status
```

### Status Values
```txt
pending
approved
rejected
```

### Reject Body
```txt
reason
```

### Behavior
```txt
Approve করলে:
- Monetization.status => approved
- User.monetizationStatus => approved
- User.isMonetization => true

Reject করলে:
- Monetization.status => rejected
- User.monetizationStatus => rejected
- User.isMonetization => false
```

### Security
```txt
All routes require authGuard + isAdmin
```