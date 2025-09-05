// tests-scripts/stress-testing/02-signin-stress.js
// STRESS TEST: Signin API - High frequency authentication stress

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
    { duration: "1m", target: 75 }, // Fast ramp-up: 0 → 75 users
    { duration: "3m", target: 75 }, // Stress level 1: 75 concurrent signins
    { duration: "2m", target: 150 }, // Ramp to high stress: 150 users
    { duration: "4m", target: 150 }, // Sustained high stress
    { duration: "2m", target: 200 }, // Peak stress: 200 concurrent signins
    { duration: "3m", target: 200 }, // Maximum authentication stress
    { duration: "2m", target: 75 }, // Recovery: back to manageable load
    { duration: "1m", target: 0 }, // Shutdown
  ],
  // Signin stress thresholds
  thresholds: {
    http_req_duration: ["p(95)<3000", "p(50)<1500"], // Auth should be fast even under stress
    http_req_failed: ["rate<0.12"], // Allow up to 12% failures under peak stress
    checks: ["rate>0.82"], // 82% success rate minimum
  },
};

let availableUsers = [];

export function setup() {
  console.log("🔥 STRESS TEST: User Signin API");
  console.log("==============================");
  console.log("🎯 GOAL: Test authentication system under extreme load");
  console.log("⚠️  WARNING: High-frequency authentication stress test");
  console.log("");
  console.log("📊 STRESS PATTERN:");
  console.log("• Phase 1: 75 concurrent signins (3 min)");
  console.log("• Phase 2: 150 concurrent signins (4 min) ← High stress");
  console.log("• Phase 3: 200 concurrent signins (3 min) ← Peak stress");
  console.log("• Phase 4: Recovery testing (3 min)");
  console.log("• Total Duration: 18 minutes");
  console.log("");
  console.log("🔍 FOCUS AREAS:");
  console.log("• Token generation performance under load");
  console.log("• Database connection pool stress");
  console.log("• Authentication bottlenecks");
  console.log("• Session management under pressure");

  initializeStorage();

  // Load users from previous stress tests or data creation
  availableUsers = getUsersByStatus("signup_complete");

  if (availableUsers.length === 0) {
    console.log("❌ No users available for signin stress testing!");
    console.log("   Run signup stress test first or data creation:");
    console.log("   k6 run tests-scripts/stress-testing/01-signup-stress.js");
    throw new Error("No users available for signin stress testing");
  }

  console.log(
    `📋 Found ${availableUsers.length} users for signin stress testing`
  );
  console.log("🚀 Beginning high-frequency authentication stress...");

  return { users: availableUsers };
}

export default function (data) {
  // Randomly select user (simulating real-world signin patterns)
  const randomIndex = Math.floor(Math.random() * data.users.length);
  const user = data.users[randomIndex];

  if (!user) {
    console.log("❌ No user available for signin stress");
    return;
  }

  const response = makePostRequest("/user/username/signin", {
    username: user.username,
    password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
  });

  const success = check(response, {
    "stress_signin: status 201": (r) => r.status === 201,
    "stress_signin: has access_token": (r) =>
      parseResponse(r)?.data?.access_token,
    "stress_signin: has refresh_token": (r) =>
      parseResponse(r)?.data?.refresh_token,
    "stress_signin: response under 3s": (r) => r.timings.duration < 3000,
    "stress_signin: response under 1.5s": (r) => r.timings.duration < 1500,
    "stress_signin: no auth errors": (r) =>
      r.status !== 401 && r.status !== 403,
  });

  // Monitor authentication system stress
  if (response.timings.duration > 2000) {
    console.log(
      `⚠️  Auth slowdown: ${response.timings.duration.toFixed(
        0
      )}ms (VU: ${__VU})`
    );
  }

  if (response.status === 429) {
    console.log(`🚦 Rate limiting activated (VU: ${__VU})`);
  }

  if (response.status >= 500) {
    console.log(`🔥 Server stress detected: ${response.status} (VU: ${__VU})`);
  }

  if (success) {
    const signinData = parseResponse(response);

    // Update user with fresh tokens for wallet stress testing
    updateUserInStorage(user.username, {
      accessToken: signinData.data.access_token,
      refreshToken: signinData.data.refresh_token,
      step: "signin_complete",
      lastSignin: new Date().toISOString(),
      stressTest: true,
    });
  }

  // Minimal sleep for maximum authentication pressure
  sleep(Math.random() * 0.8 + 0.1); // Very short: 0.1-0.9 seconds
}

export function teardown(data) {
  console.log("\n🔥 STRESS TEST RESULTS - SIGNIN API");
  console.log("===================================");

  const stats = getStorageStats();
  console.log(`📊 AUTHENTICATION STRESS PERFORMANCE:`);
  console.log(`• Peak concurrent signins: 200`);
  console.log(`• Users with valid tokens: ${stats.signinComplete}`);
  console.log(`• Duration under peak stress: 3 minutes`);
  console.log(`• Total stress duration: 18 minutes`);

  console.log(`\n🚀 NEXT STRESS TESTS:`);
  console.log(`• ${stats.signinComplete} authenticated users ready`);
  console.log(`• Run: k6 run tests-scripts/stress-testing/03-wallet-stress.js`);
  console.log(`• Monitor system recovery before next test`);
}
