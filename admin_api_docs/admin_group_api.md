# Admin Group API Hitting Guide

Base route:

```bash
/admin
```

সব route-এই `authGuard` + `isAdmin` আছে, তাই token লাগবে:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 1) Create Group

### Endpoint
```http
POST /admin/createGroup
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body
```json
{
  "name": "Travel Lovers",
  "privacy": "private",
  "about": "A group for travel lovers",
  "coverUrl": {
    "key": "groups/cover-1.jpg",
    "url": "https://example.com/groups/cover-1.jpg",
    "provider": "wasabi"
  },
  "category": "travel",
  "location": {
    "country": "Bangladesh",
    "city": "Khulna"
  },
  "rules": [
    "Be respectful",
    "No spam"
  ],
  "approval": {
    "memberApprovalRequired": true,
    "postApprovalRequired": false
  }
}
```

### cURL
```bash
curl -X POST http://localhost:5000/admin/createGroup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Travel Lovers",
    "privacy": "private",
    "about": "A group for travel lovers",
    "coverUrl": {
      "key": "groups/cover-1.jpg",
      "url": "https://example.com/groups/cover-1.jpg",
      "provider": "wasabi"
    },
    "category": "travel",
    "location": {
      "country": "Bangladesh",
      "city": "Khulna"
    },
    "rules": [
      "Be respectful",
      "No spam"
    ],
    "approval": {
      "memberApprovalRequired": true,
      "postApprovalRequired": false
    }
  }'
```

### JavaScript fetch
```js
fetch("http://localhost:5000/admin/createGroup", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    name: "Travel Lovers",
    privacy: "private",
    about: "A group for travel lovers",
    coverUrl: {
      key: "groups/cover-1.jpg",
      url: "https://example.com/groups/cover-1.jpg",
      provider: "wasabi"
    },
    category: "travel",
    location: {
      country: "Bangladesh",
      city: "Khulna"
    },
    rules: ["Be respectful", "No spam"],
    approval: {
      memberApprovalRequired: true,
      postApprovalRequired: false
    }
  })
});
```

---

## 2) Get My Groups

### Endpoint
```http
GET /admin/my-groups
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Params
- `limit` = optional, default 20, max 50
- `cursor` = optional JSON string
- `status` = optional
  - `active`
  - `requested`

### Example
```http
GET /admin/my-groups?limit=10
```

### Example with status
```http
GET /admin/my-groups?limit=10&status=active
```

### cURL
```bash
curl -X GET "http://localhost:5000/admin/my-groups?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### cURL with status
```bash
curl -X GET "http://localhost:5000/admin/my-groups?limit=10&status=active" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
fetch("http://localhost:5000/admin/my-groups?limit=10", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

### JavaScript fetch with status
```js
fetch("http://localhost:5000/admin/my-groups?limit=10&status=active", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 3) Get Group Details

### Endpoint
```http
GET /admin/:groupId/details
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Example
```http
GET /admin/65f1c9d8b12ab34cd56ef789/details
```

### cURL
```bash
curl -X GET http://localhost:5000/admin/65f1c9d8b12ab34cd56ef789/details \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const groupId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/${groupId}/details`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 4) Get All Groups

### Endpoint
```http
GET /admin/Allgroups
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Params
- `limit` = optional, default 50, max 200

### Example
```http
GET /admin/Allgroups
```

### Example with limit
```http
GET /admin/Allgroups?limit=30
```

### cURL
```bash
curl -X GET http://localhost:5000/admin/Allgroups \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### cURL with limit
```bash
curl -X GET "http://localhost:5000/admin/Allgroups?limit=30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
fetch("http://localhost:5000/admin/Allgroups", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

### JavaScript fetch with limit
```js
fetch("http://localhost:5000/admin/Allgroups?limit=30", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 5) Update Group

