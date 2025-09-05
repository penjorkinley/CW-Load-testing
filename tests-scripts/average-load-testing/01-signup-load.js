// tests-scripts/average-load-testing/01-signup-load.js
// AVERAGE LOAD TEST: Signup API Performance Testing

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
    { duration: "1m", target: 10 }, // Ramp-up: 0 → 10 users over 2 min
    { duration: "2m", target: 10 }, // Stay: 10 concurrent users for 2 min
    { duration: "2m", target: 20 }, // Peak: 10 → 20 users over 2 min
    { duration: "2m", target: 20 }, // Sustain: 20 concurrent users for 2 min
    { duration: "1m", target: 0 }, // Ramp-down: 20 → 0 over  min
  ],
  // Average load thresholds
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(50)<1000"], // 95% under 2s, median under 1s
    http_req_failed: ["rate<0.05"], // Less than 5% failures
    checks: ["rate>0.95"], // 95% success rate
  },
};

export function setup() {
  console.log("📊 AVERAGE LOAD TEST: User Signup API");
  console.log("====================================");
  console.log("Simulating realistic signup traffic...");
  console.log("Duration: 8 minutes total");
  console.log("Load Pattern: 10 → 20 → 0 concurrent users");
  initializeStorage();
  return {};
}

export default function () {
  // Generate unique username with high entropy for load testing
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  const vuId = __VU;
  const iteration = __ITER;
  const username = `load_user_${timestamp}_${vuId}_${iteration}_${random}`;

  let userData = createUserData(username);

  const response = makePostRequest("/user/username/signup", {
    username: username,
    firstName: "Load",
    lastName: "Test",
    password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
  });

  const success = check(response, {
    "avg_load_signup: status 201": (r) => r.status === 201,
    "avg_load_signup: has userId": (r) => parseResponse(r)?.data?.userId,
    "avg_load_signup: response < 2s": (r) => r.timings.duration < 2000,
    "avg_load_signup: response < 1s": (r) => r.timings.duration < 1000,
  });

  if (success) {
    userData.userId = parseResponse(response).data.userId;
    userData.step = "signup_complete";
    saveUserToStorage(userData); // Save for other load tests to use
  }

  // Simulate realistic user behavior - users don't signup instantly
  sleep(Math.random() * 3 + 1); // Random sleep between 1-4 seconds
}

export function teardown(data) {
  console.log("\n📊 AVERAGE LOAD TEST RESULTS - SIGNUP");
  console.log("=====================================");

  const stats = getStorageStats();
  console.log(`✅ Total Signups Completed: ${stats.signupComplete}`);
  console.log(`📈 Average Load Performance: Check metrics above`);
  console.log(`🎯 Focus: Response times and error rates under sustained load`);

  console.log("\n💡 Performance Analysis:");
  console.log("• Check p(95) response time - should be under 2s");
  console.log("• Check error rate - should be under 5%");
  console.log("• Monitor system resources during sustained load");

  console.log("\n🚀 Next Steps:");
  console.log(`• ${stats.signupComplete} new users added to data pool`);
  console.log(
    "• Run: k6 run tests-scripts/average-load-testing/02-signin-load.js"
  );
}
