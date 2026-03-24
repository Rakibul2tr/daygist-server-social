# User API Hitting Guide

```http
Authorization: Bearer YOUR_JWT_TOKEN
```
## 1) Google Login
```js
fetch("http://localhost:5000/users/google", {
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

## 2) Complete Profile

### Endpoint
```http
PATCH /users/other-info
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body
```json
{
  "birthDate": "2000-05-10",
  "country": "Bangladesh",
  "age": 24
}
```

### JavaScript fetch
```js
fetch("http://localhost:5000/users/other-info", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    birthDate: "2000-05-10",
    country: "Bangladesh",
    age: 24
  })
});
```

---

## 3) Get My Profile

### Endpoint
```http
GET /users/me
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```
### JavaScript fetch
```js
fetch("http://localhost:5000/users/me", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 4) Get All Users (Admin Only)

### Endpoint
```http
GET /users/all-users
```

### Headers
```http
Authorization: Bearer ADMIN_JWT_TOKEN
```


### JavaScript fetch
```js
fetch("http://localhost:5000/users/all-users", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${adminToken}`
  }
});
```

---

## 5) Get User By ID

### Endpoint
```http
GET /users/:userId
```

### Example
```http
GET /users/65f1c9d8b12ab34cd56ef789
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/users/${userId}`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 6) Delete User By ID (Admin Only)

### Endpoint
```http
DELETE /users/:userId
```

### Example
```http
DELETE /users/65f1c9d8b12ab34cd56ef789
```

### Headers
```http
Authorization: Bearer ADMIN_JWT_TOKEN
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/users/${userId}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${adminToken}`
  }
});
```

---

## 7) Update My Profile

### Endpoint
```http
PATCH /users/me
```

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body
```json

{
  "name": "Rakib Hasan Updated",
  "country": "Bangladesh",
  "address": {
    "fullAddress": "Khulna, Bangladesh",
    "city": "Khulna",
    "state": "Khulna Division",
    "country": "Bangladesh",
    "zip": "9100"
  },
  "contact": {
    "phone": "+8801712345678",
    "email": "rakib@gmail.com",
    "website": "https://rakib.dev",
    "facebook": "https://facebook.com/rakib",
    "instagram": "https://instagram.com/rakib",
    "linkedin": "https://linkedin.com/in/rakib"
  },
  "education": [
    {
      "school": "Khulna University",
      "degree": "BSc in CSE",
      "year": "2023"
    }
  ]
}
```

### JavaScript fetch
```js
fetch("http://localhost:5000/users/me", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    name: "Rakib Hasan Updated",
    country: "Bangladesh",
    address: {
      fullAddress: "Khulna, Bangladesh",
      city: "Khulna",
      state: "Khulna Division",
      country: "Bangladesh",
      zip: "9100"
    },
    contact: {
      phone: "+8801712345678",
      email: "rakib@gmail.com",
      website: "https://rakib.dev",
      facebook: "https://facebook.com/rakib",
      instagram: "https://instagram.com/rakib",
      linkedin: "https://linkedin.com/in/rakib"
    },
    education: [
      {
        school: "Khulna University",
        degree: "BSc in CSE",
        year: "2023"
      }
    ]
  })
});
```

---

## 8) Update My Avatar

### Endpoint
```http
POST /users/me/avatar
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data
```

### Form Data
- `file` = image file

### JavaScript fetch
```js
const formData = new FormData();
formData.append("file", fileObject);

fetch("http://localhost:5000/users/me/avatar", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: formData
});
```

---

## 9) Update My Cover

### Endpoint
```http
POST /users/me/cover
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data
```

### Form Data
- `file` = image file


### JavaScript fetch
```js
const formData = new FormData();
formData.append("file", fileObject);

fetch("http://localhost:5000/users/me/cover", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: formData
});
```

---

## 10) Get My Posts

### Endpoint
```http
GET /users/me/posts
```

### Query Params
- `limit` = default 20, max 50
- `cursor` = optional JSON cursor string

### Example
```http
GET /users/me/posts?limit=10
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```


### JavaScript fetch
```js
fetch("http://localhost:5000/users/me/posts?limit=10", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 11) Delete My Post

### Endpoint
```http
DELETE /users/me/posts/:id
```

### Example
```http
DELETE /users/me/posts/661111111111111111111111
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/users/me/posts/${postId}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 12) Update My Post

### Endpoint
```http
PATCH /users/me/posts/:id
```

### Allowed Fields
- `text`
- `privacy`
- `backgroundUrl`
- `textStyle`
- `layout`

### Headers
```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Body
```json
{
  "text": "Updated post text",
  "privacy": "friends",
  "backgroundUrl": "https://cdn.example.com/bg.jpg",
  "textStyle": {
    "color": "#ffffff",
    "fontSize": 18
  },
  "layout": "default"
}
```


### JavaScript fetch
```js
const postId = "661111111111111111111111";

fetch(`http://localhost:5000/users/me/posts/${postId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    text: "Updated post text",
    privacy: "friends",
    backgroundUrl: "https://cdn.example.com/bg.jpg",
    textStyle: {
      color: "#ffffff",
      fontSize: 18
    },
    layout: "default"
  })
});
```

---

## 13) Get User Posts

### Endpoint
```http
GET /users/:userId/posts
```

### Example
```http
GET /users/65f1c9d8b12ab34cd56ef789/posts?limit=10
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```



### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/users/${userId}/posts?limit=10`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 14) Get My Photos

### Endpoint
```http
GET /users/me/photos
```

### Query Params
- `limit` = default 20, max 50
- `cursor` = optional JSON cursor string

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```



### JavaScript fetch
```js
fetch("http://localhost:5000/users/me/photos?limit=10", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 15) Get other User Photos

### Endpoint
```http
GET /users/:userId/photos
```

### Example
```http
GET /users/65f1c9d8b12ab34cd56ef789/photos?limit=10
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```


### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/users/${userId}/photos?limit=10`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 16) Get My Reels

### Endpoint
```http
GET /users/me/reels
```

### Query Params
- `limit` = default 20, max 50
- `cursor` = optional JSON cursor string

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```



### JavaScript fetch
```js
fetch("http://localhost:5000/users/me/reels?limit=10", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 17) Get other User Reels

### Endpoint
```http
GET /users/:userId/reels
```

### Example
```http
GET /users/65f1c9d8b12ab34cd56ef789/reels?limit=10
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### JavaScript fetch
```js
const userId = "65f1c9d8b12ab34cd56ef789";

fetch(`http://localhost:5000/users/${userId}/reels?limit=10`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 18) Get My Videos

### Endpoint
```http
GET /users/videos/me
```

### Query Params
- `limit` = default 20, max 50
- `cursor` = optional JSON cursor string

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```


### JavaScript fetch
```js
fetch("http://localhost:5000/users/videos/me?limit=10", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## Cursor Pagination Example

যেসব endpoint-এ `cursor` support করে সেখানে next page hit করতে:


### JavaScript Example
```js
const cursor = encodeURIComponent(JSON.stringify({
  createdAt: "2026-03-20T10:00:00.000Z",
  _id: "661111111111111111111111"
}));

fetch(`http://localhost:5000/users/me/posts?limit=10&cursor=${cursor}`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## Common Frontend Header Example

```js
const headers = {
  Authorization: `Bearer ${token}`
};
```

### JSON Request Example
```js
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`
};
```

### Form Data Request Example
```js
const formData = new FormData();
formData.append("file", fileObject);

fetch("http://localhost:5000/users/me/avatar", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: formData
});
```


