// tests-scripts/smoke-testing/individual/02-signin-load.js
// LOAD TEST: User Signin API only (uses existing users)

import { check, sleep } from "k6";
import { makePostRequest, parseResponse } from "../../../utils/http-helpers.js";
import {
  getStorageStats,
  getUsersByStatus,
  initializeStorage,
  updateUserInStorage,
} from "../../../utils/json-storage.js";

export const options = {
  stages: [
    { duration: "1m", target: 15 }, // Ramp up to 15 users
    { duration: "2m", target: 30 }, // Scale to 30 users
    { duration: "1m", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.05"],
    checks: ["rate>0.95"],
  },
};

// Get users from smoke test
let availableUsers = [];

export function setup() {
  console.log("🔥 LOAD TEST: User Signin API");
  console.log("=============================");

  initializeStorage();

  // Load existing users with signup complete
  availableUsers = getUsersByStatus("signup_complete");

  if (availableUsers.length === 0) {
    console.log("❌ No users available! Run smoke tests first:");
    console.log("   k6 run tests-scripts/smoke-testing/run-smoke-tests.js");
    throw new Error("No users available for signin testing");
  }

  console.log(
    `📋 Found ${availableUsers.length} users ready for signin testing`
  );
  return { users: availableUsers };
}

export default function (data) {
  // Get random user from available users
  const randomIndex = Math.floor(Math.random() * data.users.length);
  const user = data.users[randomIndex];

  if (!user) {
    console.log("❌ No user available for this iteration");
    return;
  }

  const response = makePostRequest("/user/username/signin", {
    username: user.username,
    password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=", // Same password used in signup
  });

  const success = check(response, {
    "signin_load: status 201": (r) => r.status === 201,
    "signin_load: has access_token": (r) =>
      parseResponse(r)?.data?.access_token,
    "signin_load: has refresh_token": (r) =>
      parseResponse(r)?.data?.refresh_token,
    "signin_load: under 2s": (r) => r.timings.duration < 2000,
  });

  if (success) {
    const signinData = parseResponse(response);

    // Update user with tokens for future wallet testing
    updateUserInStorage(user.username, {
      accessToken: signinData.data.access_token,
      refreshToken: signinData.data.refresh_token,
      step: "signin_complete",
    });
  }

  sleep(0.5);
}

export function teardown(data) {
  console.log("\n📊 SIGNIN LOAD TEST RESULTS");
  console.log("============================");

  const stats = getStorageStats();
  console.log(`✅ Signin Complete: ${stats.signinComplete} users`);
  console.log(
    `🔑 Users with tokens ready for wallet testing: ${stats.signinComplete}`
  );
}
