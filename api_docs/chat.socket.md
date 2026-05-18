# Socket.io Chat Documentation

## Socket Connection

```js id="ngmhc2"
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");
```

---

# ==============================

# JOIN SOCKET

# ==============================

# Client Emit

Event: join

```js id="f6cm7j"
socket.emit("join", {
  userId: user._id
});
```

---

# Server Response

Event: socket-joined

```js id="v8e2h6"
socket.on("socket-joined", (data) => {
  console.log(data);
});
```

Example Response:

```json id="qv2n2m"
{
  "success": true,
  "userId": "6827d8f0b1d2f8c3a1234567",
  "socketId": "hdk73jd83"
}
```

---

# Online Users List

Event: online-users

```js id="6v1on5"
socket.on("online-users", (data) => {
  console.log(data.users);
});
```

Example:

```json id="jql2nh"
{
  "users": [
    "6827d8f0b1d2f8c3a1234567",
    "6827d8f0b1d2f8c3a9999999"
  ]
}
```

---

# ==============================

# SEND MESSAGE

# ==============================

# Client Emit

Event: send-message

```js id="6shq76"
socket.emit("send-message", {
  receiverId: "6827d8f0b1d2f8c3a9999999",
  conversationId: "6828f1d9a12c34ef567890ab",
  message: messageData
});
```

---

# Receiver Listen

Event: receive-message

```js id="w9h5du"
socket.on("receive-message", (data) => {
  console.log(data);
});
```

Example:

```json id="u14yvw"
{
  "conversationId": "6828f1d9a12c34ef567890ab",
  "message": {
    "_id": "6828f3a1a12c34ef567890ff",
    "text": "Hello bro"
  }
}
```

---

# Conversation Updated

Event: conversation-updated

```js id="f8t8me"
socket.on("conversation-updated", (data) => {
  console.log(data);
});
```

---

# Sender Delivery Response

Event: message-sent-realtime

```js id="ozc1zh"
socket.on("message-sent-realtime", (data) => {
  console.log(data);
});
```

Example:

```json id="w3prm0"
{
  "conversationId": "6828f1d9a12c34ef567890ab",
  "messageId": "6828f3a1a12c34ef567890ff",
  "deliveredToSocket": true
}
```

---

# ==============================

# TYPING

# ==============================

# Start Typing

Event Emit: typing

```js id="8g4l83"
socket.emit("typing", {
  receiverId: "6827d8f0b1d2f8c3a9999999",
  conversationId: "6828f1d9a12c34ef567890ab",
  senderId: user._id
});
```

---

# Listen Typing

```js id="s87d2j"
socket.on("typing", (data) => {
  console.log(data);
});
```

Example:

```json id="j8n24y"
{
  "conversationId": "6828f1d9a12c34ef567890ab",
  "senderId": "6827d8f0b1d2f8c3a1234567"
}
```

---

# Stop Typing

Event Emit: stop-typing

```js id="3f6f2u"
socket.emit("stop-typing", {
  receiverId: "6827d8f0b1d2f8c3a9999999",
  conversationId: "6828f1d9a12c34ef567890ab",
  senderId: user._id
});
```

---

# Listen Stop Typing

```js id="y5ylpz"
socket.on("stop-typing", (data) => {
  console.log(data);
});
```

---

# ==============================

# MESSAGE SEEN

# ==============================

# Emit Seen

Event: mark-seen

```js id="7s3ycm"
socket.emit("mark-seen", {
  senderId: "6827d8f0b1d2f8c3a1234567",
  conversationId: "6828f1d9a12c34ef567890ab",
  messageIds: [
    "6828f3a1a12c34ef567890ff"
  ],
  seenBy: user._id
});
```

---

# Listen Seen

Event: message-seen

```js id="g9gk4f"
socket.on("message-seen", (data) => {
  console.log(data);
});
```

Example:

```json id="r8t1xg"
{
  "conversationId": "6828f1d9a12c34ef567890ab",
  "messageIds": [
    "6828f3a1a12c34ef567890ff"
  ],
  "seenBy": "6827d8f0b1d2f8c3a9999999"
}
```

---

# ==============================

# MESSAGE REACTION

# ==============================

# Emit Reaction

Event: message-reaction

```js id="9wteu7"
socket.emit("message-reaction", {
  conversationId: "6828f1d9a12c34ef567890ab",
  messageId: "6828f3a1a12c34ef567890ff",
  receiverId: "6827d8f0b1d2f8c3a9999999",
  reactions: [
    {
      user: "6827d8f0b1d2f8c3a1234567",
      emoji: "❤️"
    }
  ]
});
```

---

# Listen Reaction Update

Event: message-reaction-updated

```js id="4gfqgh"
socket.on("message-reaction-updated", (data) => {
  console.log(data);
});
```

Example:

```json id="qvsjlwm"
{
  "conversationId": "6828f1d9a12c34ef567890ab",
  "messageId": "6828f3a1a12c34ef567890ff",
  "reactions": [
    {
      "user": "6827d8f0b1d2f8c3a1234567",
      "emoji": "❤️"
    }
  ]
}
```

---

# ==============================

# CHECK USER ONLINE

# ==============================

# Emit Check Online

Event: check-user-online

```js id="95p1do"
socket.emit("check-user-online", {
  userId: "6827d8f0b1d2f8c3a9999999"
});
```

---

# Listen Online Status

Event: check-user-online-result

```js id="bx2j8h"
socket.on("check-user-online-result", (data) => {
  console.log(data);
});
```

Example:

```json id="7v2j6i"
{
  "userId": "6827d8f0b1d2f8c3a9999999",
  "isOnline": true
}
```

---

# ==============================

# USER ONLINE / OFFLINE

# ==============================

# User Online Event

```js id="jlwm0u"
socket.on("user-online", (data) => {
  console.log(data);
});
```

Example:

```json id="ulv8is"
{
  "userId": "6827d8f0b1d2f8c3a1234567"
}
```

---

# User Offline Event

```js id="3n8l2j"
socket.on("user-offline", (data) => {
  console.log(data);
});
```

Example:

```json id="ay4dhi"
{
  "userId": "6827d8f0b1d2f8c3a1234567"
}
```

---

# Notes

* multi-device supported
* same user multiple socket connect করতে পারবে
* offline হওয়ার আগে 15 sec delay আছে
* online/offline DB automatically update হয়
* message realtime delivery supported
* typing indicator supported
* message reaction realtime sync supported
* seen status realtime sync supported
