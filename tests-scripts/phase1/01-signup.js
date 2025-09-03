// test-scripts/phase1/01-signup.js
import { check, sleep } from "k6";
import { generateUsername } from "../../utils/data-manager.js";
import { makePostRequest, parseResponse } from "../../utils/http-helpers.js";

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  const username = generateUsername();

  const payload = {
    username: username,
    firstName: "Test",
    lastName: "User",
    password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
  };

  console.log(`Testing signup for: ${username}`);

  const response = makePostRequest("/user/username/signup", payload);

  const success = check(response, {
    "signup status is 201": (r) => r.status === 201,
    "has userId": (r) => {
      const body = parseResponse(r);
      return body && body.data && body.data.userId;
    },
  });

  if (success) {
    const responseData = parseResponse(response);
    console.log("✅ Signup successful!");
  } else {
    console.log("❌ Signup failed!");
  }

  sleep(1);
}
