
<!-- image video audio upload and get api ============================ -->
# Upload API Hitting Guide

Base route:

```bash
/upload
```

যেসব endpoint-এ `authGuard` আছে সেখানে token পাঠাতে হবে:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 1) Upload Image

### Endpoint
```http
POST /upload/image
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data
```

### Form Data
- `file` = image file

### Notes
- Only image files allowed
- Max size: `25MB`

### cURL
```bash
curl -X POST http://localhost:5000/upload/image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/Users/rakib/Pictures/photo.jpg"
```

### JavaScript fetch
```js
const formData = new FormData();
formData.append("file", fileObject);

fetch("http://localhost:5000/upload/image", {
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
formData.append("file", {
  uri: imageUri,
  name: "photo.jpg",
  type: "image/jpeg"
});

fetch("http://localhost:5000/upload/image", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: formData
});
```

---

## 2) Upload Video

### Endpoint
```http
POST /upload/video
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data
```

### Form Data
- `file` = video file

### Notes
- Only video files allowed
- Max size: `300MB`

### cURL
```bash
curl -X POST http://localhost:5000/upload/video \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/Users/rakib/Videos/video.mp4"
```

### JavaScript fetch
```js
const formData = new FormData();
formData.append("file", fileObject);

fetch("http://localhost:5000/upload/video", {
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
formData.append("file", {
  uri: videoUri,
  name: "video.mp4",
  type: "video/mp4"
});

fetch("http://localhost:5000/upload/video", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: formData
});
```

---

## 3) Upload Voice

### Endpoint
```http
POST /upload/voice
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data
```

### Form Data
- `file` = audio file

### Allowed Audio Types
```txt
audio/m4a
audio/mp4
audio/aac
audio/mpeg
audio/wav
audio/x-wav
audio/ogg
audio/webm
```

### Notes
- Max size: `25MB`

### cURL
```bash
curl -X POST http://localhost:5000/upload/voice \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/Users/rakib/Audio/voice.m4a"
```

### JavaScript fetch
```js
const formData = new FormData();
formData.append("file", fileObject);

fetch("http://localhost:5000/upload/voice", {
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
formData.append("file", {
  uri: audioUri,
  name: "voice.m4a",
  type: "audio/m4a"
});

fetch("http://localhost:5000/upload/voice", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: formData
});
```

---

## 4) Get Signed URL

### Endpoint
```http
GET /upload/signed
```

### Headers
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Params
- `key` = uploaded file key

### Example
```http
GET /upload/signed?key=images/1719999999999-photo.jpg
```

### cURL
```bash
curl -X GET "http://localhost:5000/upload/signed?key=images/1719999999999-photo.jpg" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript fetch
```js
const key = encodeURIComponent("images/1719999999999-photo.jpg");

fetch(`http://localhost:5000/upload/signed?key=${key}`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

### React Native Example
```js
const key = encodeURIComponent("images/1719999999999-photo.jpg");

fetch(`http://localhost:5000/upload/signed?key=${key}`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

---

## 5) Common Frontend Header Example

### Auth Header
```js
const headers = {
  Authorization: `Bearer ${token}`
};
```

### Multipart/Form-Data Example
```js
const formData = new FormData();
formData.append("file", fileObject);

fetch("http://localhost:5000/upload/image", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: formData
});
```

---

## 6) Example Usage Flow

### Step 1: Upload image/video/voice
```js
const formData = new FormData();
formData.append("file", fileObject);

const uploadRes = await fetch("http://localhost:5000/upload/image", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: formData
});

const uploadData = await uploadRes.json();
```

### Step 2: Save returned url/key/provider in another API
```js
const mediaPayload = {
  url: uploadData.url,
  key: uploadData.key,
  provider: uploadData.provider
};
```

### Step 3: Get signed URL using key if needed
```js
const signedRes = await fetch(
  `http://localhost:5000/upload/signed?key=${encodeURIComponent(uploadData.key)}`,
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
);

const signedData = await signedRes.json();
```

---

## 7) Example Payload Mapping After Upload

### Image
```js
{
  url: uploadData.url,
  key: uploadData.key,
  provider: uploadData.provider
}
```

### Video
```js
{
  url: uploadData.url,
  key: uploadData.key,
  provider: uploadData.provider
}
```

### Voice
```js
{
  url: uploadData.url,
  key: uploadData.key,
  provider: uploadData.provider
}
```

---

## 8) Notes

### Upload Image Rules
```txt
Only image files allowed
Max size: 25MB
Field name: file
```

### Upload Video Rules
```txt
Only video files allowed
Max size: 300MB
Field name: file
```

### Upload Voice Rules
```txt
Allowed audio mime types only
Max size: 25MB
Field name: file
```

### Signed URL
```txt
Method: GET
Query param: key
Expiry: 1 hour
```