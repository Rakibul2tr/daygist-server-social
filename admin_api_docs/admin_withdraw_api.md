# Admin Withdraw API Hitting Guide

Base route:

```bash
/admin
```

সব route-এই `authGuard` + `isAdmin` আছে, তাই token লাগবে:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 1) Get All Withdraw Requests

### Endpoint
```http
GET /admin/all-withdraw
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Params
- `status` = optional  
  values:
  - `pending`
  - `approved`
  - `rejected`
- `limit` = optional, default 20, max 50
- `cursor` = optional JSON string

### Example
```http
GET /admin/all-withdraw
```

### Example with status
```http
GET /admin/all-withdraw?status=pending
```

### Example with status and limit
```http
GET /admin/all-withdraw?status=approved&limit=10
```

### cURL
```bash
curl -X GET http://localhost:5000/admin/all-withdraw \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### cURL with status
```bash
curl -X GET "http://localhost:5000/admin/all-withdraw?status=pending" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### cURL with status + limit
```bash
curl -X GET "http://localhost:5000/admin/all-withdraw?status=approved&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
fetch("http://localhost:5000/admin/all-withdraw", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

### JavaScript fetch with status
```js
fetch("http://localhost:5000/admin/all-withdraw?status=pending", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

### JavaScript fetch with status + limit
```js
fetch("http://localhost:5000/admin/all-withdraw?status=approved&limit=10", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 2) Approve Withdraw Request

### Endpoint
```http
PATCH /admin/:id/approve
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body
- `note` = optional

### Example
```http
PATCH /admin/65f1c9d8b12ab34cd56ef789/approve
```

### Example Body
```json
{
  "note": "Approved by admin"
}
```

### cURL
```bash
curl -X PATCH http://localhost:5000/admin/65f1c9d8b12ab34cd56ef789/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "note": "Approved by admin"
  }'
```

### cURL without note
```bash
curl -X PATCH http://localhost:5000/admin/65f1c9d8b12ab34cd56ef789/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{}'
```

### JavaScript fetch
```js
const withdrawId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/${withdrawId}/approve`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    note: "Approved by admin"
  })
});
```

### JavaScript fetch without note
```js
const withdrawId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/${withdrawId}/approve`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({})
});
```

---

## 3) Reject Withdraw Request

### Endpoint
```http
PATCH /admin/:id/reject
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body
- `note` = required

### Example
```http
PATCH /admin/65f1c9d8b12ab34cd56ef789/reject
```

### Example Body
```json
{
  "note": "Invalid withdrawal information"
}
```

### cURL
```bash
curl -X PATCH http://localhost:5000/admin/65f1c9d8b12ab34cd56ef789/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "note": "Invalid withdrawal information"
  }'
```

### JavaScript fetch
```js
const withdrawId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/${withdrawId}/reject`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    note: "Invalid withdrawal information"
  })
});
```

---

## 4) Withdraw Cursor Pagination Example

### cURL
```bash
curl -X GET "http://localhost:5000/admin/all-withdraw?status=pending&limit=10&cursor=%7B%22createdAt%22%3A%222026-03-20T10%3A00%3A00.000Z%22%2C%22_id%22%3A%22661111111111111111111111%22%7D" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const cursor = encodeURIComponent(JSON.stringify({
  createdAt: "2026-03-20T10:00:00.000Z",
  _id: "661111111111111111111111"
}));

fetch(`http://localhost:5000/admin/all-withdraw?status=pending&limit=10&cursor=${cursor}`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
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

## 6) Notes

### Base Route
```txt
/admin
```

### Routes
```txt
GET   /admin/all-withdraw
PATCH /admin/:id/approve
PATCH /admin/:id/reject
```

### Query Params
```txt
status
limit
cursor
```

### Status Values
```txt
pending
approved
rejected
```

### Approve Body
```txt
note (optional)
```

### Reject Body
```txt
note (required)
```

### Security
```txt
All routes require authGuard + isAdmin
```