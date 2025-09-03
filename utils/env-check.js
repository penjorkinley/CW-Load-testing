import http from "k6/http";

const BASE_URL = __ENV.BASE_URL || "https://dev.bhutanndi.com";
const BEARER_TOKEN = __ENV.BEARER_TOKEN || "your_token_here";

export let options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  console.log("=== Environment Check ===");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Bearer Token: ${BEARER_TOKEN ? "✓ Set" : "✗ Not set"}`);

  // Test basic connectivity
  console.log("\n--- Testing API Connectivity ---");
  const response = http.get(`${BASE_URL}`, {
    headers: { Accept: "application/json" },
    timeout: "10s",
  });

  console.log(`API response status: ${response.status}`);

  if (response.status < 500) {
    console.log("✓ API is accessible");
  } else {
    console.log("✗ API connectivity issue");
    console.log(`Response: ${response.body}`);
  }

  // Verify token format (basic check)
  if (
    BEARER_TOKEN &&
    BEARER_TOKEN !== "your_token_here" &&
    BEARER_TOKEN.length > 10
  ) {
    console.log("✓ Bearer token appears to be configured");
  } else {
    console.log("✗ Bearer token needs to be configured");
  }

  console.log("\n=== Environment Check Complete ===");
}
