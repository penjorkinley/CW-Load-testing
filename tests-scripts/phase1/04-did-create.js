// test-scripts/phase1/04-did-create.js
import { check, sleep } from "k6";
import { generateUsername } from "../../utils/data-manager.js";
import { makePostRequest, parseResponse } from "../../utils/http-helpers.js";

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  const username = generateUsername();
  let userData = { username };

  // Step 1: Complete user setup (signup + signin + wallet)
  console.log(`Setting up user: ${username}`);

  // Signup
  const signupResponse = makePostRequest("/user/username/signup", {
    username: username,
    firstName: "Test",
    lastName: "User",
    password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
  });

  if (signupResponse.status !== 201) {
    console.log("❌ Setup failed at signup");
    return;
  }

  userData.userId = parseResponse(signupResponse).data.userId;
  sleep(1);

  // Signin
  const signinResponse = makePostRequest("/user/username/signin", {
    username: username,
    password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
  });

  userData.accessToken = parseResponse(signinResponse).data.access_token;
  sleep(1);

  // Create Wallet
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

  console.log("✅ Prerequisites complete");
  sleep(1);

  // Step 2: Create DID
  console.log("Creating DID...");
  const didResponse = makePostRequest("/did", {}, userData.accessToken);

  const success = check(didResponse, {
    "DID status is 201": (r) => r.status === 201,
    "has DID": (r) => {
      const body = parseResponse(r);
      return body && body.data && body.data.did;
    },
  });

  if (success) {
    const didData = parseResponse(didResponse);
    userData.did = didData.data.did;
    console.log("✅ DID created successfully!");
  } else {
    console.log("❌ DID creation failed!");
  }

  sleep(1);
}
