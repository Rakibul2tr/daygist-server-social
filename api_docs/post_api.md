
<!-- post api document ===================================================-->
# Posts API Hitting Guide

Base route:

```bash
/posts
```

---

## 1) Get Feed

### Endpoint
```http
GET /posts/feed
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Params
- `limit` = optional
- `cursor` = optional JSON string

### Example
```http
GET /posts/feed?limit=10
```



### JavaScript fetch
```js
fetch("http://localhost:5000/posts/feed?limit=10", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 2) Create Post

### Endpoint
```http
POST /posts/create
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Supported Types
- `text`
- `image`
- `video`

---

## 2.1) Create Text Post

### Body
```json
{
  "type": "text",
  "privacy": "public",
  "text": "Hello everyone, this is my text post",
  "backgroundUrl": "https://example.com/background.jpg",
  "textStyle": {
    "color": "#ffffff",
    "fontSize": 18,
    "fontWeight": "700",
    "align": "center"
  }
}
```

### cURL
```bash
curl -X POST http://localhost:5000/posts/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "text",
    "privacy": "public",
    "text": "Hello everyone, this is my text post",
    "backgroundUrl": "https://example.com/background.jpg",
    "textStyle": {
      "color": "#ffffff",
      "fontSize": 18,
      "fontWeight": "700",
      "align": "center"
    }
  }'
```

### JavaScript fetch
```js
fetch("http://localhost:5000/posts/create", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    type: "text",
    privacy: "public",
    text: "Hello everyone, this is my text post",
    backgroundUrl: "https://example.com/background.jpg",
    textStyle: {
      color: "#ffffff",
      fontSize: 18,
      fontWeight: "700",
      align: "center"
    }
  })
});
```

---

## 2.2) Create Image Post

### Body
```json
{
  "type": "image",
  "privacy": "public",
  "caption": "My travel photos",
  "layout": "grid2",
  "images": [
    {
      "url": "https://example.com/photo1.jpg",
      "provider": "wasabi",
      "key": "posts/photo1.jpg",
      "width": 1080,
      "height": 1350
    },
    {
      "url": "https://example.com/photo2.jpg",
      "provider": "wasabi",
      "key": "posts/photo2.jpg",
      "width": 1080,
      "height": 1350
    }
  ],
  "subCategory": "travel"
}
```

### cURL
```bash
curl -X POST http://localhost:5000/posts/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "image",
    "privacy": "public",
    "caption": "My travel photos",
    "layout": "grid2",
    "images": [
      {
        "url": "https://example.com/photo1.jpg",
        "provider": "wasabi",
        "key": "posts/photo1.jpg",
        "width": 1080,
        "height": 1350
      },
      {
        "url": "https://example.com/photo2.jpg",
        "provider": "wasabi",
        "key": "posts/photo2.jpg",
        "width": 1080,
        "height": 1350
      }
    ],
    "subCategory": "travel"
  }'
```

### JavaScript fetch
```js
fetch("http://localhost:5000/posts/create", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    type: "image",
    privacy: "public",
    caption: "My travel photos",
    layout: "grid2",
    images: [
      {
        url: "https://example.com/photo1.jpg",
        provider: "wasabi",
        key: "posts/photo1.jpg",
        width: 1080,
        height: 1350
      },
      {
        url: "https://example.com/photo2.jpg",
        provider: "wasabi",
        key: "posts/photo2.jpg",
        width: 1080,
        height: 1350
      }
    ],
    subCategory: "travel"
  })
});
```


---

## 2.4) Create Reels Post

### Body
```json
{
  "type": "video",
  "privacy": "public",
  "caption": "My new reel",
  "videoMode": "reels",
  "category": "reels",
  "subCategory": "funny",
  "mutedByDefault": false,
  "loop": true,
  "video": {
    "url": "https://example.com/reel.mp4",
    "thumbnailUrl": "https://example.com/reel-thumb.jpg",
    "provider": "wasabi",
    "key": "reels/reel.mp4",
    "durationSec": 20,
    "width": 1080,
    "height": 1920
  }
}
```

### cURL
```bash
curl -X POST http://localhost:5000/posts/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "video",
    "privacy": "public",
    "caption": "My new reel",
    "videoMode": "reels",
    "category": "reels",
    "subCategory": "funny",
    "mutedByDefault": false,
    "loop": true,
    "video": {
      "url": "https://example.com/reel.mp4",
      "thumbnailUrl": "https://example.com/reel-thumb.jpg",
      "provider": "wasabi",
      "key": "reels/reel.mp4",
      "durationSec": 20,
      "width": 1080,
      "height": 1920
    }
  }'
```

### JavaScript fetch
```js
fetch("http://localhost:5000/posts/create", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    type: "video",
    privacy: "public",
    caption: "My new reel",
    videoMode: "reels",
    category: "reels",
    subCategory: "funny",
    mutedByDefault: false,
    loop: true,
    video: {
      url: "https://example.com/reel.mp4",
      thumbnailUrl: "https://example.com/reel-thumb.jpg",
      provider: "wasabi",
      key: "reels/reel.mp4",
      durationSec: 20,
      width: 1080,
      height: 1920
    }
  })
});
```

---

## 3) Update Post

### Endpoint
```http
PATCH /posts/:id
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body
```json
{
  "text": "Updated post text"
}
```

### Example
```http
PATCH /posts/661111111111111111111111
```

### cURL
```bash
curl -X PATCH http://localhost:5000/posts/661111111111111111111111 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "text": "Updated post text"
  }'
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/posts/${postId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    text: "Updated post text"
  })
});
```

---

## 4) Delete Post

