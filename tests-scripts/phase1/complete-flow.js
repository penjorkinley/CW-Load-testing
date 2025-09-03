// test-scripts/05-did-retrieve.js
import { check, sleep } from "k6";
import {
  generateUsername,
  makeGetRequest,
  makePostRequest,
  parseResponse,
  saveUserData,
} from "../utils.js";

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  const username = generateUsername();
  let userData = { username: username };

  console.log("🚀 Starting Complete Phase 1 Flow");
  console.log(`User: ${username}`);

  // Complete setup flow
  console.log("Step 1: User signup...");
  const signupResponse = makePostRequest("/user/username/signup", {
    username: username,
    firstName: "Test",
    lastName: "User",
    password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
  });

  userData.userId = parseResponse(signupResponse).data.userId;
  sleep(1);

  console.log("Step 2: User signin...");
  const signinResponse = makePostRequest("/user/username/signin", {
    username: username,
    password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
  });

  userData.accessToken = parseResponse(signinResponse).data.access_token;
  sleep(1);

  console.log("Step 3: Wallet creation...");
  const walletResponse = makePostRequest(
    "/create-wallet",
    {
      label: "Test Credential Wallet",
      connectionImageUrl: "https://picsum.photos/200",
    },
    userData.accessToken
  );

  const walletData = parseResponse(walletResponse);
  userData.walletId = walletData.data.id;
  userData.tenantId = walletData.data.tenantId;
  sleep(1);

  console.log("Step 4: DID creation...");
  const didCreateResponse = makePostRequest("/did", "", userData.accessToken);
  userData.did = parseResponse(didCreateResponse).data.did;
  sleep(1);

  // Step 5: DID Retrieval (main test)
  console.log("Step 5: DID retrieval...");
  const didGetResponse = makeGetRequest("/did", userData.accessToken);

  const success = check(didGetResponse, {
    "DID retrieval status is 200": (r) => r.status === 200,
    "has hashTenantID": (r) => {
      const body = parseResponse(r);
      return body && body.data && body.data.hashTenantID;
    },
  });

  if (success) {
    const didData = parseResponse(didGetResponse);
    userData.hashTenantID = didData.data.hashTenantID;
    userData.step = "phase1_complete";
    userData.phase2Ready = true;

    console.log("🎉 PHASE 1 COMPLETED SUCCESSFULLY!");
    console.log("📋 Final User Data:");
    console.log(`  Username: ${userData.username}`);
    console.log(`  User ID: ${userData.userId}`);
    console.log(`  Wallet ID: ${userData.walletId}`);
    console.log(`  Tenant ID: ${userData.tenantId}`);
    console.log(`  DID: ${userData.did}`);
    console.log(`  Hash Tenant ID: ${userData.hashTenantID}`);
    console.log("  Access Token: ✅ Available");
    console.log("");
    console.log("✅ User ready for Phase 2!");

    saveUserData(userData);
  } else {
    console.log("❌ Phase 1 failed at DID retrieval!");
  }

  sleep(1);
}
