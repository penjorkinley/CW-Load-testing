// tests-scripts/smoke-testing/run-data-creation.js
// DATA CREATION: Creates real user pool for load testing

import { check, sleep } from "k6";
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
    { duration: "30s", target: 10 }, // Create 10 users for load testing
  ],
  thresholds: {
    http_req_duration: ["p(95)<5000"],
    http_req_failed: ["rate<0.1"],
    checks: ["rate>0.9"],
  },
};

export function setup() {
  console.log("🏗️ DATA CREATION: Creating Real User Pool for Load Testing");
  console.log("========================================================");
  clearStorage(); // Clear old data
  initializeStorage();
  return {};
}

export default function () {
  const username = generateUsername("load_data");
  let userData = createUserData(username);

  console.log(`🏗️ Creating complete user: ${username}`);

  // Complete Phase 1 flow to create real users

  // Step 1: Signup
  const signupResponse = makePostRequest("/user/username/signup", {
    username: username,
    firstName: "Load",
    lastName: "Data",
    password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
  });

  const signupSuccess = check(signupResponse, {
    "data_creation: signup status 201": (r) => r.status === 201,
    "data_creation: has userId": (r) => parseResponse(r)?.data?.userId,
  });

  if (!signupSuccess) {
    console.log(`❌ Signup failed for ${username}`);
    return;
  }

  userData.userId = parseResponse(signupResponse).data.userId;
  userData.step = "signup_complete";
  sleep(1);

  // Step 2: Signin
  const signinResponse = makePostRequest("/user/username/signin", {
    username: username,
    password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
  });

  const signinSuccess = check(signinResponse, {
    "data_creation: signin status 201": (r) => r.status === 201,
    "data_creation: has token": (r) => parseResponse(r)?.data?.access_token,
  });

  if (!signinSuccess) {
    console.log(`❌ Signin failed for ${username}`);
    return;
  }

  const signinData = parseResponse(signinResponse);
  userData.accessToken = signinData.data.access_token;
  userData.refreshToken = signinData.data.refresh_token;
  userData.step = "signin_complete";
  sleep(1);

  // Step 3: Wallet Creation
  const walletResponse = makePostRequest(
    "/create-wallet",
    {
      label: "Load Test Wallet",
      connectionImageUrl: "https://picsum.photos/200",
    },
    userData.accessToken
  );

  const walletSuccess = check(walletResponse, {
    "data_creation: wallet status 201": (r) => r.status === 201,
    "data_creation: has wallet id": (r) => parseResponse(r)?.data?.id,
  });

  if (!walletSuccess) {
    console.log(`❌ Wallet creation failed for ${username}`);
    return;
  }

  const walletData = parseResponse(walletResponse);
  userData.walletId = walletData.data.id;
  userData.tenantId = walletData.data.tenantId;
  userData.step = "wallet_complete";
  sleep(1);

  // Step 4: DID Creation
  const didCreateResponse = makePostRequest("/did", {}, userData.accessToken);

  const didCreateSuccess = check(didCreateResponse, {
    "data_creation: did create status 201": (r) => r.status === 201,
    "data_creation: has did": (r) => parseResponse(r)?.data?.did,
  });

  if (!didCreateSuccess) {
    console.log(`❌ DID creation failed for ${username}`);
    return;
  }

  userData.did = parseResponse(didCreateResponse).data.did;
  userData.step = "did_create_complete";
  sleep(1);

  // Step 5: DID Retrieval
  const didGetResponse = makeGetRequest("/did", userData.accessToken);

  const didGetSuccess = check(didGetResponse, {
    "data_creation: did get status 200": (r) => r.status === 200,
    "data_creation: has hashTenantID": (r) =>
      parseResponse(r)?.data?.hashTenantID,
  });

  if (didGetSuccess) {
    userData.hashTenantID = parseResponse(didGetResponse).data.hashTenantID;
    userData.step = "phase1_complete";
    userData.phase2Ready = true;
    console.log(`✅ Complete user created: ${username}`);
  }

  // Save user to storage for load testing
  saveUserToStorage(userData);
  sleep(1);
}

export function teardown(data) {
  console.log("\n🎯 DATA CREATION COMPLETE");
  console.log("=========================");

  const stats = getStorageStats();
  console.log(`📊 Created ${stats.totalUsers} users for load testing`);
  console.log(`✅ Phase 1 Complete: ${stats.phase2Ready} users`);
  console.log(`📁 Data saved to: data/users.json`);

  exportStorageData();
  console.log("\n🚀 Ready for average load testing!");
  console.log("Run individual API load tests:");
  console.log("• k6 run tests-scripts/average-load-testing/01-signup-load.js");
  console.log("• k6 run tests-scripts/average-load-testing/02-signin-load.js");
  console.log("• etc...");
}
