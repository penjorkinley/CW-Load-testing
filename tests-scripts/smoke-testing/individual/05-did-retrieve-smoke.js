// tests-scripts/smoke-testing/individual/05-did-retrieve-load.js
// LOAD TEST: DID Retrieval API only (uses existing users with DIDs)

import { check, sleep } from "k6";
import { makeGetRequest, parseResponse } from "../../../utils/http-helpers.js";
import {
  getStorageStats,
  getUsersByStatus,
  initializeStorage,
  updateUserInStorage,
} from "../../../utils/json-storage.js";

export const options = {
  stages: [
    { duration: "1m", target: 15 }, // Ramp up to 15 users
    { duration: "2m", target: 40 }, // Scale to 40 users (retrieval is faster)
    { duration: "1m", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"], // Retrieval should be fast
    http_req_failed: ["rate<0.05"],
    checks: ["rate>0.95"],
  },
};

let availableUsers = [];

export function setup() {
  console.log("🔥 LOAD TEST: DID Retrieval API");
  console.log("===============================");

  initializeStorage();

  // Get users who have DIDs created
  availableUsers = getUsersByStatus("did_create_complete");

  if (availableUsers.length === 0) {
    console.log("❌ No users with DIDs available!");
    console.log("   Run DID creation load test first or smoke tests:");
    console.log(
      "   k6 run tests-scripts/smoke-testing/individual/04-did-create-load.js"
    );
    throw new Error("No users with DIDs available for retrieval testing");
  }

  console.log(
    `📋 Found ${availableUsers.length} users with DIDs for retrieval testing`
  );
  return { users: availableUsers };
}

export default function (data) {
  // Get random user with DID
  const randomIndex = Math.floor(Math.random() * data.users.length);
  const user = data.users[randomIndex];

  if (!user || !user.accessToken || !user.did) {
    console.log("❌ No user with DID available");
    return;
  }

  const response = makeGetRequest("/did", user.accessToken);

  const success = check(response, {
    "did_retrieve_load: status 200": (r) => r.status === 200,
    "did_retrieve_load: has hashTenantID": (r) =>
      parseResponse(r)?.data?.hashTenantID,
    "did_retrieve_load: matches created did": (r) => {
      const retrievedDid = parseResponse(r)?.data?.did;
      return retrievedDid === user.did;
    },
    "did_retrieve_load: under 2s": (r) => r.timings.duration < 2000,
  });

  if (success) {
    const didRetrievalData = parseResponse(response);

    // Update user with hashTenantID - now ready for Phase 2!
    updateUserInStorage(user.username, {
      hashTenantID: didRetrievalData.data.hashTenantID,
      step: "phase1_complete",
      phase2Ready: true,
    });
  }

  sleep(0.3); // Faster for retrieval operations
}

export function teardown(data) {
  console.log("\n📊 DID RETRIEVAL LOAD TEST RESULTS");
  console.log("==================================");

  const stats = getStorageStats();
  console.log(`✅ DIDs Retrieved: ${stats.totalUsers} requests processed`);
  console.log(`🎯 Phase 2 Ready Users: ${stats.phase2Ready}`);
  console.log(`🚀 Users ready for Phase 2 testing: ${stats.phase2Ready}`);
}
