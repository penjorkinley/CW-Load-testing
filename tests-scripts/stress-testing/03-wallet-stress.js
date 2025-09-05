// tests-scripts/stress-testing/03-wallet-stress.js
// STRESS TEST: Wallet Creation API - Resource-intensive operation stress

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
    { duration: "2m", target: 40 }, // Gradual ramp-up: 0 → 40 users
    { duration: "4m", target: 40 }, // Stress level 1: 40 concurrent wallet creations
    { duration: "3m", target: 80 }, // Ramp to high stress: 80 users
    { duration: "5m", target: 80 }, // Sustained resource stress
    { duration: "2m", target: 100 }, // Peak stress: 100 concurrent operations
    { duration: "4m", target: 100 }, // Maximum wallet creation stress
    { duration: "3m", target: 40 }, // Recovery: back to moderate load
    { duration: "2m", target: 0 }, // Graceful shutdown
  ],
  // Wallet stress thresholds - resource-intensive operations
  thresholds: {
    http_req_duration: ["p(95)<8000", "p(50)<4000"], // Wallet creation is heavy
    http_req_failed: ["rate<0.18"], // Allow up to 18% failures under stress
    checks: ["rate>0.78"], // 78% success rate minimum
  },
};

let availableUsers = [];

export function setup() {
  console.log("🔥 STRESS TEST: Wallet Creation API");
  console.log("===================================");
  console.log(
    "🎯 GOAL: Test resource-intensive wallet operations under stress"
  );
  console.log("⚠️  WARNING: High resource consumption expected");
  console.log("");
  console.log("📊 STRESS PATTERN:");
  console.log("• Phase 1: 40 concurrent wallet operations (4 min)");
  console.log(
    "• Phase 2: 80 concurrent wallet operations (5 min) ← Resource stress"
  );
  console.log(
    "• Phase 3: 100 concurrent wallet operations (4 min) ← Peak stress"
  );
  console.log("• Phase 4: Recovery testing (5 min)");
  console.log("• Total Duration: 25 minutes");
  console.log("");
  console.log("🔍 RESOURCE MONITORING:");
  console.log("• Database connection pool utilization");
  console.log("• Memory usage for wallet state management");
  console.log("• Disk I/O for wallet storage operations");
  console.log("• CPU usage for cryptographic operations");

  initializeStorage();

  // Load authenticated users from signin stress test
  availableUsers = getUsersByStatus("signin_complete");

  if (availableUsers.length === 0) {
    console.log(
      "❌ No authenticated users available for wallet stress testing!"
    );
    console.log("   Run signin stress test first:");
    console.log("   k6 run tests-scripts/stress-testing/02-signin-stress.js");
    throw new Error(
      "No authenticated users available for wallet stress testing"
    );
  }

  console.log(`📋 Found ${availableUsers.length} authenticated users`);
  console.log("🏗️  Beginning resource-intensive wallet creation stress...");

  return { users: availableUsers };
}

export default function (data) {
  // Select user with valid access token
  const randomIndex = Math.floor(Math.random() * data.users.length);
  const user = data.users[randomIndex];

  if (!user || !user.accessToken) {
    console.log("❌ No authenticated user available for wallet stress");
    return;
  }

  const walletLabel = `Stress_Wallet_${Date.now()}_${__VU}_${__ITER}`;

  const response = makePostRequest(
    "/create-wallet",
    {
      label: walletLabel,
      connectionImageUrl: "https://picsum.photos/200",
    },
    user.accessToken
  );

  const success = check(response, {
    "stress_wallet: status 201": (r) => r.status === 201,
    "stress_wallet: has wallet id": (r) => parseResponse(r)?.data?.id,
    "stress_wallet: has tenantId": (r) => parseResponse(r)?.data?.tenantId,
    "stress_wallet: response under 8s": (r) => r.timings.duration < 8000,
    "stress_wallet: response under 4s": (r) => r.timings.duration < 4000,
    "stress_wallet: no server overload": (r) =>
      r.status !== 503 && r.status !== 502,
  });

  // Monitor resource stress indicators
  if (response.timings.duration > 6000) {
    console.log(
      `⚠️  Resource stress detected: ${response.timings.duration.toFixed(
        0
      )}ms (VU: ${__VU})`
    );
  }

  if (response.status === 503) {
    console.log(`🔥 Service overload detected (VU: ${__VU})`);
  }

  if (response.status === 502) {
    console.log(`🔥 Gateway timeout - backend stress (VU: ${__VU})`);
  }

  if (response.status === 429) {
    console.log(`🚦 Rate limiting due to resource pressure (VU: ${__VU})`);
  }

  if (success) {
    const walletData = parseResponse(response);

    // Update user for DID stress testing
    updateUserInStorage(user.username, {
      walletId: walletData.data.id,
      tenantId: walletData.data.tenantId,
      step: "wallet_complete",
      lastWalletCreation: new Date().toISOString(),
      stressTest: true,
    });
  }

  // Resource-intensive operations need longer pauses
  sleep(Math.random() * 3 + 1); // Sleep 1-4 seconds
}

export function teardown(data) {
  console.log("\n🔥 STRESS TEST RESULTS - WALLET CREATION API");
  console.log("============================================");

  const stats = getStorageStats();
  console.log(`📊 RESOURCE STRESS PERFORMANCE:`);
  console.log(`• Peak concurrent wallet operations: 100`);
  console.log(`• Users with wallets created: ${stats.walletComplete}`);
  console.log(`• Duration under peak stress: 4 minutes`);
  console.log(`• Total resource stress duration: 25 minutes`);

  console.log(`\n🚀 NEXT STRESS TESTS:`);
  console.log(`• ${stats.walletComplete} users with wallets ready`);
  console.log(
    `• Run: k6 run tests-scripts/stress-testing/04-did-create-stress.js`
  );
}
