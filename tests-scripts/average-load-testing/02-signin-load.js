// tests-scripts/average-load-testing/02-signin-load.js
// AVERAGE LOAD TEST: Signin API Performance Testing (Uses REAL user data)

import { check, sleep } from "k6";
import { makePostRequest, parseResponse } from "../../utils/http-helpers.js";
import {
  getStorageStats,
  getUsersByStatus,
  initializeStorage,
  updateUserInStorage,
} from "../../utils/json-storage.js";

export const options = {
  stages: [
    { duration: "1m", target: 15 }, // Ramp-up: 0 → 15 users
    { duration: "2m", target: 15 }, // Stay: 15 concurrent users (signin is frequent)
    { duration: "2m", target: 30 }, // Peak: 15 → 30 users
    { duration: "2m", target: 30 }, // Sustain: 30 concurrent users
    { duration: "1m", target: 0 }, // Ramp-down
  ],
  thresholds: {
    http_req_duration: ["p(95)<1500", "p(50)<800"], // Signin should be faster
    http_req_failed: ["rate<0.03"], // Very low failure rate
    checks: ["rate>0.97"], // High success rate
  },
};

let availableUsers = [];

export function setup() {
  console.log("📊 AVERAGE LOAD TEST: User Signin API");
  console.log("=====================================");
  console.log("Simulating realistic signin traffic patterns...");
  console.log("Duration: 8 minutes total");
  console.log("Load Pattern: 15 → 30 → 0 concurrent users");

  initializeStorage();

  // Load REAL users who have completed signup from data/users.json
  availableUsers = getUsersByStatus("signup_complete");

  if (availableUsers.length === 0) {
    console.log("❌ No users available for signin testing!");
    console.log("   Run data creation first:");
    console.log("   k6 run tests-scripts/smoke-testing/run-data-creation.js");
    throw new Error("No users available for signin load testing");
  }

  console.log(
    `📋 Found ${availableUsers.length} REAL users for signin load testing`
  );
  console.log("🎯 Testing realistic signin patterns with sustained load...");

  return { users: availableUsers };
}

export default function (data) {
  // Randomly select a REAL user for signin (simulating real user behavior)
  const randomIndex = Math.floor(Math.random() * data.users.length);
  const user = data.users[randomIndex];

  if (!user) {
    console.log("❌ No user available for this iteration");
    return;
  }

  // Use REAL username and password from data/users.json
  const response = makePostRequest("/user/username/signin", {
    username: user.username, // ← REAL username from data creation
    password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=", // Same password used in signup
  });

  const success = check(response, {
    "avg_load_signin: status 201": (r) => r.status === 201,
    "avg_load_signin: has access_token": (r) =>
      parseResponse(r)?.data?.access_token,
    "avg_load_signin: has refresh_token": (r) =>
      parseResponse(r)?.data?.refresh_token,
    "avg_load_signin: response < 1.5s": (r) => r.timings.duration < 1500,
    "avg_load_signin: response < 800ms": (r) => r.timings.duration < 800,
  });

  if (success) {
    const signinData = parseResponse(response);

    // Update REAL user with fresh tokens in data/users.json
    updateUserInStorage(user.username, {
      accessToken: signinData.data.access_token,
      refreshToken: signinData.data.refresh_token,
      step: "signin_complete",
      lastSignin: new Date().toISOString(),
    });
  }

  // Simulate realistic signin behavior
  // Users don't signin constantly - random pause between attempts
  sleep(Math.random() * 2 + 0.5); // Sleep 0.5-2.5 seconds
}

export function teardown(data) {
  console.log("\n📊 AVERAGE LOAD TEST RESULTS - SIGNIN");
  console.log("=====================================");

  const stats = getStorageStats();
  console.log(
    `✅ Signin Operations Completed: Multiple iterations on ${data.users.length} real users`
  );
  console.log(`🔑 Users with Valid Tokens: ${stats.signinComplete}`);
  console.log(`📈 Average Load Performance: Check detailed metrics above`);

  console.log("\n💡 Signin Performance Analysis:");
  console.log("• p(50) should be under 800ms (median user experience)");
  console.log("• p(95) should be under 1.5s (95% of users)");
  console.log("• Error rate should be under 3%");
  console.log("• Sustained load handling capability measured");

  console.log("\n🚀 Next Steps:");
  console.log(`• ${stats.signinComplete} users ready for wallet load testing`);
  console.log(
    "• Run: k6 run tests-scripts/average-load-testing/03-wallet-load.js"
  );
}
