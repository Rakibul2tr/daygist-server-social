# Admin User API Hitting Guide

Base route:

```bash
/admin
```

যেসব endpoint-এ `authGuard` + `isAdmin` আছে সেখানে token পাঠাতে হবে:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 1) Google Admin Login

### Endpoint
```http
POST /admin/google-admin-login
```

### Headers
```http
Content-Type: application/json
```

### Body
```json
{
  "idToken": "google_id_token_here"
}
```

অথবা

```json
{
  "token": "google_id_token_here"
}
```

### cURL
```bash
curl -X POST http://localhost:5000/admin/google-admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "google_id_token_here"
  }'
```

### JavaScript fetch
```js
fetch("http://localhost:5000/admin/google-admin-login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    idToken: "google_id_token_here"
  })
});
```

---

## 2) Get All Users

### Endpoint
```http
GET /admin/users
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Params
- `page` = optional
- `limit` = optional
- `search` = optional
- `role` = optional
- `isBlocked` = optional
- `isDeleted` = optional

### Example
```http
GET /admin/users?page=1&limit=10
```

### Example with Search
```http
GET /admin/users?page=1&limit=10&search=rakib
```

### Example with Role
```http
GET /admin/users?page=1&limit=10&role=ADMIN
```

### Example with Filters
```http
GET /admin/users?page=1&limit=10&search=rakib&role=USER&isBlocked=false&isDeleted=false
```

### cURL
```bash
curl -X GET "http://localhost:5000/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### cURL with filters
```bash
curl -X GET "http://localhost:5000/admin/users?page=1&limit=10&search=rakib&role=USER&isBlocked=false&isDeleted=false" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
fetch("http://localhost:5000/admin/users?page=1&limit=10", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

### JavaScript fetch with filters
```js
fetch("http://localhost:5000/admin/users?page=1&limit=10&search=rakib&role=USER&isBlocked=false&isDeleted=false", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 3) Get User By ID

### Endpoint
```http
GET /admin/users/:id
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Example
```http
GET /admin/users/65f1c9d8b12ab34cd56ef789
```

### cURL
```bash
curl -X GET http://localhost:5000/admin/users/65f1c9d8b12ab34cd56ef789 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/users/${userId}`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 4) Update User Controls (All-in-One)

### Endpoint
```http
PATCH /admin/users/:id/update-controls
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body Fields
- `role` = optional
- `isBlocked` = optional
- `isDeleted` = optional
- `forceLogout` = optional

### Example Body
```json
{
  "role": "SELLER",
  "isBlocked": false,
  "isDeleted": false,
  "forceLogout": false
}
```

### Example for only role update
```json
{
  "role": "MODERATOR"
}
```

### Example for only block
```json
{
  "isBlocked": true
}
```

### Example for soft delete
```json
{
  "isDeleted": true
}
```

### Example for force logout
```json
{
  "forceLogout": true
}
```

### cURL
```bash
curl -X PATCH http://localhost:5000/admin/users/65f1c9d8b12ab34cd56ef789/update-controls \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "role": "SELLER",
    "isBlocked": false,
    "isDeleted": false,
    "forceLogout": false
  }'
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/users/${userId}/update-controls`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    role: "SELLER",
    isBlocked: false,
    isDeleted: false,
    forceLogout: false
  })
});
```

---

## 5) Admin Overview Info

### Endpoint
```http
GET /admin/overview-info
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### cURL
```bash
curl -X GET http://localhost:5000/admin/overview-info \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
fetch("http://localhost:5000/admin/overview-info", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 6) Set User Role

### Endpoint
```http
PATCH /admin/users/:id/role
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body
```json
{
  "role": "ADMIN"
}
```

### Allowed Example Values
```txt
USER
ADMIN
MODERATOR
```

### cURL
```bash
curl -X PATCH http://localhost:5000/admin/users/65f1c9d8b12ab34cd56ef789/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "role": "ADMIN"
  }'
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/users/${userId}/role`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    role: "ADMIN"
  })
});
```

