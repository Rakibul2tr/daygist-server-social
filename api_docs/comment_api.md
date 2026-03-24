# Comment API Hitting Guide

Base route:

```bash
/comment
```

যেসব endpoint-এ `authGuard` আছে সেখানে token পাঠাতে হবে:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 1) Get Post Comments

### Endpoint
```http
GET /comment/:postId/comments
```

### Description
Top-level comments আনার জন্য use হবে।

### Query Params
- `type=post` অথবা `type=groupPost`
- `limit` = optional, default 20, max 50
- `cursor` = optional JSON string

### Example
```http
GET /comment/661111111111111111111111/comments?type=post&limit=10
```

### cURL
```bash
curl -X GET "http://localhost:5000/comment/661111111111111111111111/comments?type=post&limit=10"
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/comment/${postId}/comments?type=post&limit=10`, {
  method: "GET"
});
```

---

## 2) Create Comment

### Endpoint
```http
POST /comment/:postId/comments
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Description
Post বা groupPost এ নতুন comment create করতে use হবে।

### Body
```json
{
  "text": "Nice post",
  "type": "post"
}
```

### cURL
```bash
curl -X POST http://localhost:5000/comment/661111111111111111111111/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "text": "Nice post",
    "type": "post"
  }'
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/comment/${postId}/comments`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    text: "Nice post",
    type: "post"
  })
});
```

---

## 3) Create Reply Comment

### Endpoint
```http
POST /comment/:postId/comments
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Description
আগের comment এর reply create করতে `parentId` পাঠাতে হবে।

### Body
```json
{
  "text": "Thanks for your comment",
  "parentId": "662222222222222222222222",
  "type": "post"
}
```

### cURL
```bash
curl -X POST http://localhost:5000/comment/661111111111111111111111/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "text": "Thanks for your comment",
    "parentId": "662222222222222222222222",
    "type": "post"
  }'
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";
const parentId = "662222222222222222222222";

fetch(`http://localhost:5000/comment/${postId}/comments`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    text: "Thanks for your comment",
    parentId,
    type: "post"
  })
});
```

---

## 4) Create Group Post Comment

### Endpoint
```http
POST /comment/:postId/comments
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body
```json
{
  "text": "Nice group post",
  "type": "groupPost"
}
```

### cURL
```bash
curl -X POST http://localhost:5000/comment/661111111111111111111111/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "text": "Nice group post",
    "type": "groupPost"
  }'
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/comment/${postId}/comments`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    text: "Nice group post",
    type: "groupPost"
  })
});
```

---

## 5) Get Comment Replies

### Endpoint
```http
GET /comment/:commentId/replies
```

### Description
একটা comment এর replies আনার জন্য use হবে।

### Query Params
- `limit` = optional, default 20, max 50
- `cursor` = optional JSON string

### Example
```http
GET /comment/662222222222222222222222/replies?limit=10
```

### cURL
```bash
curl -X GET "http://localhost:5000/comment/662222222222222222222222/replies?limit=10"
```

### JavaScript fetch
```js
const commentId = "662222222222222222222222";

fetch(`http://localhost:5000/comment/${commentId}/replies?limit=10`, {
  method: "GET"
});
```

---

## 6) Delete Comment

### Endpoint
```http
DELETE /comment/:commentId
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Description
নিজের comment delete করতে use হবে। Admin ও delete করতে পারবে।

### Example
```http
DELETE /comment/662222222222222222222222
```

### cURL
```bash
curl -X DELETE http://localhost:5000/comment/662222222222222222222222 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const commentId = "662222222222222222222222";

fetch(`http://localhost:5000/comment/${commentId}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 7) Comments Cursor Pagination Example

যেসব comments/replies endpoint এ `cursor` support করে সেখানে next page hit করার example:

### cURL
```bash
curl -X GET "http://localhost:5000/comment/661111111111111111111111/comments?type=post&limit=10&cursor=%7B%22createdAt%22%3A%222026-03-20T10%3A00%3A00.000Z%22%2C%22_id%22%3A%22662222222222222222222222%22%7D"
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

const cursor = encodeURIComponent(JSON.stringify({
  createdAt: "2026-03-20T10:00:00.000Z",
  _id: "662222222222222222222222"
}));

fetch(`http://localhost:5000/comment/${postId}/comments?type=post&limit=10&cursor=${cursor}`, {
  method: "GET"
});
```

---

## 8) Replies Cursor Pagination Example

### cURL
```bash
curl -X GET "http://localhost:5000/comment/662222222222222222222222/replies?limit=10&cursor=%7B%22createdAt%22%3A%222026-03-20T10%3A00%3A00.000Z%22%2C%22_id%22%3A%22663333333333333333333333%22%7D"
```

### JavaScript fetch
```js
const commentId = "662222222222222222222222";

const cursor = encodeURIComponent(JSON.stringify({
  createdAt: "2026-03-20T10:00:00.000Z",
  _id: "663333333333333333333333"
}));

fetch(`http://localhost:5000/comment/${commentId}/replies?limit=10&cursor=${cursor}`, {
  method: "GET"
});
```

---

## 9) Common Frontend Header Example

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

## 10) Notes

### Comment Type Values
```txt
post
groupPost
```

### Create Normal Comment Body
```json
{
  "text": "Nice post",
  "type": "post"
}
```

### Create Reply Body
```json
{
  "text": "This is a reply",
  "parentId": "662222222222222222222222",
  "type": "post"
}
```

### Create Group Comment Body
```json
{
  "text": "Nice group post",
  "type": "groupPost"
}
```