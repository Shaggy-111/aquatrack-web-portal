import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import usePermissionCatalog, { clearPermissionCatalogCache } from "./usePermissionCatalog";

jest.mock("axios", () => ({ __esModule: true, default: { get: jest.fn() } }), { virtual: true });
jest.mock("../config", () => ({ API_BASE_URL: "https://api.example.test" }));

const blinkitPermissions = [
  { permission_id: 410, permission_key: "blinkit_reports.view", display_name: "View Blinkit Report" },
  { permission_id: 411, permission_key: "blinkit_reports.export", display_name: "Export Blinkit Report" },
  { permission_id: 412, permission_key: "blinkit_reports.metadata_manage", display_name: "Manage Blinkit Metadata" },
  { permission_id: 413, permission_key: "blinkit_reports.vendor_rate_export", display_name: "Vendor Rate Export" },
];

function CatalogProbe() {
  const { catalog, groups, loading, error } = usePermissionCatalog();
  return <div>
    <span data-testid="loading">{String(loading)}</span>
    <span data-testid="error">{String(Boolean(error))}</span>
    <span data-testid="keys">{catalog.map((permission) => permission.key).join(",")}</span>
    <span data-testid="groups">{groups.map((group) => group.module).join(",")}</span>
  </div>;
}

describe("usePermissionCatalog pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPermissionCatalogCache();
    localStorage.clear();
    localStorage.setItem("auth_token", "token");
  });

  test("loads every page and normalizes permission_key for Blinkit matching", async () => {
    axios.get.mockImplementation((_url, config) => {
      if (config.params.page === 1) return Promise.resolve({ data: {
        permissions: [{ permission_id: 1, permission_key: "dashboard.view", display_name: "Dashboard" }],
        page: 1,
        page_size: 1,
        total: 5,
        total_pages: 2,
      } });
      return Promise.resolve({ data: {
        permissions: blinkitPermissions,
        page: 2,
        page_size: 4,
        total: 5,
        total_pages: 2,
      } });
    });

    render(<CatalogProbe />);

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(axios.get.mock.calls.map(([, config]) => config.params.page)).toEqual([1, 2]);
    expect(axios.get.mock.calls[0][1].params.page_size).toBe(100);
    expect(screen.getByTestId("keys").textContent).toContain("blinkit_reports.view");
    expect(screen.getByTestId("keys").textContent).toContain("blinkit_reports.export");
    expect(screen.getByTestId("keys").textContent).toContain("blinkit_reports.metadata_manage");
    expect(screen.getByTestId("keys").textContent).toContain("blinkit_reports.vendor_rate_export");
    expect(screen.getByTestId("groups").textContent).toContain("blinkit_reports");
  });

  test("keeps backward compatibility with an unpaginated array response", async () => {
    axios.get.mockResolvedValue({ data: [{ id: 7, key: "orders.view", module: "orders", action: "view" }] });
    render(<CatalogProbe />);
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("keys").textContent).toBe("orders.view");
    expect(screen.getByTestId("error").textContent).toBe("false");
  });
});
