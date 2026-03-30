# Admin Group Post API Hitting Guide

Base route:

```bash
/admin/groups/post
```

সব route-এই `authGuard` + `isAdmin` আছে, তাই token লাগবে:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 1) Create Group Post

### Endpoint
```http
POST /admin/groups/post/:groupId/posts
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Description
Admin group এর মধ্যে text / image / video post create করতে পারবে।

### Allowed Types
```txt
text
image
video
```

---

## 1.1) Create Text Group Post

### Body
```json
{
  "type": "text",
  "text": "Hello group members",
  "backgroundUrl": "https://example.com/bg.jpg",
  "textStyle": {
    "color": "#ffffff",
    "fontSize": 24,
    "fontWeight": "700",
    "align": "center"
  }
}
```

### cURL
```bash
curl -X POST http://localhost:5000/admin/groups/post/65f1c9d8b12ab34cd56ef789/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "text",
    "text": "Hello group members",
    "backgroundUrl": "https://example.com/bg.jpg",
    "textStyle": {
      "color": "#ffffff",
      "fontSize": 24,
      "fontWeight": "700",
      "align": "center"
    }
  }'
```

### JavaScript fetch
```js
const groupId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/groups/post/${groupId}/posts`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    type: "text",
    text: "Hello group members",
    backgroundUrl: "https://example.com/bg.jpg",
    textStyle: {
      color: "#ffffff",
      fontSize: 24,
      fontWeight: "700",
      align: "center"
    }
  })
});
```

---

## 1.2) Create Image Group Post

### Body
```json
{
  "type": "image",
  "caption": "Group travel photos",
  "layout": "grid2",
  "images": [
    {
      "url": "https://example.com/photo1.jpg",
      "provider": "wasabi",
      "key": "group-posts/photo1.jpg"
    },
    {
      "url": "https://example.com/photo2.jpg",
      "provider": "wasabi",
      "key": "group-posts/photo2.jpg"
    }
  ],
  "category": "general",
  "subCategory": "travel"
}
```

### cURL
```bash
curl -X POST http://localhost:5000/admin/groups/post/65f1c9d8b12ab34cd56ef789/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "image",
    "caption": "Group travel photos",
    "layout": "grid2",
    "images": [
      {
        "url": "https://example.com/photo1.jpg",
        "provider": "wasabi",
        "key": "group-posts/photo1.jpg"
      },
      {
        "url": "https://example.com/photo2.jpg",
        "provider": "wasabi",
        "key": "group-posts/photo2.jpg"
      }
    ],
    "category": "general",
    "subCategory": "travel"
  }'
```

### JavaScript fetch
```js
const groupId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/groups/post/${groupId}/posts`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    type: "image",
    caption: "Group travel photos",
    layout: "grid2",
    images: [
      {
        url: "https://example.com/photo1.jpg",
        provider: "wasabi",
        key: "group-posts/photo1.jpg"
      },
      {
        url: "https://example.com/photo2.jpg",
        provider: "wasabi",
        key: "group-posts/photo2.jpg"
      }
    ],
    category: "general",
    subCategory: "travel"
  })
});
```

---

## 1.3) Create Video Group Post

### Body
```json
{
  "type": "video",
  "caption": "Watch this group video",
  "video": {
    "url": "https://example.com/video.mp4",
    "thumbnailUrl": "https://example.com/thumb.jpg",
    "provider": "wasabi",
    "key": "group-posts/video.mp4"
  },
  "mutedByDefault": false,
  "loop": false,
  "category": "general",
  "subCategory": "education"
}
```

### cURL
```bash
curl -X POST http://localhost:5000/admin/groups/post/65f1c9d8b12ab34cd56ef789/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "video",
    "caption": "Watch this group video",
    "video": {
      "url": "https://example.com/video.mp4",
      "thumbnailUrl": "https://example.com/thumb.jpg",
      "provider": "wasabi",
      "key": "group-posts/video.mp4"
    },
    "mutedByDefault": false,
    "loop": false,
    "category": "general",
    "subCategory": "education"
  }'
```

### JavaScript fetch
```js
const groupId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/groups/post/${groupId}/posts`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    type: "video",
    caption: "Watch this group video",
    video: {
      url: "https://example.com/video.mp4",
      thumbnailUrl: "https://example.com/thumb.jpg",
      provider: "wasabi",
      key: "group-posts/video.mp4"
    },
    mutedByDefault: false,
    loop: false,
    category: "general",
    subCategory: "education"
  })
});
```

