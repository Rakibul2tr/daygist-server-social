# Admin Post API Hitting Guide

Base route:

```bash
/admin
```

যেসব endpoint-এ `authGuard` + `isAdmin` আছে সেখানে token পাঠাতে হবে:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 1) Get All Posts

### Endpoint
```http
GET /admin/posts
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Description
Admin সব post list দেখতে পারবে।

### cURL
```bash
curl -X GET http://localhost:5000/admin/posts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
fetch("http://localhost:5000/admin/posts", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 2) Get Post By ID

### Endpoint
```http
GET /admin/posts/:id
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Example
```http
GET /admin/posts/661111111111111111111111
```

### cURL
```bash
curl -X GET http://localhost:5000/admin/posts/661111111111111111111111 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/admin/posts/${postId}`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 3) Update Post

### Endpoint
```http
PATCH /admin/posts/:id
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Description
Admin safe fields only update করতে পারবে।

### Allowed Fields
```txt
text
description
privacy
backgroundUrl
textStyle
layout
medias
mutedByDefault
loop
videoMode
category
subCategory
type
isDeleted
```

---

## 3.1) Update Text Only

### Body
```json
{
  "text": "Updated post text by admin"
}
```

### cURL
```bash
curl -X PATCH http://localhost:5000/admin/posts/661111111111111111111111 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "text": "Updated post text by admin"
  }'
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/admin/posts/${postId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    text: "Updated post text by admin"
  })
});
```

---

## 3.2) Update Video Post Fields

### Body
```json
{
  "description": "Updated description by admin",
  "videoMode": "normal",
  "category": "general",
  "subCategory": "education",
  "mutedByDefault": false,
  "loop": true
}
```

### cURL
```bash
curl -X PATCH http://localhost:5000/admin/posts/661111111111111111111111 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "description": "Updated description by admin",
    "videoMode": "normal",
    "category": "general",
    "subCategory": "education",
    "mutedByDefault": false,
    "loop": true
  }'
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/admin/posts/${postId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    description: "Updated description by admin",
    videoMode: "normal",
    category: "general",
    subCategory: "education",
    mutedByDefault: false,
    loop: true
  })
});
```

---

## 3.3) Update Text Story / Background Style

### Body
```json
{
  "text": "Admin edited story text",
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
curl -X PATCH http://localhost:5000/admin/posts/661111111111111111111111 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "text": "Admin edited story text",
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
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/admin/posts/${postId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    text: "Admin edited story text",
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

## 3.4) Update Image Post Medias

### Body
```json
{
  "layout": "grid2",
  "medias": [
    {
      "url": "https://example.com/image1.jpg",
      "type": "image",
      "provider": "wasabi",
      "key": "images/image1.jpg"
    },
    {
      "url": "https://example.com/image2.jpg",
      "type": "image",
      "provider": "wasabi",
      "key": "images/image2.jpg"
    }
  ]
}
```

### cURL
```bash
curl -X PATCH http://localhost:5000/admin/posts/661111111111111111111111 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "layout": "grid2",
    "medias": [
      {
        "url": "https://example.com/image1.jpg",
        "type": "image",
        "provider": "wasabi",
        "key": "images/image1.jpg"
      },
      {
        "url": "https://example.com/image2.jpg",
        "type": "image",
        "provider": "wasabi",
        "key": "images/image2.jpg"
      }
    ]
  }'
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/admin/posts/${postId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    layout: "grid2",
    medias: [
      {
        url: "https://example.com/image1.jpg",
        type: "image",
        provider: "wasabi",
        key: "images/image1.jpg"
      },
      {
        url: "https://example.com/image2.jpg",
        type: "image",
        provider: "wasabi",
        key: "images/image2.jpg"
      }
    ]
  })
});
```

---

## 3.5) Restore Using Update Endpoint

### Body
```json
{
  "isDeleted": false
}
```

### cURL
```bash
curl -X PATCH http://localhost:5000/admin/posts/661111111111111111111111 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "isDeleted": false
  }'
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/admin/posts/${postId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    isDeleted: false
  })
});
```

---

## 4) Soft Delete Post

### Endpoint
```http
DELETE /admin/posts/:id
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Description
Post soft delete করার জন্য use হবে।

### Example
```http
DELETE /admin/posts/661111111111111111111111
```

### cURL
```bash
curl -X DELETE http://localhost:5000/admin/posts/661111111111111111111111 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/admin/posts/${postId}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 5) Restore Post

### Endpoint
```http
PATCH /admin/posts/:id/restore
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Description
Soft deleted post restore করার জন্য use হবে।

### Example
```http
PATCH /admin/posts/661111111111111111111111/restore
```

### cURL
```bash
curl -X PATCH http://localhost:5000/admin/posts/661111111111111111111111/restore \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/admin/posts/${postId}/restore`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 6) Hard Delete Post

### Endpoint
```http
DELETE /admin/posts/:id/hard
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Description
Database থেকে পুরো post remove করার জন্য use হবে।

### Example
```http
DELETE /admin/posts/661111111111111111111111/hard
```

### cURL
```bash
curl -X DELETE http://localhost:5000/admin/posts/661111111111111111111111/hard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/admin/posts/${postId}/hard`, {
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

### Get All Posts
```js
const getAdminPosts = async () => {
  const res = await fetch("http://localhost:5000/admin/posts", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return await res.json();
};
```

### Get Single Post
```js
const getAdminPostById = async postId => {
  const res = await fetch(`http://localhost:5000/admin/posts/${postId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return await res.json();
};
```

### Soft Delete Post
```js
const softDeleteAdminPost = async postId => {
  const res = await fetch(`http://localhost:5000/admin/posts/${postId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return await res.json();
};
```

### Restore Post
```js
const restoreAdminPost = async postId => {
  const res = await fetch(`http://localhost:5000/admin/posts/${postId}/restore`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return await res.json();
};
```

### Hard Delete Post
```js
const hardDeleteAdminPost = async postId => {
  const res = await fetch(`http://localhost:5000/admin/posts/${postId}/hard`, {
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

### Admin Post Routes
```txt
GET /admin/posts
GET /admin/posts/:id
PATCH /admin/posts/:id
DELETE /admin/posts/:id
PATCH /admin/posts/:id/restore
DELETE /admin/posts/:id/hard
```

### Allowed Update Fields
```txt
text
description
privacy
backgroundUrl
textStyle
layout
medias
mutedByDefault
loop
videoMode
category
subCategory
type
isDeleted
```

### Common Type Values
```txt
text
image
video
```

### Common Privacy Values
```txt
public
friends
only_me
```

### Common Video Mode Values
```txt
normal
reels
live
```

### Common Category Values
```txt
general
reels
```

### Common Layout Values
```txt
single
grid2
grid3
carousel
```

### Security
```txt
All admin post routes require authGuard + isAdmin
```