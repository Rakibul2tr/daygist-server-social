const formData = new FormData();

formData.append("fullAddress", JSON.stringify({
  country: "Bangladesh",
  city: "Khulna",
  area: "Sonadanga",
  postalCode: "9000",
}));

formData.append("nidFront", {
  uri: frontImage.uri,
  name: "front.jpg",
  type: "image/jpeg",
});

formData.append("nidBack", {
  uri: backImage.uri,
  name: "back.jpg",
  type: "image/jpeg",
});

const res = await fetch(`${API_URL}/monetization/apply`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "multipart/form-data",
  },
  body: formData,
});

// get monietization info ===status check then active hole video upload er button show hobe ui te 
const res = await fetch(`${API_URL}/monetization/me`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const data = await res.json();