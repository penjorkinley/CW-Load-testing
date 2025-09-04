// tests-scripts/smoke-testing/run-smoke-tests.js
// Main smoke test runner - creates base user data for load testing

import { check, group, sleep } from "k6";
import { createUserData, generateUsername } from "../../utils/data-manager.js";
import {
  makeGetRequest,
  makePostRequest,
  parseResponse,
} from "../../utils/http-helpers.js";
import {
  clearStorage,
  exportStorageData,
  getStorageStats,
  initializeStorage,
  saveUserToStorage,
} from "../../utils/json-storage.js";

export const options = {
  stages: [
    { duration: "30s", target: 10 }, // Create 10 users for later load testing
  ],
  thresholds: {
    http_req_duration: ["p(95)<3000"],
    http_req_failed: ["rate<0.1"],
    checks: ["rate>0.9"],
  },
};

export function setup() {
  console.log("🔥 SMOKE TESTING - Creating Base Users for Load Testing");
  console.log("=====================================================");
  clearStorage();
  initializeStorage();
  return {};
}

export default function () {
  const username = generateUsername("smoke");
  let userData = createUserData(username);

  console.log(`🧪 Creating user: ${username}`);

  // Step 1: User Signup
  group("User Signup", function () {
    const response = makePostRequest("/user/username/signup", {
      username: username,
      firstName: "Smoke",
      lastName: "Test",
      password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
    });

    const success = check(response, {
      "signup: status 201": (r) => r.status === 201,
      "signup: has userId": (r) => parseResponse(r)?.data?.userId,
    });

    if (success) {
      userData.userId = parseResponse(response).data.userId;
      userData.step = "signup_complete";
    } else {
      console.log(`❌ Signup failed for ${username}`);
      return;
    }
  });

  sleep(1);

  // Step 2: User Signin
  group("User Signin", function () {
    const response = makePostRequest("/user/username/signin", {
      username: username,
      password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
    });

    const success = check(response, {
      "signin: status 201": (r) => r.status === 201,
      "signin: has token": (r) => parseResponse(r)?.data?.access_token,
    });

    if (success) {
      const signinData = parseResponse(response);
      userData.accessToken = signinData.data.access_token;
      userData.refreshToken = signinData.data.refresh_token;
      userData.step = "signin_complete";
    } else {
      console.log(`❌ Signin failed for ${username}`);
      return;
    }
  });

  sleep(1);

  // Step 3: Wallet Creation
  group("Wallet Creation", function () {
    const response = makePostRequest(
      "/create-wallet",
      {
        label: "Load Test Wallet",
        connectionImageUrl: "https://picsum.photos/200",
      },
      userData.accessToken
    );

    const success = check(response, {
      "wallet: status 201": (r) => r.status === 201,
      "wallet: has id": (r) => parseResponse(r)?.data?.id,
    });

    if (success) {
      const walletData = parseResponse(response);
      userData.walletId = walletData.data.id;
      userData.tenantId = walletData.data.tenantId;
      userData.step = "wallet_complete";
    } else {
      console.log(`❌ Wallet failed for ${username}`);
      return;
    }
  });

  sleep(1);

  // Step 4: DID Creation
  group("DID Creation", function () {
    const response = makePostRequest("/did", {}, userData.accessToken);

    const success = check(response, {
      "did_create: status 201": (r) => r.status === 201,
      "did_create: has did": (r) => parseResponse(r)?.data?.did,
    });

    if (success) {
      userData.did = parseResponse(response).data.did;
      userData.step = "did_create_complete";
    } else {
      console.log(`❌ DID creation failed for ${username}`);
      return;
    }
  });

  sleep(1);

  // Step 5: DID Retrieval
  group("DID Retrieval", function () {
    const response = makeGetRequest("/did", userData.accessToken);

    const success = check(response, {
      "did_retrieve: status 200": (r) => r.status === 200,
      "did_retrieve: has hashTenantID": (r) =>
        parseResponse(r)?.data?.hashTenantID,
    });

    if (success) {
      userData.hashTenantID = parseResponse(response).data.hashTenantID;
      userData.step = "phase1_complete";
      userData.phase2Ready = true;
      console.log(`✅ Complete user created: ${username}`);
    } else {
      console.log(`❌ DID retrieval failed for ${username}`);
    }
  });

  // Save user to storage for load testing
  saveUserToStorage(userData);
  sleep(1);
}

export function teardown(data) {
  console.log("\n🎯 SMOKE TESTING COMPLETE");
  console.log("==========================");

  const stats = getStorageStats();
  console.log(`📊 Created ${stats.totalUsers} users for load testing`);
  console.log(`✅ Phase 2 Ready: ${stats.phase2Ready} users`);

  exportStorageData();
  console.log("\n🚀 Ready for individual API load testing!");
}