### Endpoint
```http
PATCH /admin/groups/:groupId
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Allowed Fields
- `name`
- `privacy`
- `about`
- `coverUrl`
- `category`
- `location`
- `rules`
- `approval`

### Body
```json
{
  "name": "Updated Travel Lovers",
  "privacy": "public",
  "about": "Updated group about",
  "coverUrl": {
    "key": "groups/new-cover.jpg",
    "url": "https://example.com/groups/new-cover.jpg",
    "provider": "wasabi"
  },
  "category": "tourism",
  "location": {
    "country": "Bangladesh",
    "city": "Dhaka"
  },
  "rules": [
    "Respect everyone",
    "No links without permission"
  ],
  "approval": {
    "memberApprovalRequired": false,
    "postApprovalRequired": true
  }
}
```

### cURL
```bash
curl -X PATCH http://localhost:5000/admin/groups/65f1c9d8b12ab34cd56ef789 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Updated Travel Lovers",
    "privacy": "public",
    "about": "Updated group about",
    "coverUrl": {
      "key": "groups/new-cover.jpg",
      "url": "https://example.com/groups/new-cover.jpg",
      "provider": "wasabi"
    },
    "category": "tourism",
    "location": {
      "country": "Bangladesh",
      "city": "Dhaka"
    },
    "rules": [
      "Respect everyone",
      "No links without permission"
    ],
    "approval": {
      "memberApprovalRequired": false,
      "postApprovalRequired": true
    }
  }'
```

### JavaScript fetch
```js
const groupId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/groups/${groupId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    name: "Updated Travel Lovers",
    privacy: "public",
    about: "Updated group about",
    coverUrl: {
      key: "groups/new-cover.jpg",
      url: "https://example.com/groups/new-cover.jpg",
      provider: "wasabi"
    },
    category: "tourism",
    location: {
      country: "Bangladesh",
      city: "Dhaka"
    },
    rules: [
      "Respect everyone",
      "No links without permission"
    ],
    approval: {
      memberApprovalRequired: false,
      postApprovalRequired: true
    }
  })
});
```

---

## 6) Soft Delete Group

### Endpoint
```http
PATCH /admin/groups/:groupId/soft
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Example
```http
PATCH /admin/groups/65f1c9d8b12ab34cd56ef789/soft
```

### cURL
```bash
curl -X PATCH http://localhost:5000/admin/groups/65f1c9d8b12ab34cd56ef789/soft \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const groupId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/groups/${groupId}/soft`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 7) Restore Group

### Endpoint
```http
PATCH /admin/groups/:groupId/restore
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Example
```http
PATCH /admin/groups/65f1c9d8b12ab34cd56ef789/restore
```

### cURL
```bash
curl -X PATCH http://localhost:5000/admin/groups/65f1c9d8b12ab34cd56ef789/restore \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const groupId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/groups/${groupId}/restore`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 8) Hard Delete Group

### Endpoint
```http
DELETE /admin/groups/:groupId/hard
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Example
```http
DELETE /admin/groups/65f1c9d8b12ab34cd56ef789/hard
```

### cURL
```bash
curl -X DELETE http://localhost:5000/admin/groups/65f1c9d8b12ab34cd56ef789/hard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const groupId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/groups/${groupId}/hard`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 9) My Groups Cursor Pagination Example

### cURL
```bash
curl -X GET "http://localhost:5000/admin/my-groups?limit=10&cursor=%7B%22section%22%3A0%2C%22createdAt%22%3A%222026-03-20T10%3A00%3A00.000Z%22%2C%22_id%22%3A%22661111111111111111111111%22%7D" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const cursor = encodeURIComponent(JSON.stringify({
  section: 0,
  createdAt: "2026-03-20T10:00:00.000Z",
  _id: "661111111111111111111111"
}));

fetch(`http://localhost:5000/admin/my-groups?limit=10&cursor=${cursor}`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
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

### JSON Request Header
```js
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`
};
```

---

## 11) Notes

### Base Route
```txt
/admin
```

### Routes
```txt
POST   /admin/createGroup
GET    /admin/my-groups
GET    /admin/:groupId/details
GET    /admin/Allgroups
PATCH  /admin/groups/:groupId
PATCH  /admin/groups/:groupId/soft
PATCH  /admin/groups/:groupId/restore
DELETE /admin/groups/:groupId/hard
```

### Create Group Required Fields
```txt
name
privacy
```

### Privacy Values
```txt
public
private
```

### Update Allowed Fields
```txt
name
privacy
about
coverUrl
category
location
rules
approval
```

### My Groups Query Params
```txt
limit
cursor
status
```

### My Groups Status Values
```txt
active
requested
```

### All Groups Query Params
```txt
limit
```

### Security
```txt
All routes require authGuard + isAdmin
```