---

## 2) Get All Group Posts

### Endpoint
```http
GET /admin/groups/post/group-posts
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Params
- `limit` = optional, default 50, max 200
- `cursor` = optional JSON string
- `groupId` = optional
- `authorId` = optional
- `type` = optional (`text`, `image`, `video`)
- `q` = optional search by `caption` or `text`

### Example
```http
GET /admin/groups/post/group-posts?limit=20
```

### Example with filters
```http
GET /admin/groups/post/group-posts?limit=20&groupId=65f1c9d8b12ab34cd56ef789&type=image&q=travel
```

### cURL
```bash
curl -X GET "http://localhost:5000/admin/groups/post/group-posts?limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### cURL with filters
```bash
curl -X GET "http://localhost:5000/admin/groups/post/group-posts?limit=20&groupId=65f1c9d8b12ab34cd56ef789&type=image&q=travel" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
fetch("http://localhost:5000/admin/groups/post/group-posts?limit=20", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

### JavaScript fetch with filters
```js
fetch("http://localhost:5000/admin/groups/post/group-posts?limit=20&groupId=65f1c9d8b12ab34cd56ef789&type=image&q=travel", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 3) Get Group Posts By Group ID

### Endpoint
```http
GET /admin/groups/post/:groupId/posts
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Params
- `limit` = optional, default 20, max 50
- `cursor` = optional JSON string

### Example
```http
GET /admin/groups/post/65f1c9d8b12ab34cd56ef789/posts?limit=10
```

### cURL
```bash
curl -X GET "http://localhost:5000/admin/groups/post/65f1c9d8b12ab34cd56ef789/posts?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const groupId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/groups/post/${groupId}/posts?limit=10`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 4) Get Single Group Post

### Endpoint
```http
GET /admin/groups/post/:groupId/posts/:postId
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Example
```http
GET /admin/groups/post/65f1c9d8b12ab34cd56ef789/posts/661111111111111111111111
```

### cURL
```bash
curl -X GET http://localhost:5000/admin/groups/post/65f1c9d8b12ab34cd56ef789/posts/661111111111111111111111 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const groupId = "65f1c9d8b12ab34cd56ef789";
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/admin/groups/post/${groupId}/posts/${postId}`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 5) Update Group Post

### Endpoint
```http
PATCH /admin/groups/post/:groupId/posts/:postId
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Allowed Fields
```txt
text
caption
backgroundUrl
textStyle
images
layout
video
mutedByDefault
loop
category
subCategory
```

---

## 5.1) Update Text Group Post

### Body
```json
{
  "text": "Updated admin group post text",
  "backgroundUrl": "https://example.com/new-bg.jpg",
  "textStyle": {
    "color": "#ffffff",
    "fontSize": 22,
    "fontWeight": "700",
    "align": "center"
  }
}
```

### cURL
```bash
curl -X PATCH http://localhost:5000/admin/groups/post/65f1c9d8b12ab34cd56ef789/posts/661111111111111111111111 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "text": "Updated admin group post text",
    "backgroundUrl": "https://example.com/new-bg.jpg",
    "textStyle": {
      "color": "#ffffff",
      "fontSize": 22,
      "fontWeight": "700",
      "align": "center"
    }
  }'
```

### JavaScript fetch
```js
const groupId = "65f1c9d8b12ab34cd56ef789";
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/admin/groups/post/${groupId}/posts/${postId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    text: "Updated admin group post text",
    backgroundUrl: "https://example.com/new-bg.jpg",
    textStyle: {
      color: "#ffffff",
      fontSize: 22,
      fontWeight: "700",
      align: "center"
    }
  })
});
```

---

## 5.2) Update Image Group Post

### Body
```json
{
  "caption": "Updated image caption",
  "layout": "grid3",
  "images": [
    {
      "url": "https://example.com/new1.jpg",
      "provider": "wasabi",
      "key": "group-posts/new1.jpg"
    },
    {
      "url": "https://example.com/new2.jpg",
      "provider": "wasabi",
      "key": "group-posts/new2.jpg"
    }
  ],
  "category": "general",
  "subCategory": "travel"
}
```

