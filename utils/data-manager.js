import { open } from "k6/experimental/fs";

export class DataManager {
  constructor() {
    this.usersFile = "data/users.json";
    this.resultsFile = "data/test-results.json";
  }

  // Read users from JSON file
  async readUsers() {
    try {
      const file = await open(this.usersFile);
      const content = await file.read();
      await file.close();
      return JSON.parse(content);
    } catch (error) {
      console.log("No existing users file, starting with empty array");
      return [];
    }
  }

  // Save user data to JSON file
  async saveUser(userData) {
    try {
      let users = await this.readUsers();
      users.push(userData);

      const file = await open(this.usersFile, "w");
      await file.write(JSON.stringify(users, null, 2));
      await file.close();

      console.log(`User data saved: ${userData.username}`);
    } catch (error) {
      console.error("Failed to save user data:", error);
    }
  }

  // Update user data
  async updateUser(username, updateData) {
    try {
      let users = await this.readUsers();
      const userIndex = users.findIndex((user) => user.username === username);

      if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...updateData };

        const file = await open(this.usersFile, "w");
        await file.write(JSON.stringify(users, null, 2));
        await file.close();

        console.log(`User updated: ${username}`);
        return users[userIndex];
      }
    } catch (error) {
      console.error("Failed to update user data:", error);
    }
    return null;
  }

  // Generate unique username
  generateUsername(vuId = 1, iteration = 1) {
    const timestamp = Date.now();
    return `testuser_${vuId}_${iteration}_${timestamp}`;
  }

  // Create initial user object
  createUserObject(username) {
    return {
      username: username,
      firstName: "Test",
      lastName: "User",
      password: "U2FsdGVkX1+enAWzb6tUKE5BOlcO+F6rvzKPwV5HYaM=",
      userId: null,
      accessToken: null,
      refreshToken: null,
      walletId: null,
      tenantId: null,
      did: null,
      hashTenantID: null,
      createdAt: new Date().toISOString(),
    };
  }
}
