import { check } from "k6";
import http from "k6/http";

export class ApiHelper {
  constructor(baseUrl, bearerToken) {
    this.baseUrl = baseUrl;
    this.bearerToken = bearerToken;
    this.defaultHeaders = {
      accept: "*/*",
      "Content-Type": "application/json",
    };
  }

  // User Signup
  signup(userData) {
    const url = `${this.baseUrl}/cloud-wallet/v1/user/username/signup`;
    const headers = {
      ...this.defaultHeaders,
      Authorization: `Bearer ${this.bearerToken}`,
    };

    const payload = {
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      password: userData.password,
    };

    console.log(`Attempting signup for: ${userData.username}`);
    const response = http.post(url, JSON.stringify(payload), {
      headers,
      timeout: "30s",
    });

    const success = check(response, {
      "signup status is 201": (r) => r.status === 201,
      "signup has message": (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.message === "User signUp successfully.";
        } catch {
          return false;
        }
      },
      "signup has userId": (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.data && data.data.userId;
        } catch {
          return false;
        }
      },
    });

    return { response, success };
  }

  // User Signin
  signin(userData) {
    const url = `${this.baseUrl}/cloud-wallet/v1/user/username/signin`;
    const headers = {
      ...this.defaultHeaders,
      Authorization: `Bearer ${this.bearerToken}`,
    };

    const payload = {
      username: userData.username,
      password: userData.password,
    };

    console.log(`Attempting signin for: ${userData.username}`);
    const response = http.post(url, JSON.stringify(payload), {
      headers,
      timeout: "30s",
    });

    const success = check(response, {
      "signin status is 201": (r) => r.status === 201,
      "signin has access_token": (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.data && data.data.access_token;
        } catch {
          return false;
        }
      },
      "signin has refresh_token": (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.data && data.data.refresh_token;
        } catch {
          return false;
        }
      },
    });

    return { response, success };
  }

  // Create Wallet
  createWallet(accessToken) {
    const url = `${this.baseUrl}/cloud-wallet/v1/create-wallet`;
    const headers = {
      ...this.defaultHeaders,
      Authorization: `Bearer ${accessToken}`,
    };

    const payload = {
      label: "Credential Wallet",
      connectionImageUrl: "https://picsum.photos/200",
    };

    console.log("Attempting wallet creation...");
    const response = http.post(url, JSON.stringify(payload), {
      headers,
      timeout: "30s",
    });

    const success = check(response, {
      "wallet status is 201": (r) => r.status === 201,
      "wallet has id": (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.data && data.data.id;
        } catch {
          return false;
        }
      },
      "wallet has tenantId": (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.data && data.data.tenantId;
        } catch {
          return false;
        }
      },
    });

    return { response, success };
  }

  // Create DID
  createDid(accessToken) {
    const url = `${this.baseUrl}/cloud-wallet/v1/did`;
    const headers = {
      ...this.defaultHeaders,
      Authorization: `Bearer ${accessToken}`,
    };

    console.log("Attempting DID creation...");
    const response = http.post(url, "", { headers, timeout: "30s" });

    const success = check(response, {
      "DID creation status is 201": (r) => r.status === 201,
      "DID has did": (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.data && data.data.did;
        } catch {
          return false;
        }
      },
      "DID has didDocument": (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.data && data.data.didDocument;
        } catch {
          return false;
        }
      },
    });

    return { response, success };
  }

  // Get DID
  getDid(accessToken) {
    const url = `${this.baseUrl}/cloud-wallet/v1/did`;
    const headers = {
      ...this.defaultHeaders,
      Authorization: `Bearer ${accessToken}`,
    };

    console.log("Attempting DID retrieval...");
    const response = http.get(url, { headers, timeout: "30s" });

    const success = check(response, {
      "DID get status is 200": (r) => r.status === 200,
      "DID get has hashTenantID": (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.data && data.data.hashTenantID;
        } catch {
          return false;
        }
      },
      "DID get has did": (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.data && data.data.did;
        } catch {
          return false;
        }
      },
    });

    return { response, success };
  }
}
