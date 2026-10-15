import api from "./apiClient";
var mockInject;
jest.mock("../config", () => ({ API_BASE_URL: "https://api.example.test" }));
jest.mock("axios", () => ({ __esModule: true, default: { create: (config) => ({ defaults: config, interceptors: { request: { use: (inject) => { mockInject = inject; } } } }) } }));
test("shared client reads current token on every request", () => {
  expect(api.defaults.baseURL).toBe("https://api.example.test");
  localStorage.clear(); localStorage.setItem("auth_token", "one"); expect(mockInject({ headers: {} }).headers.Authorization).toBe("Bearer one");
  localStorage.setItem("auth_token", "two"); expect(mockInject({ headers: {} }).headers.Authorization).toBe("Bearer two");
  localStorage.clear(); expect(mockInject({ headers: {} }).headers.Authorization).toBeUndefined();
});
