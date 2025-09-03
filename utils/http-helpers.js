// utils/http-helpers.js
// HTTP request utilities

import http from "k6/http";

const BASE_URL = "https://dev.bhutanndi.com/cloud-wallet/v1";
const BEARER_TOKEN = "";

// Create headers for requests
function createHeaders(accessToken = null) {
  return {
    "Content-Type": "application/json",
    Accept: "*/*",
    Authorization: `Bearer ${accessToken || BEARER_TOKEN}`,
  };
}

// Make POST request
export function makePostRequest(endpoint, payload, accessToken = null) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = createHeaders(accessToken);

  console.log(`🔄 POST ${endpoint}`);

  const response = http.post(url, JSON.stringify(payload), {
    headers,
    timeout: "30s",
  });

  console.log(
    `   Status: ${response.status} | Duration: ${response.timings.duration}ms`
  );

  if (response.status >= 400) {
    console.log(`   Error: ${response.body.substring(0, 100)}...`);
  }

  return response;
}

// Make GET request
export function makeGetRequest(endpoint, accessToken = null) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = createHeaders(accessToken);

  console.log(`🔄 GET ${endpoint}`);

  const response = http.get(url, {
    headers,
    timeout: "30s",
  });

  console.log(
    `   Status: ${response.status} | Duration: ${response.timings.duration}ms`
  );

  if (response.status >= 400) {
    console.log(`   Error: ${response.body.substring(0, 100)}...`);
  }

  return response;
}

// Parse JSON response safely
export function parseResponse(response) {
  try {
    const data = JSON.parse(response.body);
    return data;
  } catch (error) {
    console.error(`❌ Failed to parse JSON response: ${error}`);
    console.error(`Response body: ${response.body.substring(0, 200)}...`);
    return null;
  }
}

// Check if response is successful
export function isSuccess(response, expectedStatus = 200) {
  return response.status === expectedStatus;
}
