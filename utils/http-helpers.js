// utils/http-helpers.js
// HTTP request utilities

import http from "k6/http";

const BASE_URL = "https://dev.bhutanndi.com/cloud-wallet/v1";
const BEARER_TOKEN =
  "eyJraWQiOiJzd3hhdGVQK1lmR2liT2ZiTmNjWGpjYkptWnVqNGlrXC80SWh5TW9JdFhLTT0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI3aXZzamg1NTIxYzA0YXZiMTAyZzVibHB2NSIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoibmRpLXNlcnZpY2VcL3JlYWQud3JpdGUiLCJhdXRoX3RpbWUiOjE3NTY4OTA5NjUsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC5hcC1zb3V0aGVhc3QtMS5hbWF6b25hd3MuY29tXC9hcC1zb3V0aGVhc3QtMV9wdFRmQ2VNYnkiLCJleHAiOjE3NTY5NzczNjUsImlhdCI6MTc1Njg5MDk2NSwidmVyc2lvbiI6MiwianRpIjoiZDE0NDQzZmUtMDhhMS00NmZjLTk2YzktMjNmY2IwZWRkYWRmIiwiY2xpZW50X2lkIjoiN2l2c2poNTUyMWMwNGF2YjEwMmc1YmxwdjUifQ.GIG2ncoPgGKrOCyjQ-2dnUdZU9lt6hfZqg8XSOaNQVZA6tjSe7fTiIN4jAb2HIrUtIY0kc-JX1e6VrvPv5oP7ce89OedX-j9kO7Tna3pWu3vqbLr4p47Jn1l2kBS_hBL0rXtd_KdQ5VXX9ohofslx4LfGaXLDwMm7Bx8NCCimiV_KLf_bVGjefOJDdUs8wdMjhhgLqM9qbntrJDz1ccV7alYRYNjHQ4DWEsycb6dnq7CHd4P40upP4QohwxJ_JYlhZWqdq4mO02kphRBE7Wo8lJhY0_V2OzE9L-Y84Bl4LFuoEbIRYiiVNiwhvZxu1i4aLK4O7RQ3IvXEXscNuECfg";

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
