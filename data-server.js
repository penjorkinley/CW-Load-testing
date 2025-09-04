// data-server.js
const express = require("express");
const fs = require("fs");
const app = express();
app.use(express.json());

const DATA_FILE = "data/users.json";

// Load existing data
let userData = [];
if (fs.existsSync(DATA_FILE)) {
  try {
    userData = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (error) {
    userData = [];
  }
}

// Save user data
app.post("/save-user", (req, res) => {
  const existingIndex = userData.findIndex(
    (u) => u.username === req.body.username
  );

  if (existingIndex !== -1) {
    userData[existingIndex] = { ...userData[existingIndex], ...req.body };
  } else {
    userData.push(req.body);
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(userData, null, 2));
  res.json({ success: true, total: userData.length });
});

// Update user
app.put("/update-user/:username", (req, res) => {
  const userIndex = userData.findIndex(
    (u) => u.username === req.params.username
  );
  if (userIndex !== -1) {
    userData[userIndex] = { ...userData[userIndex], ...req.body };
    fs.writeFileSync(DATA_FILE, JSON.stringify(userData, null, 2));
    res.json({ success: true, user: userData[userIndex] });
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

// Get users by status
app.get("/users/status/:status", (req, res) => {
  const filtered = userData.filter((u) => u.step === req.params.status);
  res.json(filtered);
});

// Get all users
app.get("/users", (req, res) => {
  res.json(userData);
});

// Get stats
app.get("/stats", (req, res) => {
  const stats = {
    totalUsers: userData.length,
    signupComplete: userData.filter((u) => u.userId).length,
    signinComplete: userData.filter((u) => u.accessToken).length,
    walletComplete: userData.filter((u) => u.walletId).length,
    didComplete: userData.filter((u) => u.did).length,
    phase2Ready: userData.filter((u) => u.phase2Ready).length,
  };
  res.json(stats);
});

// Clear all data
app.delete("/users", (req, res) => {
  userData = [];
  fs.writeFileSync(DATA_FILE, JSON.stringify(userData, null, 2));
  res.json({ success: true, message: "All data cleared" });
});

app.listen(3001, () => {
  console.log("🚀 Data server running on http://localhost:3001");
  console.log(`📁 Data file: ${DATA_FILE}`);
  console.log(`👥 Current users: ${userData.length}`);
});
