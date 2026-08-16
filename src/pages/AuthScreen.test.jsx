import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import AuthScreen from "./AuthScreen";

const mockNavigate = jest.fn();

jest.mock("axios", () => ({ __esModule: true, default: { post: jest.fn() } }), { virtual: true });
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }), { virtual: true });
jest.mock("../config", () => ({ API_BASE_URL: "https://api.example.test" }));
jest.mock("../hooks/usePermissions", () => ({ refreshPermissions: jest.fn() }));

describe("AuthScreen password field", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test("password is hidden by default and toggles visibility", () => {
    render(<AuthScreen />);
    const password = screen.getByPlaceholderText("Password");

    expect(password.getAttribute("type")).toBe("password");
    expect(password.getAttribute("autocomplete")).toBe("current-password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password.getAttribute("type")).toBe("text");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password.getAttribute("type")).toBe("password");
  });

  test("Enter submits through the existing login handler", async () => {
    axios.post.mockResolvedValue({ data: { access_token: "token", user_role: "employee" } });
    render(<AuthScreen />);

    fireEvent.change(screen.getByPlaceholderText("Email Address"), { target: { value: "employee@example.com" } });
    const password = screen.getByPlaceholderText("Password");
    fireEvent.change(password, { target: { value: "secret" } });
    fireEvent.submit(password.closest("form"));

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(expect.stringContaining("/auth/login"), {
      username: "employee@example.com",
      password: "secret",
    }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/dashboard/employee"));
  });
});
