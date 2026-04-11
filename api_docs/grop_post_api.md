
---

# 🧾 1. Create Group Post

### Endpoint

### Fetch Example (JavaScript)
```js
fetch(`http://localhost:5000/groups/${groupId}/posts`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer YOUR_TOKEN",
  },
  body: JSON.stringify({
    // post er data je vabe send same
  }),
})
  .then(res => res.json())
  .then(data => console.log(data));

📥 2. Get Group Posts (particular group all post)

  fetch("http://localhost:5000/groups/${groupId}/posts?limit=20", {
  method: "GET",
  headers: {
    Authorization: "Bearer YOUR_TOKEN",
  },
})
  .then(res => res.json())
  .then(data => console.log(data));

📌 3. Get My Groups Posts (Joined group + Created group) all post user 1ta jaygay dekhbe
  fetch("http://localhost:5000/groups/myCreate-joined-post?limit=20", {
  method: "GET",
  headers: {
    Authorization: "Bearer YOUR_TOKEN",
  },
})
  .then(res => res.json())
  .then(data => console.log(data));


  📌 4. Get Single Group Post details=========

  fetch("http://localhost:5000/groups/groupId/posts/postId", {
  method: "GET",
  headers: {
    Authorization: "Bearer YOUR_TOKEN",
  },
})
  .then(res => res.json())
  .then(data => console.log(data));


  📌 5. Update Group Post

  fetch("http://localhost:5000/groups/groupId/posts/postId", {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer YOUR_TOKEN",
  },
  body: JSON.stringify({
    // update er jonno ja send korben nibe
   // "text", "caption",     "backgroundUrl",  "textStyle", "images","layout", "video", "mutedByDefault","loop","category", "subCategory",
  }),
})
  .then(res => res.json())
  .then(data => console.log(data));


  📌 6. Delete Group Post particular

  fetch("http://localhost:5000/groups/groupId/posts/postId", {
  method: "DELETE",
  headers: {
    Authorization: "Bearer YOUR_TOKEN",
  },
})
  .then(res => res.json())
  .then(data => console.log(data));


  ================Like / Unlike for group============


  1) Like

  fetch("http://localhost:5000/groups/postId/like", {
  method: "POST",
  headers: {
    Authorization: "Bearer YOUR_TOKEN",
  },
})
2)Unlike
fetch("http://localhost:5000/groups/postId/like", {
  method: "DELETE",
  headers: {
    Authorization: "Bearer YOUR_TOKEN",
  },
})

3) get likes 
fetch("http://localhost:5000/groups/postId/like", {
  method: "GET",
  headers: {
    Authorization: "Bearer YOUR_TOKEN",
  },
})

4) Share
fetch("http://localhost:5000/groups/postId/share", {
  method: "POST",
  headers: {
    Authorization: "Bearer YOUR_TOKEN",
  },
})
5) get Share post
fetch("http://localhost:5000/groups/postId/share", {
  method: "GET",
  headers: {
    Authorization: "Bearer YOUR_TOKEN",
  },
})