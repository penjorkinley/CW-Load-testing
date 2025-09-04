// tests-scripts/smoke-testing/individual/04-did-create-load.js
// LOAD TEST: DID Creation API only (uses existing users with wallets)

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
    { duration: "1m", target: 8 }, // Ramp up to 8 users
    { duration: "3m", target: 20 }, // Scale to 20 users
    { duration: "1m", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<3000"], // DID creation can take time
    http_req_failed: ["rate<0.05"],
    checks: ["rate>0.95"],
  },
};

let availableUsers = [];

export function setup() {
  console.log("🔥 LOAD TEST: DID Creation API");
  console.log("==============================");

  initializeStorage();

  // Get users who have wallets
  availableUsers = getUsersByStatus("wallet_complete");

  if (availableUsers.length === 0) {
    console.log("❌ No users with wallets available!");
    console.log("   Run wallet load test first or smoke tests:");
    console.log(
      "   k6 run tests-scripts/smoke-testing/individual/03-wallet-load.js"
    );
    throw new Error("No users with wallets available for DID testing");
  }

  console.log(
    `📋 Found ${availableUsers.length} users with wallets for DID testing`
  );
  return { users: availableUsers };
}

export default function (data) {
  // Get random user with wallet
  const randomIndex = Math.floor(Math.random() * data.users.length);
  const user = data.users[randomIndex];

  if (!user || !user.accessToken) {
    console.log("❌ No user with wallet available");
    return;
  }

  const response = makePostRequest("/did", {}, user.accessToken);

  const success = check(response, {
    "did_create_load: status 201": (r) => r.status === 201,
    "did_create_load: has did": (r) => parseResponse(r)?.data?.did,
    "did_create_load: valid did format": (r) => {
      const did = parseResponse(r)?.data?.did;
      return did && did.startsWith("did:key:");
    },
    "did_create_load: under 3s": (r) => r.timings.duration < 3000,
  });

  if (success) {
    const didData = parseResponse(response);

    // Update user with DID for retrieval testing
    updateUserInStorage(user.username, {
      did: didData.data.did,
      step: "did_create_complete",
    });
  }

  sleep(0.5);
}

export function teardown(data) {
  console.log("\n📊 DID CREATION LOAD TEST RESULTS");
  console.log("=================================");

  const stats = getStorageStats();
  console.log(`✅ DIDs Created: ${stats.didComplete} users`);
  console.log(`🆔 Users ready for DID retrieval testing: ${stats.didComplete}`);
}
