import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import ChannelAdminPermissionManager from "./ChannelAdminPermissionManager";

const catalog = [
  { id: 1, key: "dashboard.view", module: "dashboard", action: "view" },
  { id: 2, key: "orders.view", module: "orders", action: "view" },
  { id: 3, key: "store.view", module: "store", action: "view" },
  { id: 10, key: "blinkit_reports.view", module: "blinkit_reports", action: "view" },
  { id: 11, key: "blinkit_reports.export", module: "blinkit_reports", action: "export" },
  { id: 12, key: "blinkit_reports.metadata_manage", module: "blinkit_reports", action: "metadata_manage" },
  { id: 13, key: "blinkit_reports.vendor_rate_export", module: "blinkit_reports", action: "vendor_rate_export" },
];

jest.mock("axios", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }), { virtual: true });
jest.mock("../config", () => ({ API_BASE_URL: "https://api.example.test" }));
jest.mock("../hooks/usePermissionCatalog", () => ({
  __esModule: true,
  default: () => ({ catalog, loading: false, error: null }),
}));

describe("ChannelAdminPermissionManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("auth_token", "token");
    let assigned = [1, 2, 3];
    axios.get.mockImplementation(() => Promise.resolve({ data: assigned.map((id) => ({ permission_id: id })) }));
    axios.post.mockImplementation((_url, body) => {
      assigned = body.permission_ids;
      return Promise.resolve({ data: { success: true } });
    });
  });

  test("preserves existing permissions and defaults View plus Export only", async () => {
    render(<ChannelAdminPermissionManager admin={{ id: 42, full_name: "Blinkit Admin", channel: "BLINKIT" }} onClose={jest.fn()} />);
    const view = await screen.findByRole("checkbox", { name: /View Blinkit Report/ });
    const exportPermission = screen.getByRole("checkbox", { name: /Export Blinkit Report/ });
    const metadata = screen.getByRole("checkbox", { name: /Manage Blinkit Metadata/ });
    const vendorRate = screen.getByRole("checkbox", { name: /Vendor Rate Export/ });
    expect(view.checked).toBe(true);
    expect(exportPermission.checked).toBe(true);
    expect(metadata.checked).toBe(false);
    expect(vendorRate.checked).toBe(false);

    fireEvent.click(metadata);
    fireEvent.click(vendorRate);
    fireEvent.click(screen.getByRole("button", { name: "Save Permissions" }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(axios.post.mock.calls[0][0]).toBe("https://api.example.test/employees/42/permissions/bulk");
    expect(axios.post.mock.calls[0][1]).toEqual({ permission_ids: [1, 2, 3, 10, 11, 12, 13] });
    expect((await screen.findByRole("status")).textContent).toContain("updated successfully");
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  test("does not expose or call Blinkit permission APIs for non-BLINKIT admins", () => {
    const { container } = render(<ChannelAdminPermissionManager admin={{ id: 50, channel: "ZEPTO" }} onClose={jest.fn()} />);
    expect(container.firstChild).toBeNull();
    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });
});