### Endpoint
```http
DELETE /posts/:id/delete
```

### Example
```http
DELETE /posts/661111111111111111111111/delete
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### cURL
```bash
curl -X DELETE http://localhost:5000/posts/661111111111111111111111/delete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/posts/${postId}/delete`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 5) Get Post By ID

### Endpoint
```http
GET /posts/:id
```

### Example
```http
GET /posts/661111111111111111111111
```

### cURL
```bash
curl -X GET http://localhost:5000/posts/661111111111111111111111
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/posts/${postId}`, {
  method: "GET"
});
```

---

## 6) Save Post

### Endpoint
```http
POST /posts/:id/save
```

### Example
```http
POST /posts/661111111111111111111111/save
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### cURL
```bash
curl -X POST http://localhost:5000/posts/661111111111111111111111/save \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/posts/${postId}/save`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  }
  body:targetType // "groupPost" | "post"
});
```

---

## 7) Unsave Post

### Endpoint
```http
DELETE /posts/:id/save
```

### Example
```http
DELETE /posts/661111111111111111111111/save
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### cURL
```bash
curl -X DELETE http://localhost:5000/posts/661111111111111111111111/save \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/posts/${postId}/save`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`
  }
  body:targetType // "groupPost" | "post"
});
```

---

## 8) Get Saved Posts

### Endpoint
```http
GET /posts/me/saved/list
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Params
- `page` = optional
- `limit` = optional

### Example
```http
GET /posts/me/saved/list?page=1&limit=10
```

### cURL
```bash
curl -X GET "http://localhost:5000/posts/me/saved/list?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
fetch("http://localhost:5000/posts/me/saved/list?page=1&limit=10", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 9) Like Post

### Endpoint
```http
POST /posts/:postId/like
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Params
- `type=post`
- `type=groupPost`

### Normal Post Example
```http
POST /posts/661111111111111111111111/like?type=post
```

### Group Post Example
```http
POST /posts/661111111111111111111111/like?type=groupPost
```

### cURL
```bash
curl -X POST "http://localhost:5000/posts/661111111111111111111111/like?type=post" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/posts/${postId}/like?type=post`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 10) Unlike Post

### Endpoint
```http
DELETE /posts/:postId/like
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Params
- `type=post`
- `type=groupPost`

### Normal Post Example
```http
DELETE /posts/661111111111111111111111/like?type=post
```

### Group Post Example
```http
DELETE /posts/661111111111111111111111/like?type=groupPost
```

### cURL
```bash
curl -X DELETE "http://localhost:5000/posts/661111111111111111111111/like?type=post" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/posts/${postId}/like?type=post`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 11) Get Post Likes

### Endpoint
```http
GET /posts/:postId/likes
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Params
- `type=post`
- `type=groupPost`
- `page`
- `limit`

### Example
```http
GET /posts/661111111111111111111111/likes?type=post&page=1&limit=20
```

### cURL
```bash
curl -X GET "http://localhost:5000/posts/661111111111111111111111/likes?type=post&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/posts/${postId}/likes?type=post&page=1&limit=20`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 12) Share Post

### Endpoint
```http
POST /posts/:postId/share
```

### Example
```http
POST /posts/661111111111111111111111/share
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### cURL
```bash
curl -X POST http://localhost:5000/posts/661111111111111111111111/share \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/posts/${postId}/share`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 13) Get Post Shares

### Endpoint
```http
GET /posts/:postId/shares
```

### Example
```http
GET /posts/661111111111111111111111/shares?page=1&limit=20
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Params
- `page`
- `limit`

### cURL
```bash
curl -X GET "http://localhost:5000/posts/661111111111111111111111/shares?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/posts/${postId}/shares?page=1&limit=20`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 14) Add Video View

### Endpoint
```http
POST /posts/:postId/view
```

### Example
```http
POST /posts/661111111111111111111111/view
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### cURL
```bash
curl -X POST http://localhost:5000/posts/661111111111111111111111/view \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/posts/${postId}/view`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 15) Feed Cursor Pagination Example

যদি feed API cursor support করে, তাহলে next page hit করার example:

### cURL
```bash
curl -X GET "http://localhost:5000/posts/feed?limit=10&cursor=%7B%22createdAt%22%3A%222026-03-20T10%3A00%3A00.000Z%22%2C%22_id%22%3A%22661111111111111111111111%22%7D" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const cursor = encodeURIComponent(JSON.stringify({
  createdAt: "2026-03-20T10:00:00.000Z",
  _id: "661111111111111111111111"
}));

fetch(`http://localhost:5000/posts/feed?limit=10&cursor=${cursor}`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 16) Common Frontend Header Example

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

## 17) Notes

### Create Post Privacy Values
```txt
public
friends
only_me
```

### Create Post Type Values
```txt
text
image
video
```

### Video Mode Values
```txt
normal
reels
live
```

### Image Layout Values
```txt
single
grid2
grid3
carousel
```

### Like Type Query Values
```txt
post
groupPost
```


### JavaScript fetch=======report api
```js
const cursor = encodeURIComponent(JSON.stringify({
  createdAt: "2026-03-20T10:00:00.000Z",
  _id: "661111111111111111111111"
}));

fetch(`http://localhost:5000/report/posts/${postId}`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  }
  body: JSON.stringify({
      reason: "spam",
      details?: "Fake content"
    })
});
```
### JavaScript fetch ==== get own report
```js
const cursor = encodeURIComponent(JSON.stringify({
  createdAt: "2026-03-20T10:00:00.000Z",
  _id: "661111111111111111111111"
}));

fetch(`http://localhost:5000/report/get/me`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
  
});
```