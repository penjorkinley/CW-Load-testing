// test-scripts/02-signin.js
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

  // Step 1: Signup first
  console.log(`Step 1: Creating user ${username}`);
  const signupPayload = {
    username: username,
    firstName: "Test",
    lastName: "User",
    password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
  };

  const signupResponse = makePostRequest(
    "/user/username/signup",
    signupPayload
  );

  if (signupResponse.status !== 201) {
    console.log("❌ Signup failed, cannot test signin");
    return;
  }

  const signupData = parseResponse(signupResponse);
  userData.userId = signupData.data.userId;
  console.log("✅ Signup successful");

  sleep(1);

  // Step 2: Test signin
  console.log("Step 2: Testing signin...");
  const signinPayload = {
    username: username,
    password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
  };

  const signinResponse = makePostRequest(
    "/user/username/signin",
    signinPayload
  );

  const success = check(signinResponse, {
    "signin status is 201": (r) => r.status === 201,
    "has access token": (r) => {
      const body = parseResponse(r);
      return body && body.data && body.data.access_token;
    },
  });

  if (success) {
    const signinData = parseResponse(signinResponse);
    userData.accessToken = signinData.data.access_token;
    userData.refreshToken = signinData.data.refresh_token;
    userData.step = "signin_complete";

    saveUserData(userData);
    console.log("✅ Signin successful!");
  } else {
    console.log("❌ Signin failed!");
  }

  sleep(1);
}
