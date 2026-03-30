# Follow API Hitting Guide

Base route:

```bash
/follow
```

যেসব endpoint-এ `authGuard` আছে সেখানে token পাঠাতে হবে:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 1) Follow User

### Endpoint
```http
POST /follow/:userId
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Description
একজন user কে follow করার জন্য use হবে।

### Example
```http
POST /follow/65f1c9d8b12ab34cd56ef789
```

### cURL
```bash
curl -X POST http://localhost:5000/follow/65f1c9d8b12ab34cd56ef789 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/follow/${userId}`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 2) Unfollow User

### Endpoint
```http
DELETE /follow/:userId
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Description
একজন user কে unfollow করার জন্য use হবে।

### Example
```http
DELETE /follow/65f1c9d8b12ab34cd56ef789
```

### cURL
```bash
curl -X DELETE http://localhost:5000/follow/65f1c9d8b12ab34cd56ef789 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/follow/${userId}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 3) Get Followers List

### Endpoint
```http
GET /follow/:userId/followers
```

### Description
নির্দিষ্ট user-এর followers list আনার জন্য use হবে।

### Query Params
- `limit` = optional, default 20, max 50
- `cursor` = optional JSON string
- `q` = optional search text by `name` or `username`

### Example
```http
GET /follow/65f1c9d8b12ab34cd56ef789/followers?limit=10
```

### Example with Search
```http
GET /follow/65f1c9d8b12ab34cd56ef789/followers?limit=10&q=rakib
```

### cURL
```bash
curl -X GET "http://localhost:5000/follow/65f1c9d8b12ab34cd56ef789/followers?limit=10"
```

### cURL with Search
```bash
curl -X GET "http://localhost:5000/follow/65f1c9d8b12ab34cd56ef789/followers?limit=10&q=rakib"
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/follow/${userId}/followers?limit=10`, {
  method: "GET"
});
```

### JavaScript fetch with Search
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/follow/${userId}/followers?limit=10&q=rakib`, {
  method: "GET"
});
```

---

## 4) Get Following List

### Endpoint
```http
GET /follow/:userId/following
```

### Description
নির্দিষ্ট user যাদের follow করে তাদের list আনার জন্য use হবে।

### Query Params
- `limit` = optional, default 20, max 50
- `cursor` = optional JSON string
- `q` = optional search text by `name` or `username`

### Example
```http
GET /follow/65f1c9d8b12ab34cd56ef789/following?limit=10
```

### Example with Search
```http
GET /follow/65f1c9d8b12ab34cd56ef789/following?limit=10&q=hasan
```

### cURL
```bash
curl -X GET "http://localhost:5000/follow/65f1c9d8b12ab34cd56ef789/following?limit=10"
```

### cURL with Search
```bash
curl -X GET "http://localhost:5000/follow/65f1c9d8b12ab34cd56ef789/following?limit=10&q=hasan"
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/follow/${userId}/following?limit=10`, {
  method: "GET"
});
```

### JavaScript fetch with Search
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/follow/${userId}/following?limit=10&q=hasan`, {
  method: "GET"
});
```

---

## 5) Get Follow Status

### Endpoint
```http
GET /follow/:userId/status
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Description
Logged-in user target user-কে follow করে কিনা check করার জন্য use হবে।

### Example
```http
GET /follow/65f1c9d8b12ab34cd56ef789/status
```

### cURL
```bash
curl -X GET http://localhost:5000/follow/65f1c9d8b12ab34cd56ef789/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/follow/${userId}/status`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 6) Followers Cursor Pagination Example

### cURL
```bash
curl -X GET "http://localhost:5000/follow/65f1c9d8b12ab34cd56ef789/followers?limit=10&cursor=%7B%22createdAt%22%3A%222026-03-20T10%3A00%3A00.000Z%22%2C%22_id%22%3A%22661111111111111111111111%22%7D"
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

const cursor = encodeURIComponent(JSON.stringify({
  createdAt: "2026-03-20T10:00:00.000Z",
  _id: "661111111111111111111111"
}));

fetch(`http://localhost:5000/follow/${userId}/followers?limit=10&cursor=${cursor}`, {
  method: "GET"
});
```

---

## 7) Following Cursor Pagination Example

### cURL
```bash
curl -X GET "http://localhost:5000/follow/65f1c9d8b12ab34cd56ef789/following?limit=10&cursor=%7B%22createdAt%22%3A%222026-03-20T10%3A00%3A00.000Z%22%2C%22_id%22%3A%22661111111111111111111111%22%7D"
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

const cursor = encodeURIComponent(JSON.stringify({
  createdAt: "2026-03-20T10:00:00.000Z",
  _id: "661111111111111111111111"
}));

fetch(`http://localhost:5000/follow/${userId}/following?limit=10&cursor=${cursor}`, {
  method: "GET"
});
```

---

## 8) Followers Search + Cursor Example

### cURL
```bash
curl -X GET "http://localhost:5000/follow/65f1c9d8b12ab34cd56ef789/followers?limit=10&q=rakib&cursor=%7B%22createdAt%22%3A%222026-03-20T10%3A00%3A00.000Z%22%2C%22_id%22%3A%22661111111111111111111111%22%7D"
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";
const q = encodeURIComponent("rakib");

const cursor = encodeURIComponent(JSON.stringify({
  createdAt: "2026-03-20T10:00:00.000Z",
  _id: "661111111111111111111111"
}));

fetch(`http://localhost:5000/follow/${userId}/followers?limit=10&q=${q}&cursor=${cursor}`, {
  method: "GET"
});
```

---

## 9) Following Search + Cursor Example

### cURL
```bash
curl -X GET "http://localhost:5000/follow/65f1c9d8b12ab34cd56ef789/following?limit=10&q=hasan&cursor=%7B%22createdAt%22%3A%222026-03-20T10%3A00%3A00.000Z%22%2C%22_id%22%3A%22661111111111111111111111%22%7D"
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";
const q = encodeURIComponent("hasan");

const cursor = encodeURIComponent(JSON.stringify({
  createdAt: "2026-03-20T10:00:00.000Z",
  _id: "661111111111111111111111"
}));

fetch(`http://localhost:5000/follow/${userId}/following?limit=10&q=${q}&cursor=${cursor}`, {
  method: "GET"
});
```

---

## 10) Common Frontend Header Example

### Auth Header
```js
const headers = {
  Authorization: `Bearer ${token}`
};
```

---

## 11) React Native Follow Button Example

### Follow
```js
const handleFollow = async userId => {
  await fetch(`http://localhost:5000/follow/${userId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};
```

### Unfollow
```js
const handleUnfollow = async userId => {
  await fetch(`http://localhost:5000/follow/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};
```

### Check Status
```js
const checkFollowStatus = async userId => {
  const res = await fetch(`http://localhost:5000/follow/${userId}/status`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json();
  return data;
};
```

---

## 12) Notes

### Follow Routes
```txt
POST /follow/:userId
DELETE /follow/:userId
GET /follow/:userId/followers
GET /follow/:userId/following
GET /follow/:userId/status
```

### Search Query
```txt
q = search by name or username
```

### Pagination
```txt
limit = default 20, max 50
cursor = optional JSON string
```

### Public Routes
```txt
GET /follow/:userId/followers
GET /follow/:userId/following
```

### Protected Routes
```txt
POST /follow/:userId
DELETE /follow/:userId
GET /follow/:userId/status
```