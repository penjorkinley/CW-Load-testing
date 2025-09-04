// tests-scripts/smoke-testing/individual/01-signup-load.js
// LOAD TEST: User Signup API only

import { check, sleep } from "k6";
import {
  createUserData,
  generateUsername,
} from "../../../utils/data-manager.js";
import { makePostRequest, parseResponse } from "../../../utils/http-helpers.js";
import {
  getStorageStats,
  initializeStorage,
  saveUserToStorage,
} from "../../../utils/json-storage.js";

export const options = {
  stages: [
    { duration: "1m", target: 20 }, // Ramp up to 20 users
    { duration: "2m", target: 50 }, // Scale to 50 users
    { duration: "1m", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 95% under 2s
    http_req_failed: ["rate<0.05"], // Less than 5% failures
    checks: ["rate>0.95"], // 95% success
  },
};

export function setup() {
  console.log("🔥 LOAD TEST: User Signup API");
  console.log("============================");
  initializeStorage();
  return {};
}

export default function () {
  const username = generateUsername("signup_load");
  let userData = createUserData(username);

  const response = makePostRequest("/user/username/signup", {
    username: username,
    firstName: "Load",
    lastName: "Test",
    password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
  });

  const success = check(response, {
    "signup_load: status 201": (r) => r.status === 201,
    "signup_load: has userId": (r) => parseResponse(r)?.data?.userId,
    "signup_load: under 2s": (r) => r.timings.duration < 2000,
  });

  if (success) {
    userData.userId = parseResponse(response).data.userId;
    userData.step = "signup_complete";
    saveUserToStorage(userData);
  }

  sleep(0.5);
}

export function teardown(data) {
  console.log("\n📊 SIGNUP LOAD TEST RESULTS");
  console.log("=============================");

  const stats = getStorageStats();
  console.log(`✅ Created ${stats.signupComplete} users`);
  console.log(
    `📈 Success Rate: ${(
      (stats.signupComplete / stats.totalUsers) *
      100
    ).toFixed(1)}%`
  );
}
