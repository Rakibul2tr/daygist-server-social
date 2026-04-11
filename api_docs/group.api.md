
### Fetch Example 1
```js
await fetch("http://localhost:5000/groups/create", {
  method: "POST",
  headers: {
    "Authorization": "Bearer TOKEN",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    name: "My Group",
    privacy: "public",
    about: "Group description",
    coverUrl: {
      key: "file_key",
      url: "https://image.com",
      provider: "aws"
    },
    category: "tech",
    location: {
      country: "bangladesh",
      city: "khulna"
    },
    rules: ["Be respectful"]
  })
});

🟢 2. Join Group
### Fetch Example 2
await fetch(`http://localhost:5000/groups/${groupId}/join`, {
  method: "POST",
  headers: {
    "Authorization": "Bearer TOKEN"
  }
});


🟢 3. Get For You Groups

await fetch("http://localhost:5000/groups/for-you?limit=10", {
  headers: {
    "Authorization": "Bearer TOKEN"
  }
});
const data = await res.json();


Get My Groups (Created + Joined)

await fetch("http://localhost:5000/groups/my", {
  headers: {
    "Authorization": "Bearer TOKEN"
  }
});
const data = await res.json();

5. Get Group Details


await fetch(`http://localhost:5000/groups/${groupId}/group-details`, {
  headers: {
    "Authorization": "Bearer TOKEN"
  }
});
const data = await res.json();


6. Get Join Requests (for group Admin)

await fetch(`http://localhost:5000/groups/${groupId}/join-requests`, {
  headers: {
    "Authorization": "Bearer TOKEN"
  }
});
const data = await res.json();

7. Get Group Members

await fetch(
  `http://localhost:5000/groups/${groupId}/members?status=active`,
  {
    headers: {
      "Authorization": "Bearer TOKEN"
    }
  }
);
const data = await res.json();

. Update Member Status only group admin
await fetch(
  `http://localhost:5000/groups/${groupId}/members/${memberId}/status`,
  {
    method: "PATCH",
    headers: {
      "Authorization": "Bearer TOKEN",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      status: "active"
    })
  }
);