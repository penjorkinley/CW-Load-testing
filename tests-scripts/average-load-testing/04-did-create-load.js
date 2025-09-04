// tests-scripts/average-load-testing/04-did-create-load.js
// AVERAGE LOAD TEST: DID Creation API Performance Testing

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
    { duration: "2m", target: 5 }, // Slow ramp-up: 0 → 5 users
    { duration: "3m", target: 5 }, // Stay: 5 concurrent users (DID creation is heavy)
    { duration: "2m", target: 10 }, // Peak: 5 → 10 users
    { duration: "2m", target: 10 }, // Sustain: 10 concurrent users
    { duration: "1m", target: 0 }, // Ramp-down
  ],
  thresholds: {
    http_req_duration: ["p(95)<4000", "p(50)<2500"], // DID creation is slow
    http_req_failed: ["rate<0.05"],
    checks: ["rate>0.93"], // Slightly lower due to complexity
  },
};

let availableUsers = [];

export function setup() {
  console.log("📊 AVERAGE LOAD TEST: DID Creation API");
  console.log("======================================");
  console.log("Simulating DID creation under sustained load...");
  console.log("Duration: 10 minutes total");
  console.log("Load Pattern: 5 → 10 → 0 concurrent users");
  console.log("⚠️  DID creation is resource-intensive - conservative load");

  initializeStorage();

  // Load REAL users who have wallets from data/users.json
  availableUsers = getUsersByStatus("wallet_complete");

  if (availableUsers.length === 0) {
    console.log("❌ No users with wallets available!");
    console.log("   Run wallet load test first:");
    console.log(
      "   k6 run tests-scripts/average-load-testing/03-wallet-load.js"
    );
    throw new Error("No users with wallets available for DID testing");
  }

  console.log(
    `📋 Found ${availableUsers.length} users with wallets for DID testing`
  );
  console.log("🎯 Testing DID creation performance under sustained load...");

  return { users: availableUsers };
}

export default function (data) {
  // Randomly select a user with wallet
  const randomIndex = Math.floor(Math.random() * data.users.length);
  const user = data.users[randomIndex];

  if (!user || !user.accessToken || !user.walletId) {
    console.log("❌ No user with wallet available");
    return;
  }

  const response = makePostRequest("/did", {}, user.accessToken);

  const success = check(response, {
    "avg_load_did_create: status 201": (r) => r.status === 201,
    "avg_load_did_create: has did": (r) => parseResponse(r)?.data?.did,
    "avg_load_did_create: valid did format": (r) => {
      const did = parseResponse(r)?.data?.did;
      return did && did.startsWith("did:key:");
    },
    "avg_load_did_create: response < 4s": (r) => r.timings.duration < 4000,
    "avg_load_did_create: response < 2.5s": (r) => r.timings.duration < 2500,
  });

  if (success) {
    const didData = parseResponse(response);

    // Update user with DID for retrieval testing
    updateUserInStorage(user.username, {
      did: didData.data.did,
      step: "did_create_complete",
      lastDIDCreation: new Date().toISOString(),
    });
  }

  // Simulate realistic DID creation behavior
  // DID creation is infrequent and resource-heavy, users take time between operations
  sleep(Math.random() * 8 + 3); // Sleep 3-11 seconds
}

export function teardown(data) {
  console.log("\n📊 AVERAGE LOAD TEST RESULTS - DID CREATION");
  console.log("===========================================");

  const stats = getStorageStats();
  console.log(
    `✅ DID Creation Operations: Multiple creations for ${data.users.length} users`
  );
  console.log(`🆔 Users with DIDs: ${stats.didComplete}`);
  console.log(`📈 Average Load Performance: Check detailed metrics above`);

  console.log("\n💡 DID Creation Performance Analysis:");
  console.log("• p(50) should be under 2.5s (median DID creation time)");
  console.log("• p(95) should be under 4s (95% of DID creations)");
  console.log("• Error rate should be under 5%");
  console.log(
    "• Most resource-intensive operation - conservative load applied"
  );

  console.log("\n🚀 Next Steps:");
  console.log(`• ${stats.didComplete} users ready for DID retrieval testing`);
  console.log(
    "• Run: k6 run tests-scripts/average-load-testing/05-did-retrieve-load.js"
  );
}