### cURL
```bash
curl -X PATCH http://localhost:5000/admin/groups/post/65f1c9d8b12ab34cd56ef789/posts/661111111111111111111111 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "caption": "Updated image caption",
    "layout": "grid3",
    "images": [
      {
        "url": "https://example.com/new1.jpg",
        "provider": "wasabi",
        "key": "group-posts/new1.jpg"
      },
      {
        "url": "https://example.com/new2.jpg",
        "provider": "wasabi",
        "key": "group-posts/new2.jpg"
      }
    ],
    "category": "general",
    "subCategory": "travel"
  }'
```

---

## 5.3) Update Video Group Post

### Body
```json
{
  "caption": "Updated video caption",
  "video": {
    "url": "https://example.com/new-video.mp4",
    "thumbnailUrl": "https://example.com/new-thumb.jpg",
    "provider": "wasabi",
    "key": "group-posts/new-video.mp4"
  },
  "mutedByDefault": true,
  "loop": true,
  "category": "general",
  "subCategory": "education"
}
```

### cURL
```bash
curl -X PATCH http://localhost:5000/admin/groups/post/65f1c9d8b12ab34cd56ef789/posts/661111111111111111111111 \
  -H "Content-Type": "application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "caption": "Updated video caption",
    "video": {
      "url": "https://example.com/new-video.mp4",
      "thumbnailUrl": "https://example.com/new-thumb.jpg",
      "provider": "wasabi",
      "key": "group-posts/new-video.mp4"
    },
    "mutedByDefault": true,
    "loop": true,
    "category": "general",
    "subCategory": "education"
  }'
```

---

## 6) Delete Group Post

### Endpoint
```http
DELETE /admin/groups/post/:groupId/posts/:postId
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Description
Soft delete করবে।

### Example
```http
DELETE /admin/groups/post/65f1c9d8b12ab34cd56ef789/posts/661111111111111111111111
```

### cURL
```bash
curl -X DELETE http://localhost:5000/admin/groups/post/65f1c9d8b12ab34cd56ef789/posts/661111111111111111111111 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const groupId = "65f1c9d8b12ab34cd56ef789";
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/admin/groups/post/${groupId}/posts/${postId}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 7) Group Posts Cursor Pagination Example

### cURL
```bash
curl -X GET "http://localhost:5000/admin/groups/post/65f1c9d8b12ab34cd56ef789/posts?limit=10&cursor=%7B%22createdAt%22%3A%222026-03-20T10%3A00%3A00.000Z%22%2C%22_id%22%3A%22661111111111111111111111%22%7D" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const groupId = "65f1c9d8b12ab34cd56ef789";

const cursor = encodeURIComponent(JSON.stringify({
  createdAt: "2026-03-20T10:00:00.000Z",
  _id: "661111111111111111111111"
}));

fetch(`http://localhost:5000/admin/groups/post/${groupId}/posts?limit=10&cursor=${cursor}`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 8) All Group Posts Cursor Pagination Example

### cURL
```bash
curl -X GET "http://localhost:5000/admin/groups/post/group-posts?limit=20&cursor=%7B%22createdAt%22%3A%222026-03-20T10%3A00%3A00.000Z%22%2C%22_id%22%3A%22661111111111111111111111%22%7D" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const cursor = encodeURIComponent(JSON.stringify({
  createdAt: "2026-03-20T10:00:00.000Z",
  _id: "661111111111111111111111"
}));

fetch(`http://localhost:5000/admin/groups/post/group-posts?limit=20&cursor=${cursor}`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
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

### Base Route
```txt
/admin/groups/post
```

### Routes
```txt
POST   /admin/groups/post/:groupId/posts
GET    /admin/groups/post/group-posts
GET    /admin/groups/post/:groupId/posts
GET    /admin/groups/post/:groupId/posts/:postId
PATCH  /admin/groups/post/:groupId/posts/:postId
DELETE /admin/groups/post/:groupId/posts/:postId
```

### Create Post Types
```txt
text
image
video
```

### All Group Posts Filters
```txt
groupId
authorId
type
q
limit
cursor
```

### Group Posts Query Params
```txt
limit
cursor
```

### Update Allowed Fields
```txt
text
caption
backgroundUrl
textStyle
images
layout
video
mutedByDefault
loop
category
subCategory
```

### Security
```txt
All routes require authGuard + isAdmin
```