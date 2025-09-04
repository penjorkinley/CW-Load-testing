// tests-scripts/smoke-testing/individual/03-wallet-load.js
// LOAD TEST: Wallet Creation API only (uses existing users with tokens)

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
    { duration: "1m", target: 10 }, // Ramp up to 10 users
    { duration: "3m", target: 25 }, // Scale to 25 users
    { duration: "1m", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<3000"], // Wallet creation takes longer
    http_req_failed: ["rate<0.05"],
    checks: ["rate>0.95"],
  },
};

let availableUsers = [];

export function setup() {
  console.log("🔥 LOAD TEST: Wallet Creation API");
  console.log("=================================");

  initializeStorage();

  // Get users who have access tokens
  availableUsers = getUsersByStatus("signin_complete");

  if (availableUsers.length === 0) {
    console.log("❌ No users with access tokens available!");
    console.log("   Run signin load test first or smoke tests:");
    console.log(
      "   k6 run tests-scripts/smoke-testing/individual/02-signin-load.js"
    );
    throw new Error("No authenticated users available for wallet testing");
  }

  console.log(
    `📋 Found ${availableUsers.length} authenticated users for wallet testing`
  );
  return { users: availableUsers };
}

export default function (data) {
  // Get random authenticated user
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
    "wallet_load: status 201": (r) => r.status === 201,
    "wallet_load: has wallet id": (r) => parseResponse(r)?.data?.id,
    "wallet_load: has tenantId": (r) => parseResponse(r)?.data?.tenantId,
    "wallet_load: under 3s": (r) => r.timings.duration < 3000,
  });

  if (success) {
    const walletData = parseResponse(response);

    // Update user with wallet info for DID testing
    updateUserInStorage(user.username, {
      walletId: walletData.data.id,
      tenantId: walletData.data.tenantId,
      step: "wallet_complete",
    });
  }

  sleep(0.5);
}

export function teardown(data) {
  console.log("\n📊 WALLET CREATION LOAD TEST RESULTS");
  console.log("====================================");

  const stats = getStorageStats();
  console.log(`✅ Wallets Created: ${stats.walletComplete} users`);
  console.log(`👛 Users ready for DID testing: ${stats.walletComplete}`);
}
