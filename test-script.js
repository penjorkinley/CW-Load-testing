import { sleep } from "k6";
import http from "k6/http";

export const options = {
  vus: 10, // number of virtual users
  duration: "10s", // how long to run the test
};

export default function () {
  http.get("https://test.k6.io"); // target website
  sleep(1); // wait for 1 second between requests
}
