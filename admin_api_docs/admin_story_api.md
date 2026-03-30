# Admin Story API Hitting Guide

Base route:

```bash
/admin
```

সব route-এই `authGuard` + `isAdmin` আছে, তাই token লাগবে:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 1) Get All Stories

### Endpoint
```http
GET /admin/stories
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Params
- `limit` = optional, default 50, max 200

### Example
```http
GET /admin/stories
```

### Example with limit
```http
GET /admin/stories?limit=20
```

### cURL
```bash
curl -X GET http://localhost:5000/admin/stories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### cURL with limit
```bash
curl -X GET "http://localhost:5000/admin/stories?limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
fetch("http://localhost:5000/admin/stories", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

### JavaScript fetch with limit
```js
fetch("http://localhost:5000/admin/stories?limit=20", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 2) Get Stories By User

### Endpoint
```http
GET /admin/stories/user/:userId
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Params
- `limit` = optional, default 100, max 300

### Example
```http
GET /admin/stories/user/65f1c9d8b12ab34cd56ef789
```

### Example with limit
```http
GET /admin/stories/user/65f1c9d8b12ab34cd56ef789?limit=50
```

### cURL
```bash
curl -X GET http://localhost:5000/admin/stories/user/65f1c9d8b12ab34cd56ef789 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### cURL with limit
```bash
curl -X GET "http://localhost:5000/admin/stories/user/65f1c9d8b12ab34cd56ef789?limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/stories/user/${userId}`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

### JavaScript fetch with limit
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/admin/stories/user/${userId}?limit=50`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 3) Create Story

### Endpoint
```http
POST /admin/stories
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Description
Admin যেকোনো user-এর জন্য story create করতে পারবে। story type হতে পারে:
- `image`
- `video`
- `text`

---

## 3.1) Create Text Story

### Body
```json
{
  "userId": "65f1c9d8b12ab34cd56ef789",
  "type": "text",
  "privacy": "public",
  "text": "Hello from admin story",
  "backgroundUrl": "https://example.com/bg.jpg",
  "textStyle": {
    "color": "#ffffff",
    "fontSize": 26,
    "fontWeight": "900",
    "align": "center"
  }
}
```

### cURL
```bash
curl -X POST http://localhost:5000/admin/stories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "65f1c9d8b12ab34cd56ef789",
    "type": "text",
    "privacy": "public",
    "text": "Hello from admin story",
    "backgroundUrl": "https://example.com/bg.jpg",
    "textStyle": {
      "color": "#ffffff",
      "fontSize": 26,
      "fontWeight": "900",
      "align": "center"
    }
  }'
```

### JavaScript fetch
```js
fetch("http://localhost:5000/admin/stories", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    userId: "65f1c9d8b12ab34cd56ef789",
    type: "text",
    privacy: "public",
    text: "Hello from admin story",
    backgroundUrl: "https://example.com/bg.jpg",
    textStyle: {
      color: "#ffffff",
      fontSize: 26,
      fontWeight: "900",
      align: "center"
    }
  })
});
```

---

## 3.2) Create Image Story

### Body
```json
{
  "userId": "65f1c9d8b12ab34cd56ef789",
  "type": "image",
  "privacy": "public",
  "media": {
    "url": "https://example.com/story-image.jpg",
    "key": "stories/story-image.jpg",
    "provider": "wasabi",
    "width": 1080,
    "height": 1920
  }
}
```

### cURL
```bash
curl -X POST http://localhost:5000/admin/stories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "65f1c9d8b12ab34cd56ef789",
    "type": "image",
    "privacy": "public",
    "media": {
      "url": "https://example.com/story-image.jpg",
      "key": "stories/story-image.jpg",
      "provider": "wasabi",
      "width": 1080,
      "height": 1920
    }
  }'
```

### JavaScript fetch
```js
fetch("http://localhost:5000/admin/stories", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    userId: "65f1c9d8b12ab34cd56ef789",
    type: "image",
    privacy: "public",
    media: {
      url: "https://example.com/story-image.jpg",
      key: "stories/story-image.jpg",
      provider: "wasabi",
      width: 1080,
      height: 1920
    }
  })
});
```

---

## 3.3) Create Video Story

### Body
```json
{
  "userId": "65f1c9d8b12ab34cd56ef789",
  "type": "video",
  "privacy": "public",
  "media": {
    "url": "https://example.com/story-video.mp4",
    "key": "stories/story-video.mp4",
    "provider": "wasabi",
    "thumbnailUrl": "https://example.com/story-thumb.jpg",
    "width": 1080,
    "height": 1920,
    "durationSec": 15
  }
}
```

### cURL
```bash
curl -X POST http://localhost:5000/admin/stories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "65f1c9d8b12ab34cd56ef789",
    "type": "video",
    "privacy": "public",
    "media": {
      "url": "https://example.com/story-video.mp4",
      "key": "stories/story-video.mp4",
      "provider": "wasabi",
      "thumbnailUrl": "https://example.com/story-thumb.jpg",
      "width": 1080,
      "height": 1920,
      "durationSec": 15
    }
  }'
```

