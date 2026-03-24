# Videos API Hitting Guide

Base route:

```bash
/videos
```

যেসব endpoint-এ `authGuard` আছে সেখানে token পাঠাতে হবে:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 1) Get General Videos Feed

### Endpoint
```http
GET /videos/feed/general
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Params
- `limit` = optional
- `cursor` = optional JSON string
- `subCategory` = optional

### Example
```http
GET /videos/feed/general?limit=10
```

### Example with Sub Category
```http
GET /videos/feed/general?limit=10&subCategory=islamic
```

### cURL
```bash
curl -X GET "http://localhost:5000/videos/feed/general?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### cURL with subCategory
```bash
curl -X GET "http://localhost:5000/videos/feed/general?limit=10&subCategory=islamic" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
fetch("http://localhost:5000/videos/feed/general?limit=10", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

### JavaScript fetch with subCategory
```js
fetch("http://localhost:5000/videos/feed/general?limit=10&subCategory=islamic", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 2) Get Reels Videos Feed

### Endpoint
```http
GET /videos/feed/reels
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Params
- `limit` = optional
- `cursor` = optional JSON string
- `subCategory` = optional

### Example
```http
GET /videos/feed/reels?limit=10
```

### Example with Sub Category
```http
GET /videos/feed/reels?limit=10&subCategory=funny
```

### cURL
```bash
curl -X GET "http://localhost:5000/videos/feed/reels?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### cURL with subCategory
```bash
curl -X GET "http://localhost:5000/videos/feed/reels?limit=10&subCategory=funny" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
fetch("http://localhost:5000/videos/feed/reels?limit=10", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

### JavaScript fetch with subCategory
```js
fetch("http://localhost:5000/videos/feed/reels?limit=10&subCategory=funny", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 3) Upload Long Video Post

### Endpoint
```http
POST /videos/video/upload
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data
```

### Form Data
- `video` = required video file
- `thumbnail` = optional image file
- `title` = optional string
- `description` = optional string
- `subCategory` = optional string

### cURL
```bash
curl -X POST http://localhost:5000/videos/video/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "video=@/Users/rakib/Videos/video.mp4" \
  -F "thumbnail=@/Users/rakib/Pictures/thumb.jpg" \
  -F "title=My long video title" \
  -F "description=This is my long video description" \
  -F "subCategory=education"
```

### JavaScript fetch
```js
const formData = new FormData();
formData.append("video", videoFileObject);
formData.append("thumbnail", thumbnailFileObject);
formData.append("title", "My long video title");
formData.append("description", "This is my long video description");
formData.append("subCategory", "education");

fetch("http://localhost:5000/videos/video/upload", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: formData
});
```

### React Native Example
```js
const formData = new FormData();

formData.append("video", {
  uri: videoUri,
  name: "video.mp4",
  type: "video/mp4"
});

formData.append("thumbnail", {
  uri: thumbnailUri,
  name: "thumb.jpg",
  type: "image/jpeg"
});

formData.append("title", "My long video title");
formData.append("description", "This is my long video description");
formData.append("subCategory", "education");

fetch("http://localhost:5000/videos/video/upload", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: formData
});
```

---

## 4) Track Video Interest

### Endpoint
```http
POST /videos/interest
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body
- `postId` = optional
- `category` = required
- `subCategory` = optional
- `watchedSec` = required for meaningful tracking, must be `180` or more

### Example Body
```json
{
  "postId": "661111111111111111111111",
  "category": "general",
  "subCategory": "islamic",
  "watchedSec": 200
}
```

### cURL
```bash
curl -X POST http://localhost:5000/videos/interest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "postId": "661111111111111111111111",
    "category": "general",
    "subCategory": "islamic",
    "watchedSec": 200
  }'
```

### JavaScript fetch
```js
fetch("http://localhost:5000/videos/interest", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    postId: "661111111111111111111111",
    category: "general",
    subCategory: "islamic",
    watchedSec: 200
  })
});
```

---

## 5) Track Video Interest Ignored Example

### Notes
যদি `watchedSec < 180` হয়, তাহলে interest ignore হবে।

### Example Body
```json
{
  "postId": "661111111111111111111111",
  "category": "general",
  "subCategory": "sports",
  "watchedSec": 60
}
```

### cURL
```bash
curl -X POST http://localhost:5000/videos/interest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "postId": "661111111111111111111111",
    "category": "general",
    "subCategory": "sports",
    "watchedSec": 60
  }'
```

### JavaScript fetch
```js
fetch("http://localhost:5000/videos/interest", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    postId: "661111111111111111111111",
    category: "general",
    subCategory: "sports",
    watchedSec: 60
  })
});
```

---

## 6) General Feed Cursor Pagination Example

### cURL
```bash
curl -X GET "http://localhost:5000/videos/feed/general?limit=10&cursor=%7B%22createdAt%22%3A%222026-03-20T10%3A00%3A00.000Z%22%2C%22_id%22%3A%22661111111111111111111111%22%7D" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const cursor = encodeURIComponent(JSON.stringify({
  createdAt: "2026-03-20T10:00:00.000Z",
  _id: "661111111111111111111111"
}));

fetch(`http://localhost:5000/videos/feed/general?limit=10&cursor=${cursor}`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 7) Reels Feed Cursor Pagination Example

### cURL
```bash
curl -X GET "http://localhost:5000/videos/feed/reels?limit=10&cursor=%7B%22createdAt%22%3A%222026-03-20T10%3A00%3A00.000Z%22%2C%22_id%22%3A%22661111111111111111111111%22%7D" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const cursor = encodeURIComponent(JSON.stringify({
  createdAt: "2026-03-20T10:00:00.000Z",
  _id: "661111111111111111111111"
}));

fetch(`http://localhost:5000/videos/feed/reels?limit=10&cursor=${cursor}`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 8) Common Frontend Header Example

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

### Multipart/Form-Data Example
```js
const formData = new FormData();
formData.append("video", videoFileObject);
formData.append("thumbnail", thumbnailFileObject);

fetch("http://localhost:5000/videos/video/upload", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: formData
});
```

---

## 9) Notes

### Feed Routes
```txt
GET /videos/feed/general
GET /videos/feed/reels
```

### Upload Route
```txt
POST /videos/video/upload
```

### Interest Route
```txt
POST /videos/interest
```

### Interest Rules
```txt
category is required
watchedSec must be at least 180 to track interest
postId is optional
subCategory is optional
```

### Example Categories
```txt
general
reels
```

### Example Sub Categories
```txt
islamic
sports
funny
education
other
```