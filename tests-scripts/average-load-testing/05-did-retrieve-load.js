// tests-scripts/average-load-testing/05-did-retrieve-load.js
// AVERAGE LOAD TEST: DID Retrieval API Performance Testing

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
    { duration: "1m", target: 25 }, // Fast ramp-up: 0 → 25 users
    { duration: "2m", target: 25 }, // Stay: 25 concurrent users (retrieval is fast)
    { duration: "1m", target: 50 }, // Peak: 25 → 50 users
    { duration: "3m", target: 50 }, // Sustain: 50 concurrent users
    { duration: "1m", target: 0 }, // Ramp-down
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000", "p(50)<500"], // Very fast retrieval
    http_req_failed: ["rate<0.02"], // Very low failure rate
    checks: ["rate>0.98"], // Very high success rate
  },
};

let availableUsers = [];

export function setup() {
  console.log("📊 AVERAGE LOAD TEST: DID Retrieval API");
  console.log("=======================================");
  console.log("Simulating high-frequency DID retrieval patterns...");
  console.log("Duration: 8 minutes total");
  console.log("Load Pattern: 25 → 50 → 0 concurrent users");
  console.log(
    "🚀 Retrieval operations are fast - higher concurrent load applied"
  );

  initializeStorage();

  // Load REAL users who have DIDs from data/users.json
  availableUsers = getUsersByStatus("did_create_complete");

  if (availableUsers.length === 0) {
    console.log("❌ No users with DIDs available!");
    console.log("   Run DID creation load test first:");
    console.log(
      "   k6 run tests-scripts/average-load-testing/04-did-create-load.js"
    );
    throw new Error("No users with DIDs available for retrieval testing");
  }

  console.log(
    `📋 Found ${availableUsers.length} users with DIDs for retrieval testing`
  );
  console.log(
    "🎯 Testing DID retrieval performance under high sustained load..."
  );

  return { users: availableUsers };
}

export default function (data) {
  // Randomly select a user with DID
  const randomIndex = Math.floor(Math.random() * data.users.length);
  const user = data.users[randomIndex];

  if (!user || !user.accessToken || !user.did) {
    console.log("❌ No user with DID available");
    return;
  }

  const response = makeGetRequest("/did", user.accessToken);

  const success = check(response, {
    "avg_load_did_retrieve: status 200": (r) => r.status === 200,
    "avg_load_did_retrieve: has hashTenantID": (r) =>
      parseResponse(r)?.data?.hashTenantID,
    "avg_load_did_retrieve: matches created did": (r) => {
      const retrievedDid = parseResponse(r)?.data?.did;
      return retrievedDid === user.did;
    },
    "avg_load_did_retrieve: response < 1s": (r) => r.timings.duration < 1000,
    "avg_load_did_retrieve: response < 500ms": (r) => r.timings.duration < 500,
  });

  if (success) {
    const didRetrievalData = parseResponse(response);

    // Update user with hashTenantID - now ready for Phase 2!
    updateUserInStorage(user.username, {
      hashTenantID: didRetrievalData.data.hashTenantID,
      step: "phase1_complete",
      phase2Ready: true,
      lastDIDRetrieval: new Date().toISOString(),
    });
  }

  // Simulate realistic retrieval behavior
  // Retrieval is frequent and fast - shorter pauses
  sleep(Math.random() * 1 + 0.3); // Sleep 0.3-1.3 seconds
}

export function teardown(data) {
  console.log("\n📊 AVERAGE LOAD TEST RESULTS - DID RETRIEVAL");
  console.log("============================================");

  const stats = getStorageStats();
  console.log(
    `✅ DID Retrieval Operations: Multiple retrievals for ${data.users.length} users`
  );
  console.log(`🎯 Phase 2 Ready Users: ${stats.phase2Ready}`);
  console.log(`📈 Average Load Performance: Check detailed metrics above`);

  console.log("\n💡 DID Retrieval Performance Analysis:");
  console.log("• p(50) should be under 500ms (median retrieval time)");
  console.log("• p(95) should be under 1s (95% of retrievals)");
  console.log("• Error rate should be under 2%");
  console.log(
    "• Fastest operation - highest concurrent load applied successfully"
  );

  console.log("\n🎉 PHASE 1 LOAD TESTING COMPLETE!");
  console.log("=================================");
  console.log(`✅ All 5 APIs tested under realistic sustained load`);
  console.log(`🚀 ${stats.phase2Ready} users ready for Phase 2 testing`);
  console.log(`📁 Complete user data available in data/users.json`);

  console.log("\n📊 SUMMARY:");
  console.log("• Signup API: Account creation load tested");
  console.log("• Signin API: Authentication load tested");
  console.log("• Wallet API: Resource-intensive operations tested");
  console.log("• DID Create API: Most complex operations tested");
  console.log("• DID Retrieve API: High-frequency operations tested");

  console.log("\n🔍 NEXT STEPS:");
  console.log("• Analyze performance metrics for each API");
  console.log("• Identify bottlenecks and optimization opportunities");
  console.log("• Compare results against performance benchmarks");
  console.log("• Plan capacity for production deployment");
}
