// utils/http-helpers.js
// HTTP request utilities for k6 testing

import http from "k6/http";

const BASE_URL = __ENV.BASE_URL || "https://dev.bhutanndi.com/cloud-wallet/v1";
const BEARER_TOKEN = __ENV.BEARER_TOKEN || "";

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

  const response = http.post(url, JSON.stringify(payload), {
    headers,
    timeout: "30s",
  });

  return response;
}

// Make GET request
export function makeGetRequest(endpoint, accessToken = null) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = createHeaders(accessToken);

  const response = http.get(url, {
    headers,
    timeout: "30s",
  });

  return response;
}

// Parse JSON response safely
export function parseResponse(response) {
  try {
    const data = JSON.parse(response.body);
    return data;
  } catch (error) {
    console.error(`❌ Failed to parse JSON: ${error}`);
    return null;
  }
}

// Check if response is successful
export function isSuccess(response, expectedStatus = 200) {
  return response.status === expectedStatus;
}
