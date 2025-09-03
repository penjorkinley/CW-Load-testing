// Basic test configurations for different test types

export const TEST_CONFIGS = {
  // Single user validation
  SINGLE_USER: {
    vus: 1,
    duration: "30s",
    thresholds: {
      http_req_duration: ["p(95)<5000"],
      http_req_failed: ["rate<0.1"],
      checks: ["rate>0.9"],
    },
  },

  // Basic load test (5 users)
  BASIC_LOAD: {
    vus: 5,
    duration: "1m",
    thresholds: {
      http_req_duration: ["p(95)<3000"],
      http_req_failed: ["rate<0.05"],
      checks: ["rate>0.95"],
    },
  },

  // Small load test (20 users)
  SMALL_LOAD: {
    vus: 20,
    duration: "2m",
    thresholds: {
      http_req_duration: ["p(95)<4000"],
      http_req_failed: ["rate<0.05"],
      checks: ["rate>0.9"],
    },
  },

  // Medium load test (50 users)
  MEDIUM_LOAD: {
    stages: [
      { duration: "30s", target: 10 },
      { duration: "1m", target: 50 },
      { duration: "2m", target: 50 },
      { duration: "30s", target: 0 },
    ],
    thresholds: {
      http_req_duration: ["p(95)<5000"],
      http_req_failed: ["rate<0.1"],
      checks: ["rate>0.8"],
    },
  },
};

// API endpoint constants
export const API_ENDPOINTS = {
  SIGNUP: "/cloud-wallet/v1/user/username/signup",
  SIGNIN: "/cloud-wallet/v1/user/username/signin",
  WALLET: "/cloud-wallet/v1/create-wallet",
  DID_CREATE: "/cloud-wallet/v1/did",
  DID_GET: "/cloud-wallet/v1/did",
};

// Common headers
export const HEADERS = {
  DEFAULT: {
    accept: "*/*",
    "Content-Type": "application/json",
  },
};
