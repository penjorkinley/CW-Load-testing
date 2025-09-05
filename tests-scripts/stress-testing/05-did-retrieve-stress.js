// tests-scripts/stress-testing/05-did-retrieve-stress.js
// STRESS TEST: DID Retrieval API - Maximum throughput stress test

import { check, sleep } from "k6";
import { makeGetRequest, parseResponse } from "../../utils/http-helpers.js";
import {
  getStorageStats,
  getUsersByStatus,
  initializeStorage,
  updateUserInStorage,
} from "../../utils/json-storage.js";

export const options = {
  stages: [
    { duration: "1m", target: 100 }, // Fast ramp-up: 0 → 100 users
    { duration: "3m", target: 100 }, // Stress level 1: 100 concurrent retrievals
    { duration: "2m", target: 200 }, // Ramp to high throughput: 200 users
    { duration: "4m", target: 200 }, // High throughput stress
    { duration: "2m", target: 300 }, // Peak stress: 300 concurrent retrievals
    { duration: "3m", target: 300 }, // Maximum throughput stress
    { duration: "2m", target: 400 }, // Extreme stress: 400 users
    { duration: "2m", target: 400 }, // Extreme throughput test
    { duration: "2m", target: 100 }, // Recovery: back to manageable load
    { duration: "1m", target: 0 }, // Shutdown
  ],
  // DID retrieval stress thresholds - read operations should be fast
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(50)<800"], // Retrieval should stay fast
    http_req_failed: ["rate<0.10"], // Allow up to 10% failures under extreme stress
    checks: ["rate>0.85"], // 85% success rate minimum
  },
};

let availableUsers = [];

export function setup() {
  console.log("🔥 STRESS TEST: DID Retrieval API");
  console.log("=================================");
  console.log("🎯 GOAL: Test maximum throughput and read operation limits");
  console.log("⚠️  WARNING: EXTREME throughput test - highest concurrent load");
  console.log("");
  console.log("📊 MAXIMUM THROUGHPUT PATTERN:");
  console.log("• Phase 1: 100 concurrent retrievals (3 min)");
  console.log("• Phase 2: 200 concurrent retrievals (4 min) ← High throughput");
  console.log("• Phase 3: 300 concurrent retrievals (3 min) ← Peak throughput");
  console.log("• Phase 4: 400 concurrent retrievals (2 min) ← EXTREME stress");
  console.log("• Phase 5: Recovery testing (3 min)");
  console.log("• Total Duration: 22 minutes");

  initializeStorage();

  // Load users with DIDs from DID creation stress test
  availableUsers = getUsersByStatus("did_create_complete");

  if (availableUsers.length === 0) {
    console.log(
      "❌ No users with DIDs available for retrieval stress testing!"
    );
    console.log("   Run DID creation stress test first:");
    console.log(
      "   k6 run tests-scripts/stress-testing/04-did-create-stress.js"
    );
    throw new Error(
      "No users with DIDs available for retrieval stress testing"
    );
  }

  console.log(`📋 Found ${availableUsers.length} users with DIDs`);
  console.log("🚀 Beginning MAXIMUM throughput DID retrieval stress test...");
  console.log("📈 This test will push read operations to absolute limits");

  return { users: availableUsers };
}

export default function (data) {
  // Select user with DID
  const randomIndex = Math.floor(Math.random() * data.users.length);
  const user = data.users[randomIndex];

  if (!user || !user.accessToken || !user.did) {
    console.log("❌ No user with DID available for retrieval stress");
    return;
  }

  const response = makeGetRequest("/did", user.accessToken);

  const success = check(response, {
    "stress_did_retrieve: status 200": (r) => r.status === 200,
    "stress_did_retrieve: has hashTenantID": (r) =>
      parseResponse(r)?.data?.hashTenantID,
    "stress_did_retrieve: matches created did": (r) => {
      const retrievedDid = parseResponse(r)?.data?.did;
      return retrievedDid === user.did;
    },
    "stress_did_retrieve: response under 2s": (r) => r.timings.duration < 2000,
    "stress_did_retrieve: response under 800ms": (r) =>
      r.timings.duration < 800,
    "stress_did_retrieve: no connection errors": (r) =>
      r.status !== 502 && r.status !== 504,
  });

  // Monitor throughput stress indicators
  if (response.timings.duration > 1200) {
    console.log(
      `⚠️  Throughput degradation: ${response.timings.duration.toFixed(
        0
      )}ms (VU: ${__VU})`
    );
  }

  if (response.status === 502) {
    console.log(`🔥 Bad gateway - backend overwhelmed (VU: ${__VU})`);
  }

  if (response.status === 504) {
    console.log(`🔥 Gateway timeout - extreme load (VU: ${__VU})`);
  }

  if (response.status === 429) {
    console.log(`🚦 Rate limiting under extreme throughput (VU: ${__VU})`);
  }

  if (response.status === 503) {
    console.log(
      `🔥 Service unavailable - throughput limit reached (VU: ${__VU})`
    );
  }

  if (success) {
    const didRetrievalData = parseResponse(response);

    // Mark user as fully stress tested and ready for Phase 2
    updateUserInStorage(user.username, {
      hashTenantID: didRetrievalData.data.hashTenantID,
      step: "stress_complete",
      phase2Ready: true,
      lastDIDRetrieval: new Date().toISOString(),
      stressTest: true,
      allStressTestsComplete: true,
    });
  }

  // Minimal sleep for maximum throughput pressure
  sleep(Math.random() * 0.5 + 0.1); // Very short: 0.1-0.6 seconds
}

export function teardown(data) {
  console.log("\n🔥 STRESS TEST RESULTS - DID RETRIEVAL API");
  console.log("==========================================");

  const stats = getStorageStats();
  console.log(`📊 MAXIMUM THROUGHPUT PERFORMANCE:`);
  console.log(`• Peak concurrent retrievals: 400`);
  console.log(`• Extreme stress duration: 2 minutes`);
  console.log(`• Total stress test duration: 22 minutes`);
  console.log(`• Users completing all stress tests: ${stats.phase2Ready}`);
}
