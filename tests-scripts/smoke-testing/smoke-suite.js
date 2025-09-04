// tests/smoke-testing/smoke-suite.js
// Comprehensive smoke testing for Phase 1 APIs

import { check, group, sleep } from "k6";
import { createUserData, generateUsername } from "../../utils/data-manager.js";
import {
  makeGetRequest,
  makePostRequest,
  parseResponse,
} from "../../utils/http-helpers.js";
import {
  exportStorageData,
  getStorageStats,
  initializeStorage,
  saveUserToStorage,
} from "../../utils/json-storage.js";

export const options = {
  stages: [
    { duration: "10s", target: 1 }, // Smoke test with 1 user
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 95% of requests under 2s
    http_req_failed: ["rate<0.1"], // Less than 10% failures
  },
};

export function setup() {
  console.log("🔥 STARTING SMOKE TESTING SUITE");
  console.log("================================");
  initializeStorage();
  return {};
}

export default function () {
  const username = generateUsername("smoke");
  let userData = createUserData(username);

  console.log(`\n🧪 Starting smoke test for user: ${username}`);

  // Test 1: User Signup
  group("User Signup", function () {
    console.log("📝 Testing: User Signup");

    const signupResponse = makePostRequest("/user/username/signup", {
      username: username,
      firstName: "Smoke",
      lastName: "Test",
      password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
    });

    const signupSuccess = check(signupResponse, {
      "signup: status is 201": (r) => r.status === 201,
      "signup: has userId": (r) => {
        const body = parseResponse(r);
        return body && body.data && body.data.userId;
      },
      "signup: response time < 2s": (r) => r.timings.duration < 2000,
    });

    if (signupSuccess) {
      userData.userId = parseResponse(signupResponse).data.userId;
      userData.step = "signup_complete";
      console.log("  ✅ Signup successful");
    } else {
      console.log("  ❌ Signup failed");
      return; // Stop if signup fails
    }
  });

  sleep(1);

  // Test 2: User Signin
  group("User Signin", function () {
    console.log("🔐 Testing: User Signin");

    const signinResponse = makePostRequest("/user/username/signin", {
      username: username,
      password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
    });

    const signinSuccess = check(signinResponse, {
      "signin: status is 201": (r) => r.status === 201,
      "signin: has access_token": (r) => {
        const body = parseResponse(r);
        return body && body.data && body.data.access_token;
      },
      "signin: has refresh_token": (r) => {
        const body = parseResponse(r);
        return body && body.data && body.data.refresh_token;
      },
      "signin: response time < 2s": (r) => r.timings.duration < 2000,
    });

    if (signinSuccess) {
      const signinData = parseResponse(signinResponse);
      userData.accessToken = signinData.data.access_token;
      userData.refreshToken = signinData.data.refresh_token;
      userData.step = "signin_complete";
      console.log("  ✅ Signin successful");
    } else {
      console.log("  ❌ Signin failed");
      return;
    }
  });

  sleep(1);

  // Test 3: Wallet Creation
  group("Wallet Creation", function () {
    console.log("👛 Testing: Wallet Creation");

    const walletResponse = makePostRequest(
      "/create-wallet",
      {
        label: "Smoke Test Wallet",
        connectionImageUrl: "https://picsum.photos/200",
      },
      userData.accessToken
    );

    const walletSuccess = check(walletResponse, {
      "wallet: status is 201": (r) => r.status === 201,
      "wallet: has wallet id": (r) => {
        const body = parseResponse(r);
        return body && body.data && body.data.id;
      },
      "wallet: has tenantId": (r) => {
        const body = parseResponse(r);
        return body && body.data && body.data.tenantId;
      },
      "wallet: response time < 3s": (r) => r.timings.duration < 3000,
    });

    if (walletSuccess) {
      const walletData = parseResponse(walletResponse);
      userData.walletId = walletData.data.id;
      userData.tenantId = walletData.data.tenantId;
      userData.step = "wallet_complete";
      console.log("  ✅ Wallet creation successful");
    } else {
      console.log("  ❌ Wallet creation failed");
      return;
    }
  });

  sleep(1);

  // Test 4: DID Creation
  group("DID Creation", function () {
    console.log("🆔 Testing: DID Creation");

    const didCreateResponse = makePostRequest("/did", {}, userData.accessToken);

    const didCreateSuccess = check(didCreateResponse, {
      "did_create: status is 201": (r) => r.status === 201,
      "did_create: has did": (r) => {
        const body = parseResponse(r);
        return body && body.data && body.data.did;
      },
      "did_create: did starts with did:key:": (r) => {
        const body = parseResponse(r);
        return (
          body &&
          body.data &&
          body.data.did &&
          body.data.did.startsWith("did:key:")
        );
      },
      "did_create: response time < 3s": (r) => r.timings.duration < 3000,
    });

    if (didCreateSuccess) {
      const didData = parseResponse(didCreateResponse);
      userData.did = didData.data.did;
      userData.step = "did_create_complete";
      console.log("  ✅ DID creation successful");
    } else {
      console.log("  ❌ DID creation failed");
      return;
    }
  });

  sleep(1);

  // Test 5: DID Retrieval
  group("DID Retrieval", function () {
    console.log("🔍 Testing: DID Retrieval");

    const didGetResponse = makeGetRequest("/did", userData.accessToken);

    const didRetrievalSuccess = check(didGetResponse, {
      "did_retrieve: status is 200": (r) => r.status === 200,
      "did_retrieve: has hashTenantID": (r) => {
        const body = parseResponse(r);
        return body && body.data && body.data.hashTenantID;
      },
      "did_retrieve: has same did": (r) => {
        const body = parseResponse(r);
        return body && body.data && body.data.did === userData.did;
      },
      "did_retrieve: response time < 2s": (r) => r.timings.duration < 2000,
    });

    if (didRetrievalSuccess) {
      const didRetrievalData = parseResponse(didGetResponse);
      userData.hashTenantID = didRetrievalData.data.hashTenantID;
      userData.step = "phase1_complete";
      userData.phase2Ready = true;
      console.log("  ✅ DID retrieval successful");
      console.log("  🎉 PHASE 1 COMPLETE!");
    } else {
      console.log("  ❌ DID retrieval failed");
    }
  });

  // Save complete user data
  saveUserToStorage(userData);

  // Show final status
  console.log(`\n📋 Final Status for ${username}:`);
  console.log(`  Step: ${userData.step}`);
  console.log(`  Phase 2 Ready: ${userData.phase2Ready}`);
  console.log(`  User ID: ${userData.userId}`);
  console.log(`  Wallet ID: ${userData.walletId}`);
  console.log(`  Tenant ID: ${userData.tenantId}`);
  console.log(`  DID: ${userData.did}`);
  console.log(`  Hash Tenant ID: ${userData.hashTenantID}`);

  sleep(1);
}

export function teardown(data) {
  console.log("\n🔥 SMOKE TESTING COMPLETE");
  console.log("===========================");

  // Show final statistics
  getStorageStats();

  // Export all data for review
  console.log("\n📄 EXPORTING FINAL DATA:");
  exportStorageData();

  console.log("\n✅ Smoke tests finished successfully!");
}
