GET /notification
fetch("http://localhost:5000/notification?limit=20", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`
  }
});

POST /notification/:id/seen
fetch(`http://localhost:5000/notification/${notificationId}/seen`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  }
});

POST /notification/mark-all-seen
fetch("http://localhost:5000/notification/mark-all-seen", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
