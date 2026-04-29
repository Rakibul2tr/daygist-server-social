POST /stories

1 // for text 
fetch("http://localhost:5000/stories", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    type: "text",
    privacy: "followers", // followers | friends | only_me

    text: "Hello world story",
    backgroundUrl: "https://example.com/bg.jpg",
    textStyle: {
      color: "#fff",
      fontSize: 18,
      align: "center"
    },

    webLink: "https://google.com"
  })
});

2// for image
fetch("http://localhost:5000/stories", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    type: "image",
    privacy: "followers",

    media: {
      url: "https://example.com/image.jpg",
      thumbnailUrl: "https://example.com/thumb.jpg",
      provider: "wasabi",
      key: "stories/image.jpg",
      width: 1080,
      height: 1920
    }
  })
});
3// for video
fetch("http://localhost:5000/stories", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    type: "video",
    privacy: "followers",

    media: {
      url: "https://example.com/video.mp4",
      thumbnailUrl: "https://example.com/thumb.jpg",
      provider: "wasabi",
      key: "stories/video.mp4",
      durationSec: 15,
      width: 1080,
      height: 1920
    }
  })
});

GET /stories/feed

fetch("http://localhost:5000/stories/feed?limit=20", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});

GET /stories/:userId === other user store and own user both
fetch(`http://localhost:5000/stories/${userId}`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});

POST /stories/:id/seen
fetch(`http://localhost:5000/stories/${storyId}/seen`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  }
});

DELETE /stories/:id
fetch(`http://localhost:5000/stories/${storyId}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`
  }
});