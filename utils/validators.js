// utils/validators.js
// Response validation functions

import { check } from "k6";
import { parseResponse } from "./http-helpers.js";

// Validate signup response
export function validateSignup(response) {
  return check(response, {
    "signup status is 201": (r) => r.status === 201,
    "signup has userId": (r) => {
      const data = parseResponse(r);
      return data && data.data && data.data.userId;
    },
    "signup message correct": (r) => {
      const data = parseResponse(r);
      return data && data.message === "User signUp successfully.";
    },
  });
}

// Validate signin response
export function validateSignin(response) {
  return check(response, {
    "signin status is 201": (r) => r.status === 201,
    "signin has access_token": (r) => {
      const data = parseResponse(r);
      return data && data.data && data.data.access_token;
    },
    "signin has refresh_token": (r) => {
      const data = parseResponse(r);
      return data && data.data && data.data.refresh_token;
    },
    "signin message correct": (r) => {
      const data = parseResponse(r);
      return data && data.message === "User signin successfully.";
    },
  });
}

// Validate wallet creation response
export function validateWallet(response) {
  return check(response, {
    "wallet status is 201": (r) => r.status === 201,
    "wallet has tenantId": (r) => {
      const data = parseResponse(r);
      return data && data.data && data.data.tenantId;
    },
    "wallet has walletId": (r) => {
      const data = parseResponse(r);
      return data && data.data && data.data.id;
    },
    "wallet message correct": (r) => {
      const data = parseResponse(r);
      return data && data.message === "wallet created successfully";
    },
  });
}

// Validate DID creation response
export function validateDIDCreation(response) {
  return check(response, {
    "DID creation status is 201": (r) => r.status === 201,
    "DID has did": (r) => {
      const data = parseResponse(r);
      return data && data.data && data.data.did;
    },
    "DID has didDocument": (r) => {
      const data = parseResponse(r);
      return data && data.data && data.data.didDocument;
    },
    "DID starts with did:key:": (r) => {
      const data = parseResponse(r);
      return (
        data &&
        data.data &&
        data.data.did &&
        data.data.did.startsWith("did:key:")
      );
    },
  });
}

// Validate DID retrieval response
export function validateDIDRetrieval(response) {
  return check(response, {
    "DID retrieval status is 200": (r) => r.status === 200,
    "DID has hashTenantID": (r) => {
      const data = parseResponse(r);
      return data && data.data && data.data.hashTenantID;
    },
    "DID has did": (r) => {
      const data = parseResponse(r);
      return data && data.data && data.data.did;
    },
    "DID retrieval message correct": (r) => {
      const data = parseResponse(r);
      return data && data.message === "Successfully fetched wallet DID";
    },
  });
}