---

## 7) Block / Unblock User

### Endpoint
```http
PATCH /admin/users/:id/block
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Block Body
```json
{
  "blocked": true
}
```

### Unblock Body
```json
{
  "blocked": false
}
```

### cURL Block
```bash
curl -X PATCH http://localhost:5000/admin/users/65f1c9d8b12ab34cd56ef789/block \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "blocked": true
  }'
```

### cURL Unblock
```bash
curl -X PATCH http://localhost:5000/admin/users/65f1c9d8b12ab34cd56ef789/block \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "blocked": false
  }'
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/users/${userId}/block`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    blocked: true
  })
});
```

---

## 8) Verify / Unverify User

### Endpoint
```http
PATCH /admin/users/:id/verify
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Verify Body
```json
{
  "verified": true
}
```

### Unverify Body
```json
{
  "verified": false
}
```

### cURL Verify
```bash
curl -X PATCH http://localhost:5000/admin/users/65f1c9d8b12ab34cd56ef789/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "verified": true
  }'
```

### cURL Unverify
```bash
curl -X PATCH http://localhost:5000/admin/users/65f1c9d8b12ab34cd56ef789/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "verified": false
  }'
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/users/${userId}/verify`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    verified: true
  })
});
```

---

## 9) Delete User

### Endpoint
```http
DELETE /admin/users/:id
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Example
```http
DELETE /admin/users/65f1c9d8b12ab34cd56ef789
```

### cURL
```bash
curl -X DELETE http://localhost:5000/admin/users/65f1c9d8b12ab34cd56ef789 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/users/${userId}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 10) Restore User

### Endpoint
```http
PATCH /admin/users/:id/restore
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### cURL
```bash
curl -X PATCH http://localhost:5000/admin/users/65f1c9d8b12ab34cd56ef789/restore \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/users/${userId}/restore`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 11) Force Logout User

### Endpoint
```http
PATCH /admin/users/:id/force-logout
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### cURL
```bash
curl -X PATCH http://localhost:5000/admin/users/65f1c9d8b12ab34cd56ef789/force-logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/users/${userId}/force-logout`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 12) Common Frontend Header Example

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

## 13) React Native / Frontend Examples

### Admin Login
```js
const adminLogin = async idToken => {
  const res = await fetch("http://localhost:5000/admin/google-admin-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ idToken })
  });

  return await res.json();
};
```

### Get Users
```js
const getUsers = async () => {
  const res = await fetch("http://localhost:5000/admin/users?page=1&limit=10", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return await res.json();
};
```

### Update Controls
```js
const updateUserControls = async userId => {
  const res = await fetch(`http://localhost:5000/admin/users/${userId}/update-controls`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      role: "MODERATOR",
      isBlocked: false,
      isDeleted: false,
      forceLogout: false
    })
  });

  return await res.json();
};
```

---

## 14) Notes

### Admin Routes
```txt
POST /admin/google-admin-login
GET /admin/users
GET /admin/users/:id
PATCH /admin/users/:id/update-controls
GET /admin/overview-info
PATCH /admin/users/:id/role
PATCH /admin/users/:id/block
PATCH /admin/users/:id/verify
DELETE /admin/users/:id
PATCH /admin/users/:id/restore
PATCH /admin/users/:id/force-logout
```

### Get Users Filters
```txt
page
limit
search
role
isBlocked
isDeleted
```

### update-controls Body Fields
```txt
role
isBlocked
isDeleted
forceLogout
```

### Allowed Roles in update-controls
```txt
USER
ADMIN
SELLER
MODERATOR
SUPPER ADMIN
```

### Allowed Roles in role endpoint
```txt
USER
ADMIN
MODERATOR
```

### Protected Routes
```txt
All routes except google-admin-login require authGuard + isAdmin
```