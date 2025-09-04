// utils/validators.js
// Response validation functions

import { check } from "k6";
import { parseResponse } from "./http-helpers.js";

// Validate signup response
export function validateSignup(response) {
  return check(response, {
    "signup: status 201": (r) => r.status === 201,
    "signup: has userId": (r) => parseResponse(r)?.data?.userId,
    "signup: correct message": (r) =>
      parseResponse(r)?.message === "User signUp successfully.",
  });
}

// Validate signin response
export function validateSignin(response) {
  return check(response, {
    "signin: status 201": (r) => r.status === 201,
    "signin: has access_token": (r) => parseResponse(r)?.data?.access_token,
    "signin: has refresh_token": (r) => parseResponse(r)?.data?.refresh_token,
    "signin: correct message": (r) =>
      parseResponse(r)?.message === "User signin successfully.",
  });
}

// Validate wallet creation response
export function validateWallet(response) {
  return check(response, {
    "wallet: status 201": (r) => r.status === 201,
    "wallet: has tenantId": (r) => parseResponse(r)?.data?.tenantId,
    "wallet: has walletId": (r) => parseResponse(r)?.data?.id,
    "wallet: correct message": (r) =>
      parseResponse(r)?.message === "wallet created successfully",
  });
}

// Validate DID creation response
export function validateDIDCreation(response) {
  return check(response, {
    "did_create: status 201": (r) => r.status === 201,
    "did_create: has did": (r) => parseResponse(r)?.data?.did,
    "did_create: has didDocument": (r) => parseResponse(r)?.data?.didDocument,
    "did_create: valid format": (r) => {
      const did = parseResponse(r)?.data?.did;
      return did && did.startsWith("did:key:");
    },
  });
}

// Validate DID retrieval response
export function validateDIDRetrieval(response) {
  return check(response, {
    "did_retrieve: status 200": (r) => r.status === 200,
    "did_retrieve: has hashTenantID": (r) =>
      parseResponse(r)?.data?.hashTenantID,
    "did_retrieve: has did": (r) => parseResponse(r)?.data?.did,
    "did_retrieve: correct message": (r) =>
      parseResponse(r)?.message === "Successfully fetched wallet DID",
  });
}

// Generic response validation
export function validateResponse(
  response,
  expectedStatus,
  requiredFields = []
) {
  const checks = {
    [`status: ${expectedStatus}`]: (r) => r.status === expectedStatus,
    "valid JSON": (r) => parseResponse(r) !== null,
  };

  // Add field checks
  requiredFields.forEach((field) => {
    checks[`has ${field}`] = (r) => {
      const data = parseResponse(r);
      return data && data.data && data.data[field];
    };
  });

  return check(response, checks);
}
