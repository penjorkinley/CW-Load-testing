// tests-scripts/smoke-testing/user-onboarding.js
// SANITY TEST: Complete Phase 1 User Onboarding Flow (All APIs)

import { check, group, sleep } from "k6";
import { createUserData, generateUsername } from "../../utils/data-manager.js";
import {
  makeGetRequest,
  makePostRequest,
  parseResponse,
} from "../../utils/http-helpers.js";

export const options = {
  vus: 1, // Single user for sanity testing
  iterations: 1, // Run exactly once
  thresholds: {
    http_req_duration: ["p(95)<5000"], // Generous threshold for sanity
    http_req_failed: ["rate<0.1"], // Allow some failures for debugging
    checks: ["rate>0.8"], // 80% success minimum
  },
};

export function setup() {
  console.log("🧪 SANITY TEST: Phase 1 User Onboarding");
  console.log("======================================");
  console.log("Testing complete user onboarding flow...");
  return {};
}

export default function () {
  const username = generateUsername("sanity");
  let userData = createUserData(username);

  console.log(`\n🔍 Testing complete onboarding for: ${username}`);

  // Test 1: User Signup
  group("1. User Signup", function () {
    console.log("📝 Testing: POST /user/username/signup");

    const response = makePostRequest("/user/username/signup", {
      username: username,
      firstName: "Sanity",
      lastName: "Test",
      password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
    });

    const success = check(response, {
      "signup_sanity: status 201": (r) => r.status === 201,
      "signup_sanity: has userId": (r) => parseResponse(r)?.data?.userId,
      "signup_sanity: correct message": (r) =>
        parseResponse(r)?.message === "User signUp successfully.",
    });

    if (success) {
      userData.userId = parseResponse(response).data.userId;
      userData.step = "signup_complete";
      console.log("  ✅ Signup API working correctly");
    } else {
      console.log(`  ❌ Signup API failed - Status: ${response.status}`);
      return;
    }
  });

  sleep(1);

  // Test 2: User Signin
  group("2. User Signin", function () {
    console.log("🔐 Testing: POST /user/username/signin");

    const response = makePostRequest("/user/username/signin", {
      username: username,
      password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
    });

    const success = check(response, {
      "signin_sanity: status 201": (r) => r.status === 201,
      "signin_sanity: has access_token": (r) =>
        parseResponse(r)?.data?.access_token,
      "signin_sanity: has refresh_token": (r) =>
        parseResponse(r)?.data?.refresh_token,
    });

    if (success) {
      const signinData = parseResponse(response);
      userData.accessToken = signinData.data.access_token;
      userData.refreshToken = signinData.data.refresh_token;
      userData.step = "signin_complete";
      console.log("  ✅ Signin API working correctly");
    } else {
      console.log(`  ❌ Signin API failed - Status: ${response.status}`);
      return;
    }
  });

  sleep(1);

  // Test 3: Wallet Creation
  group("3. Wallet Creation", function () {
    console.log("👛 Testing: POST /create-wallet");

    const response = makePostRequest(
      "/create-wallet",
      {
        label: "Sanity Test Wallet",
        connectionImageUrl: "https://picsum.photos/200",
      },
      userData.accessToken
    );

    const success = check(response, {
      "wallet_sanity: status 201": (r) => r.status === 201,
      "wallet_sanity: has wallet id": (r) => parseResponse(r)?.data?.id,
      "wallet_sanity: has tenantId": (r) => parseResponse(r)?.data?.tenantId,
    });

    if (success) {
      const walletData = parseResponse(response);
      userData.walletId = walletData.data.id;
      userData.tenantId = walletData.data.tenantId;
      userData.step = "wallet_complete";
      console.log("  ✅ Wallet creation API working correctly");
    } else {
      console.log(
        `  ❌ Wallet creation API failed - Status: ${response.status}`
      );
      return;
    }
  });

  sleep(1);

  // Test 4: DID Creation
  group("4. DID Creation", function () {
    console.log("🆔 Testing: POST /did");

    const response = makePostRequest("/did", {}, userData.accessToken);

    const success = check(response, {
      "did_create_sanity: status 201": (r) => r.status === 201,
      "did_create_sanity: has did": (r) => parseResponse(r)?.data?.did,
      "did_create_sanity: valid did format": (r) => {
        const did = parseResponse(r)?.data?.did;
        return did && did.startsWith("did:key:");
      },
    });

    if (success) {
      const didData = parseResponse(response);
      userData.did = didData.data.did;
      userData.step = "did_create_complete";
      console.log("  ✅ DID creation API working correctly");
    } else {
      console.log(`  ❌ DID creation API failed - Status: ${response.status}`);
      return;
    }
  });

  sleep(1);

  // Test 5: DID Retrieval
  group("5. DID Retrieval", function () {
    console.log("🔍 Testing: GET /did");

    const response = makeGetRequest("/did", userData.accessToken);

    const success = check(response, {
      "did_retrieve_sanity: status 200": (r) => r.status === 200,
      "did_retrieve_sanity: has hashTenantID": (r) =>
        parseResponse(r)?.data?.hashTenantID,
      "did_retrieve_sanity: matches created did": (r) => {
        const retrievedDid = parseResponse(r)?.data?.did;
        return retrievedDid === userData.did;
      },
    });

    if (success) {
      const didRetrievalData = parseResponse(response);
      userData.hashTenantID = didRetrievalData.data.hashTenantID;
      userData.step = "phase1_complete";
      userData.phase2Ready = true;
      console.log("  ✅ DID retrieval API working correctly");
      console.log("  🎉 PHASE 1 COMPLETE - All APIs functional!");
    } else {
      console.log(`  ❌ DID retrieval API failed - Status: ${response.status}`);
    }
  });

  console.log(`\n📋 SANITY TEST RESULTS:`);
  console.log(`  Username: ${userData.username}`);
  console.log(`  Final Step: ${userData.step}`);
  console.log(`  Phase 2 Ready: ${userData.phase2Ready || "No"}`);
}

export function teardown(data) {
  console.log("\n🎯 PHASE 1 SANITY TEST COMPLETE");
  console.log("================================");
  console.log("✅ User onboarding flow validation finished");
  console.log("");
  // console.log("🚀 If all tests passed:");
  console.log("• APIs are ready for load testing");
  console.log("• Run: k6 run tests-scripts/smoke-testing/run-data-creation.js");
}
