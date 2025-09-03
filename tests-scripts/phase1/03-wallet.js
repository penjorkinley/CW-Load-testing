// test-scripts/03-wallet.js
import { check, sleep } from "k6";
import { generateUsername, saveUserData } from "../../utils/data-manager.js";
import { makePostRequest, parseResponse } from "../../utils/http-helpers.js";

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  const username = generateUsername();
  let userData = { username: username };

  // Step 1: Signup
  console.log(`Step 1: Creating user ${username}`);
  const signupResponse = makePostRequest("/user/username/signup", {
    username: username,
    firstName: "Test",
    lastName: "User",
    password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
  });

  if (signupResponse.status !== 201) {
    console.log("❌ Signup failed");
    return;
  }

  userData.userId = parseResponse(signupResponse).data.userId;
  sleep(1);

  // Step 2: Signin
  console.log("Step 2: Signing in...");
  const signinResponse = makePostRequest("/user/username/signin", {
    username: username,
    password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
  });

  if (signinResponse.status !== 201) {
    console.log("❌ Signin failed");
    return;
  }

  userData.accessToken = parseResponse(signinResponse).data.access_token;
  console.log("✅ User setup complete");
  sleep(1);

  // Step 3: Create Wallet
  console.log("Step 3: Creating wallet...");
  const walletPayload = {
    label: "Test Credential Wallet",
    connectionImageUrl: "https://picsum.photos/200",
  };

  const walletResponse = makePostRequest(
    "/create-wallet",
    walletPayload,
    userData.accessToken
  );

  const success = check(walletResponse, {
    "wallet status is 201": (r) => r.status === 201,
    "has tenantId": (r) => {
      const body = parseResponse(r);
      return body && body.data && body.data.tenantId;
    },
  });

  if (success) {
    const walletData = parseResponse(walletResponse);
    userData.walletId = walletData.data.id;
    userData.tenantId = walletData.data.tenantId;
    userData.step = "wallet_complete";

    saveUserData(userData);
    console.log("✅ Wallet created successfully!");
  } else {
    console.log("❌ Wallet creation failed!");
  }

  sleep(1);
}
