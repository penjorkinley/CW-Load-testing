// utils/json-storage.js
// JSON data persistence for k6 load testing

// In-memory storage for the current test run
let testData = {
  users: [],
  currentRun: new Date().toISOString(),
  phase: "load_testing",
};

// Initialize storage
export function initializeStorage() {
  console.log("📁 Initializing JSON storage for load testing...");
  return testData;
}

// Save user data to storage
export function saveUserToStorage(userData) {
  const existingIndex = testData.users.findIndex(
    (u) => u.username === userData.username
  );

  if (existingIndex !== -1) {
    // Update existing user
    testData.users[existingIndex] = {
      ...testData.users[existingIndex],
      ...userData,
      updatedAt: new Date().toISOString(),
    };
  } else {
    // Add new user
    testData.users.push({
      ...userData,
      savedAt: new Date().toISOString(),
    });
  }
}

// Get user by username
export function getUserFromStorage(username) {
  const user = testData.users.find((u) => u.username === username);
  return user || null;
}

// Get all users
export function getAllUsers() {
  return testData.users;
}

// Get users by completion status
export function getUsersByStatus(status) {
  const filteredUsers = testData.users.filter((u) => u.step === status);
  return filteredUsers;
}

// Get Phase 2 ready users
export function getPhase2ReadyUsers() {
  const readyUsers = testData.users.filter((u) => u.phase2Ready === true);
  return readyUsers;
}

// Update user data
export function updateUserInStorage(username, updates) {
  const userIndex = testData.users.findIndex((u) => u.username === username);
  if (userIndex !== -1) {
    testData.users[userIndex] = {
      ...testData.users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return testData.users[userIndex];
  }
  return null;
}

// Export data for logging
export function exportStorageData() {
  const exportData = {
    ...testData,
    exportedAt: new Date().toISOString(),
    summary: {
      totalUsers: testData.users.length,
      phase2Ready: testData.users.filter((u) => u.phase2Ready).length,
      completedUsers: testData.users.filter((u) => u.step === "phase1_complete")
        .length,
    },
  };

  console.log("=== STORAGE EXPORT ===");
  console.log(JSON.stringify(exportData, null, 2));
  console.log("======================");

  return exportData;
}

// Clear storage
export function clearStorage() {
  testData.users = [];
  console.log("🗑️ Storage cleared");
}

// Get storage statistics
export function getStorageStats() {
  const stats = {
    totalUsers: testData.users.length,
    signupComplete: testData.users.filter((u) => u.userId).length,
    signinComplete: testData.users.filter((u) => u.accessToken).length,
    walletComplete: testData.users.filter((u) => u.walletId).length,
    didComplete: testData.users.filter((u) => u.did).length,
    phase2Ready: testData.users.filter((u) => u.phase2Ready).length,
  };

  return stats;
}
