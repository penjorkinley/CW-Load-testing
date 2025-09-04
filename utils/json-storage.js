// utils/json-storage.js
import http from "k6/http";

const DATA_SERVER = "http://localhost:3001";

// In-memory fallback
let testData = { users: [] };

export function initializeStorage() {
  console.log("📁 Initializing HTTP storage...");
  return testData;
}

export function saveUserToStorage(userData) {
  // Add to memory
  testData.users.push(userData);

  // Save to server
  try {
    const response = http.post(
      `${DATA_SERVER}/save-user`,
      JSON.stringify(userData),
      {
        headers: { "Content-Type": "application/json" },
        timeout: "5s",
      }
    );

    if (response.status !== 200) {
      console.log(
        `Warning: Failed to save user ${userData.username} to server`
      );
    }
  } catch (error) {
    console.log(`Warning: Server unavailable, using memory storage`);
  }
}

export function getUserFromStorage(username) {
  try {
    const response = http.get(`${DATA_SERVER}/users`);
    if (response.status === 200) {
      const users = JSON.parse(response.body);
      return users.find((u) => u.username === username) || null;
    }
  } catch (error) {
    console.log("Using memory storage fallback");
  }

  return testData.users.find((u) => u.username === username) || null;
}

export function getAllUsers() {
  try {
    const response = http.get(`${DATA_SERVER}/users`);
    if (response.status === 200) {
      return JSON.parse(response.body);
    }
  } catch (error) {
    console.log("Using memory storage fallback");
  }

  return testData.users;
}

export function getUsersByStatus(status) {
  try {
    const response = http.get(`${DATA_SERVER}/users/status/${status}`);
    if (response.status === 200) {
      return JSON.parse(response.body);
    }
  } catch (error) {
    console.log("Using memory storage fallback");
  }

  return testData.users.filter((u) => u.step === status);
}

export function updateUserInStorage(username, updates) {
  try {
    const response = http.put(
      `${DATA_SERVER}/update-user/${username}`,
      JSON.stringify(updates),
      {
        headers: { "Content-Type": "application/json" },
        timeout: "5s",
      }
    );

    if (response.status === 200) {
      return JSON.parse(response.body).user;
    }
  } catch (error) {
    console.log("Using memory storage fallback");
  }

  // Fallback to memory
  const userIndex = testData.users.findIndex((u) => u.username === username);
  if (userIndex !== -1) {
    testData.users[userIndex] = { ...testData.users[userIndex], ...updates };
    return testData.users[userIndex];
  }
  return null;
}

export function getStorageStats() {
  try {
    const response = http.get(`${DATA_SERVER}/stats`);
    if (response.status === 200) {
      return JSON.parse(response.body);
    }
  } catch (error) {
    console.log("Using memory storage fallback");
  }

  // Fallback stats
  return {
    totalUsers: testData.users.length,
    signupComplete: testData.users.filter((u) => u.userId).length,
    signinComplete: testData.users.filter((u) => u.accessToken).length,
    walletComplete: testData.users.filter((u) => u.walletId).length,
    didComplete: testData.users.filter((u) => u.did).length,
    phase2Ready: testData.users.filter((u) => u.phase2Ready).length,
  };
}

export function getPhase2ReadyUsers() {
  const readyUsers = getAllUsers().filter((u) => u.phase2Ready === true);
  return readyUsers;
}

export function exportStorageData() {
  const allUsers = getAllUsers();
  const stats = getStorageStats();

  const exportData = {
    users: allUsers,
    exportedAt: new Date().toISOString(),
    summary: stats,
  };

  // console.log("=== STORAGE EXPORT ===");
  // console.log(JSON.stringify(exportData, null, 2));
  // console.log("======================");

  return exportData;
}

export function clearStorage() {
  try {
    const response = http.del(`${DATA_SERVER}/users`);
    if (response.status === 200) {
      console.log("🗑️ Server storage cleared");
    }
  } catch (error) {
    console.log("Warning: Could not clear server storage");
  }

  testData.users = [];
  console.log("🗑️ Memory storage cleared");
}