### JavaScript fetch
```js
fetch("http://localhost:5000/admin/stories", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    userId: "65f1c9d8b12ab34cd56ef789",
    type: "video",
    privacy: "public",
    media: {
      url: "https://example.com/story-video.mp4",
      key: "stories/story-video.mp4",
      provider: "wasabi",
      thumbnailUrl: "https://example.com/story-thumb.jpg",
      width: 1080,
      height: 1920,
      durationSec: 15
    }
  })
});
```

---

## 3.4) Create Story with Custom Expire Time

### Body
```json
{
  "userId": "65f1c9d8b12ab34cd56ef789",
  "type": "text",
  "privacy": "friends",
  "text": "Custom expire story",
  "expiresAt": "2026-03-30T12:00:00.000Z"
}
```

### cURL
```bash
curl -X POST http://localhost:5000/admin/stories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "65f1c9d8b12ab34cd56ef789",
    "type": "text",
    "privacy": "friends",
    "text": "Custom expire story",
    "expiresAt": "2026-03-30T12:00:00.000Z"
  }'
```

### JavaScript fetch
```js
fetch("http://localhost:5000/admin/stories", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    userId: "65f1c9d8b12ab34cd56ef789",
    type: "text",
    privacy: "friends",
    text: "Custom expire story",
    expiresAt: "2026-03-30T12:00:00.000Z"
  })
});
```

---

## 4) Soft Delete Story

### Endpoint
```http
DELETE /admin/stories/:id
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Description
Story soft delete করবে। Wasabi media থাকলে delete করার চেষ্টা করবে। :contentReference[oaicite:1]{index=1}

### Example
```http
DELETE /admin/stories/661111111111111111111111
```

### cURL
```bash
curl -X DELETE http://localhost:5000/admin/stories/661111111111111111111111 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const storyId = "661111111111111111111111";

fetch(`http://localhost:5000/admin/stories/${storyId}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 5) Restore Story

### Endpoint
```http
PATCH /admin/stories/:id/restore
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Example
```http
PATCH /admin/stories/661111111111111111111111/restore
```

### cURL
```bash
curl -X PATCH http://localhost:5000/admin/stories/661111111111111111111111/restore \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const storyId = "661111111111111111111111";

fetch(`http://localhost:5000/admin/stories/${storyId}/restore`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 6) Hard Delete Story

### Endpoint
```http
DELETE /admin/stories/:id/hard
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Description
Story DB থেকে পুরো delete করবে। Wasabi media থাকলে delete করার চেষ্টা করবে। :contentReference[oaicite:2]{index=2}

### Example
```http
DELETE /admin/stories/661111111111111111111111/hard
```

### cURL
```bash
curl -X DELETE http://localhost:5000/admin/stories/661111111111111111111111/hard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const storyId = "661111111111111111111111";

fetch(`http://localhost:5000/admin/stories/${storyId}/hard`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 7) Common Frontend Header Example

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

## 8) React Native / Frontend Examples

### Get All Stories
```js
const getAdminStories = async () => {
  const res = await fetch("http://localhost:5000/admin/stories?limit=20", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return await res.json();
};
```

### Get User Stories
```js
const getAdminStoriesByUser = async userId => {
  const res = await fetch(`http://localhost:5000/admin/stories/user/${userId}?limit=50`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return await res.json();
};
```

### Delete Story
```js
const deleteAdminStory = async storyId => {
  const res = await fetch(`http://localhost:5000/admin/stories/${storyId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return await res.json();
};
```

### Restore Story
```js
const restoreAdminStory = async storyId => {
  const res = await fetch(`http://localhost:5000/admin/stories/${storyId}/restore`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return await res.json();
};
```

### Hard Delete Story
```js
const hardDeleteAdminStory = async storyId => {
  const res = await fetch(`http://localhost:5000/admin/stories/${storyId}/hard`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return await res.json();
};
```

---

## 9) Notes

### Base Route
```txt
/admin
```

### Routes
```txt
GET    /admin/stories
GET    /admin/stories/user/:userId
POST   /admin/stories
DELETE /admin/stories/:id
PATCH  /admin/stories/:id/restore
DELETE /admin/stories/:id/hard
```

### Story Types
```txt
image
video
text
```

### Privacy Values
```txt
public
friends
only_me
```

### Create Story Rules
```txt
- userId must be valid
- type must be image/video/text
- text story needs text
- image/video story needs valid media.url
- expiresAt optional
- if expiresAt not provided, default 24 hours
```

### Media Fields
```txt
url
key
provider
thumbnailUrl
width
height
durationSec
```

### Delete Behavior
```txt
Soft delete:
- sets isDeleted = true
- if media.provider === wasabi and media.key exists, tries to delete from wasabi

Hard delete:
- deletes media from wasabi if possible
- removes story from DB
```

### Security
```txt
All routes require authGuard + isAdmin
```