// tests-scripts/stress-testing/04-did-create-stress.js
// STRESS TEST: DID Creation API - Most resource-intensive operation stress

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
    { duration: "3m", target: 25 }, // Slow ramp-up: 0 → 25 users
    { duration: "5m", target: 25 }, // Stress level 1: 25 concurrent DID operations
    { duration: "4m", target: 50 }, // Ramp to moderate stress: 50 users
    { duration: "6m", target: 50 }, // Sustained cryptographic stress
    { duration: "3m", target: 75 }, // Peak stress: 75 concurrent operations
    { duration: "5m", target: 75 }, // Maximum DID creation stress
    { duration: "4m", target: 25 }, // Recovery: back to manageable load
    { duration: "3m", target: 0 }, // Graceful shutdown with cleanup
  ],
  // DID creation stress thresholds - most resource-intensive
  thresholds: {
    http_req_duration: ["p(95)<12000", "p(50)<6000"], // DID creation is very heavy
    http_req_failed: ["rate<0.25"], // Allow up to 25% failures under extreme stress
    checks: ["rate>0.70"], // 70% success rate minimum (conservative)
  },
};

let availableUsers = [];

export function setup() {
  console.log("🔥 STRESS TEST: DID Creation API");
  console.log("================================");
  console.log("🎯 GOAL: Test most resource-intensive operations under stress");
  console.log(
    "⚠️  WARNING: EXTREME resource consumption - most demanding test"
  );
  console.log("");
  console.log("📊 CONSERVATIVE STRESS PATTERN:");
  console.log("• Phase 1: 25 concurrent DID operations (5 min)");
  console.log(
    "• Phase 2: 50 concurrent DID operations (6 min) ← High crypto stress"
  );
  console.log(
    "• Phase 3: 75 concurrent DID operations (5 min) ← Maximum stress"
  );
  console.log("• Phase 4: Recovery testing (7 min)");
  console.log("• Total Duration: 33 minutes");
  console.log("");
  console.log("🔍 INTENSIVE MONITORING:");
  console.log("• Cryptographic operation bottlenecks");
  console.log("• Key generation performance degradation");
  console.log("• Memory allocation for DID documents");
  console.log("• CPU utilization for complex operations");
  console.log("• Storage I/O for DID persistence");

  initializeStorage();

  // Load users with wallets from wallet stress test
  availableUsers = getUsersByStatus("wallet_complete");

  if (availableUsers.length === 0) {
    console.log("❌ No users with wallets available for DID stress testing!");
    console.log("   Run wallet stress test first:");
    console.log("   k6 run tests-scripts/stress-testing/03-wallet-stress.js");
    throw new Error("No users with wallets available for DID stress testing");
  }

  console.log(`📋 Found ${availableUsers.length} users with wallets`);
  console.log("🆔 Beginning most intensive DID creation stress test...");
  console.log(
    "⚡ This test will push cryptographic operations to their limits"
  );

  return { users: availableUsers };
}

export default function (data) {
  // Select user with wallet
  const randomIndex = Math.floor(Math.random() * data.users.length);
  const user = data.users[randomIndex];

  if (!user || !user.accessToken || !user.walletId) {
    console.log("❌ No user with wallet available for DID stress");
    return;
  }

  const response = makePostRequest("/did", {}, user.accessToken);

  const success = check(response, {
    "stress_did_create: status 201": (r) => r.status === 201,
    "stress_did_create: has did": (r) => parseResponse(r)?.data?.did,
    "stress_did_create: valid did format": (r) => {
      const did = parseResponse(r)?.data?.did;
      return did && did.startsWith("did:key:");
    },
    "stress_did_create: response under 12s": (r) => r.timings.duration < 12000,
    "stress_did_create: response under 6s": (r) => r.timings.duration < 6000,
    "stress_did_create: no critical failures": (r) =>
      r.status !== 500 && r.status !== 503,
  });

  // Monitor cryptographic stress indicators
  if (response.timings.duration > 8000) {
    console.log(
      `⚠️  Crypto stress detected: ${response.timings.duration.toFixed(
        0
      )}ms (VU: ${__VU})`
    );
  }

  if (response.status === 503) {
    console.log(
      `🔥 Critical service overload - DID creation stress (VU: ${__VU})`
    );
  }

  if (response.status === 500) {
    console.log(
      `🔥 Internal server error - crypto operations failing (VU: ${__VU})`
    );
  }

  if (response.status === 408) {
    console.log(`⏰ Request timeout - DID generation too slow (VU: ${__VU})`);
  }

  if (success) {
    const didData = parseResponse(response);

    // Update user for DID retrieval stress testing
    updateUserInStorage(user.username, {
      did: didData.data.did,
      step: "did_create_complete",
      lastDIDCreation: new Date().toISOString(),
      stressTest: true,
    });
  }

  // Longest pause - DID creation is most resource-intensive
  sleep(Math.random() * 6 + 2); // Sleep 2-8 seconds
}

export function teardown(data) {
  console.log("\n🔥 STRESS TEST RESULTS - DID CREATION API");
  console.log("=========================================");

  const stats = getStorageStats();
  console.log(`📊 CRYPTOGRAPHIC STRESS PERFORMANCE:`);
  console.log(`• Peak concurrent DID operations: 75`);
  console.log(`• DIDs successfully created: ${stats.didComplete}`);
  console.log(`• Duration under peak stress: 5 minutes`);
  console.log(`• Total intensive stress duration: 33 minutes`);

  console.log(`\n🚀 FINAL STRESS TEST:`);
  console.log(`• ${stats.didComplete} users with DIDs ready`);
  console.log(
    `• Run: k6 run tests-scripts/stress-testing/05-did-retrieve-stress.js`
  );
  console.log(`• Allow extended recovery time before final test`);
  console.log(`• Monitor system health and resource cleanup`);
}
