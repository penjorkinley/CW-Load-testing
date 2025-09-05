// tests-scripts/stress-testing/01-signup-stress.js
// STRESS TEST: Signup API - Push beyond normal capacity to find breaking points

import { check, sleep } from "k6";
import { createUserData } from "../../utils/data-manager.js";
import { makePostRequest, parseResponse } from "../../utils/http-helpers.js";
import {
  getStorageStats,
  initializeStorage,
  saveUserToStorage,
} from "../../utils/json-storage.js";

export const options = {
  stages: [
    { duration: "2m", target: 50 }, // Ramp-up: 0 → 50 users
    { duration: "3m", target: 50 }, // Stress level 1: 50 concurrent users
    { duration: "2m", target: 100 }, // Ramp to stress level 2: 100 users
    { duration: "4m", target: 100 }, // Sustained stress: 100 concurrent users
    { duration: "2m", target: 150 }, // Peak stress: 150 users
    { duration: "3m", target: 150 }, // Maximum stress sustained
    { duration: "2m", target: 50 }, // Recovery test: back to 50
    { duration: "2m", target: 0 }, // Graceful shutdown
  ],
  // Stress testing thresholds - more lenient, focus on system stability
  thresholds: {
    http_req_duration: ["p(95)<5000", "p(50)<2500"], // Allow higher response times
    http_req_failed: ["rate<0.15"], // Allow up to 15% failures under stress
    checks: ["rate>0.80"], // 80% success rate minimum under stress
  },
};

export function setup() {
  console.log("🔥 STRESS TEST: User Signup API");
  console.log("==============================");
  console.log("🎯 GOAL: Find system breaking points and capacity limits");
  console.log("⚠️  WARNING: This will push the system beyond normal limits");
  console.log("");
  console.log("📊 STRESS PATTERN:");
  console.log("• Phase 1: 50 concurrent users (3 min)");
  console.log("• Phase 2: 100 concurrent users (4 min) ← First stress point");
  console.log("• Phase 3: 150 concurrent users (3 min) ← Maximum stress");
  console.log("• Phase 4: Recovery testing (4 min)");
  console.log("• Total Duration: 20 minutes");
  console.log("");
  console.log("🔍 MONITORING:");
  console.log("• Watch for response time degradation");
  console.log("• Monitor error rate increases");
  console.log("• Check system resource utilization");
  console.log("• Test recovery after stress removal");

  initializeStorage();
  return {};
}

export default function () {
  // Generate stress test user with high entropy
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  const vuId = __VU;
  const iteration = __ITER;
  const username = `stress_signup_${timestamp}_${vuId}_${iteration}_${random}`;

  let userData = createUserData(username);

  const response = makePostRequest("/user/username/signup", {
    username: username,
    firstName: "Stress",
    lastName: "Test",
    password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
  });

  const success = check(response, {
    "stress_signup: status 201": (r) => r.status === 201,
    "stress_signup: has userId": (r) => parseResponse(r)?.data?.userId,
    "stress_signup: response under 5s": (r) => r.timings.duration < 5000,
    "stress_signup: response under 2.5s": (r) => r.timings.duration < 2500,
    "stress_signup: no server errors (5xx)": (r) => r.status < 500,
  });

  // Log performance degradation
  if (response.timings.duration > 3000) {
    console.log(
      `⚠️  Slow response detected: ${response.timings.duration.toFixed(
        0
      )}ms (VU: ${__VU})`
    );
  }

  if (response.status >= 400) {
    console.log(
      `❌ Error detected: ${response.status} - ${response.body.substring(
        0,
        100
      )}`
    );
  }

  if (success) {
    userData.userId = parseResponse(response).data.userId;
    userData.step = "signup_complete";
    userData.testType = "stress";
    saveUserToStorage(userData);
  }

  // Stress testing - minimal sleep to maximize pressure
  sleep(Math.random() * 1 + 0.2); // Very short sleep: 0.2-1.2 seconds
}

export function teardown(data) {
  console.log("\n🔥 STRESS TEST RESULTS - SIGNUP API");
  console.log("===================================");

  const stats = getStorageStats();
  console.log(`📊 STRESS TEST PERFORMANCE:`);
  console.log(`• Total stress signups completed: ${stats.signupComplete}`);
  console.log(`• Peak concurrent users: 150`);
  console.log(`• Duration under maximum stress: 3 minutes`);
  console.log(`• Check detailed metrics above for:`);
  console.log(`  - Response time degradation patterns`);
  console.log(`  - Error rate under stress`);
  console.log(`  - System recovery capabilities`);

  console.log(`\n🚀 NEXT STRESS TESTS:`);
  console.log(
    `• ${stats.signupComplete} users available for signin stress testing`
  );
  console.log(`• Run: k6 run tests-scripts/stress-testing/02-signin-stress.js`);
  console.log(`• Monitor system resources between tests`);
  console.log(`• Document breaking points and capacity limits`);
}
