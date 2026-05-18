Get My Conversations

GET /conversations/my

fetch("http://localhost:5000/conversations/my?page=1&limit=20", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});

Create Or Get Conversation

POST /conversations/create-or-get  ===== conversations create hobe and request jabe accept korbe then message korte parbe

fetch("http://localhost:5000/conversations/create-or-get", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    otherUserId: "6827d8f0b1d2f8c3a1234567",
    type: "general"
  })
});

Get Conversation By Id

GET /conversations/

fetch(`http://localhost:5000/conversations/${conversationId}`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});

PATCH /conversations/accept/?status=approved

fetch(`http://localhost:5000/conversations/accept/${conversationId}?status=approved`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`
  }
});

PATCH /conversations/accept/?status=rejected

fetch(`http://localhost:5000/conversations/accept/${conversationId}?status=rejected`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`
  }
});

Check Existing Conversation

GET /conversations//checkExisting

fetch(`http://localhost:5000/conversations/${otherUserId}/checkExisting`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});

GET /users/chat-online == query korte cyale korbe 

fetch("http://localhost:5000/users/chat-online?limit=20&q=rakib", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});


==============================
Message APIs
==============================
Get Messages By Conversation

GET /messages/

fetch(`http://localhost:5000/messages/${conversationId}?page=1&limit=20`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});

Send Text Message

POST /messages/send

fetch("http://localhost:5000/messages/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    conversationId: "6828f1d9a12c34ef567890ab",
    text: "Hello bro",
    messageType: "text"
  })
});

Send Image Message

POST /messages/send

fetch("http://localhost:5000/messages/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    conversationId: "6828f1d9a12c34ef567890ab",
    messageType: "image",
    media: {
      url: "https://cdn.example.com/image.jpg",
      key: "uploads/image.jpg",
      provider: "wasabi"
    }
  })
});


Send Reply Message

POST /messages/send

fetch("http://localhost:5000/messages/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    conversationId: "6828f1d9a12c34ef567890ab",
    text: "I agree",
    messageType: "text",
    replyTo: {
      message: "6828f3a1a12c34ef567890ff",
      text: "Original message",
      sender: "6827d8f0b1d2f8c3a1234567"
    }
  })
});


Edit Message

PATCH /message/

fetch(`http://localhost:5000/message/${messageId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    text: "Updated message"
  })
});


Delete Message

DELETE /message/

fetch(`http://localhost:5000/message/${messageId}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`
  }
});


Mark Messages Seen

PATCH /messages/seen/

fetch(`http://localhost:5000/messages/seen/${conversationId}`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`
  }
});


Message Reaction

PATCH /reaction/

fetch(`http://localhost:5000/reaction/${messageId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    emoji: "❤️"
  })
});

Get Total Unseen Count

GET /unseenCount

fetch("http://localhost:5000/unseenCount", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});