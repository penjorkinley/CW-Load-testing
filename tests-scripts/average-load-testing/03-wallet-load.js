// tests-scripts/average-load-testing/03-wallet-load.js
// AVERAGE LOAD TEST: Wallet Creation API Performance Testing

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
    { duration: "1m", target: 8 }, // Ramp-up: 0 → 8 users
    { duration: "2m", target: 8 }, // Stay: 8 concurrent users (wallet creation is slower)
    { duration: "2m", target: 15 }, // Peak: 8 → 15 users
    { duration: "2m", target: 15 }, // Sustain: 15 concurrent users
    { duration: "1m", target: 0 }, // Ramp-down
  ],
  thresholds: {
    http_req_duration: ["p(95)<3000", "p(50)<2000"], // Wallet creation takes longer
    http_req_failed: ["rate<0.05"],
    checks: ["rate>0.94"],
  },
};

let availableUsers = [];

export function setup() {
  console.log("📊 AVERAGE LOAD TEST: Wallet Creation API");
  console.log("=========================================");
  console.log("Duration: 8 minutes total");
  console.log("Load Pattern: 8 → 15 → 0 concurrent users");

  initializeStorage();

  // Load REAL users who have access tokens from data/users.json
  availableUsers = getUsersByStatus("signin_complete");

  if (availableUsers.length === 0) {
    console.log("❌ No users with access tokens available!");
    console.log("   Run signin load test first:");
    console.log(
      "   k6 run tests-scripts/average-load-testing/02-signin-load.js"
    );
    throw new Error("No authenticated users available for wallet testing");
  }

  console.log(
    `📋 Found ${availableUsers.length} authenticated users for wallet testing`
  );
  console.log("🎯 Testing wallet creation under sustained load...");

  return { users: availableUsers };
}

export default function (data) {
  // Randomly select a user with valid access token
  const randomIndex = Math.floor(Math.random() * data.users.length);
  const user = data.users[randomIndex];

  if (!user || !user.accessToken) {
    console.log("❌ No authenticated user available");
    return;
  }

  const response = makePostRequest(
    "/create-wallet",
    {
      label: `Load Test Wallet ${Date.now()}`,
      connectionImageUrl: "https://picsum.photos/200",
    },
    user.accessToken
  );

  const success = check(response, {
    "avg_load_wallet: status 201": (r) => r.status === 201,
    "avg_load_wallet: has wallet id": (r) => parseResponse(r)?.data?.id,
    "avg_load_wallet: has tenantId": (r) => parseResponse(r)?.data?.tenantId,
    "avg_load_wallet: response < 3s": (r) => r.timings.duration < 3000,
    "avg_load_wallet: response < 2s": (r) => r.timings.duration < 2000,
  });

  if (success) {
    const walletData = parseResponse(response);

    // Update user with wallet info for DID testing
    updateUserInStorage(user.username, {
      walletId: walletData.data.id,
      tenantId: walletData.data.tenantId,
      step: "wallet_complete",
      lastWalletCreation: new Date().toISOString(),
    });
  }

  // Simulate realistic wallet creation behavior
  // Wallet creation is less frequent and more deliberate
  sleep(Math.random() * 5 + 2); // Sleep 2-7 seconds
}

export function teardown(data) {
  console.log("\n📊 AVERAGE LOAD TEST RESULTS - WALLET CREATION");
  console.log("==============================================");

  const stats = getStorageStats();
  console.log(
    `✅ Wallet Operations Completed: Multiple creations for ${data.users.length} users`
  );
  console.log(`👛 Users with Wallets: ${stats.walletComplete}`);
  console.log(`📈 Average Load Performance: Check detailed metrics above`);

  console.log("\n💡 Wallet Performance Analysis:");
  console.log("• p(50) should be under 2s (median wallet creation time)");
  console.log("• p(95) should be under 3s (95% of wallet creations)");
  console.log("• Error rate should be under 5%");
  console.log("• Resource-intensive operations under sustained load measured");

  console.log("\n🚀 Next Steps:");
  console.log(`• ${stats.walletComplete} users ready for DID creation testing`);
  console.log(
    "• Run: k6 run tests-scripts/average-load-testing/04-did-create-load.js"
  );
}
