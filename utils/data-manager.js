// utils/data-manager.js
// User data management functions

// Generate unique username
export function generateUsername(prefix = "testuser") {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}_${timestamp}_${random}`;
}

// Create user data structure
export function createUserData(username) {
  return {
    username: username,
    userId: null,
    accessToken: null,
    refreshToken: null,
    walletId: null,
    tenantId: null,
    did: null,
    hashTenantID: null,
    step: "created",
    phase2Ready: false,
    createdAt: new Date().toISOString(),
  };
}

// Save user data (logs for k6 output)
export function saveUserData(userData) {
  console.log("=== USER DATA FOR PHASE 2 ===");
  console.log(JSON.stringify(userData, null, 2));
  console.log("============================");
}

// Log user progress
export function logProgress(userData, currentStep) {
  console.log(`📍 ${currentStep} completed for user: ${userData.username}`);

  const steps = ["signup", "signin", "wallet", "did_create", "did_retrieve"];
  const currentIndex = steps.indexOf(currentStep);
  const progress = (((currentIndex + 1) / steps.length) * 100).toFixed(0);

  console.log(`Progress: ${progress}% (${currentIndex + 1}/${steps.length})`);
}
