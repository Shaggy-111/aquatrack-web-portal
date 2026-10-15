import React from "react";
import { render, screen } from "@testing-library/react";
import BackendSidebarItems, { sidebarItemTab } from "./BackendSidebarItems";

let mockItems = [];
let mockGroups = [];

jest.mock("../hooks/useSidebar", () => ({
  __esModule: true,
  default: () => ({ items: mockItems, groups: mockGroups }),
}));

const renderSidebar = () => render(
  <BackendSidebarItems
    currentTab="dashboard"
    onSelectTab={jest.fn()}
    renderGroup={(group) => <h2>{group}</h2>}
    renderItem={({ label, name }) => <button data-tab={name}>{label}</button>}
  />
);

describe("backend-driven Blinkit Report sidebar item", () => {
  beforeEach(() => {
    mockItems = [];
    mockGroups = [];
  });

  test("recognizes the exact blinkitReports backend key", () => {
    const item = { key: "blinkitReports", module: "Blinkit Report", permission: "blinkit_reports.view" };
    mockItems = [item];
    mockGroups = [{ group: "Reports", items: [item] }];
    renderSidebar();
    expect(sidebarItemTab(item)).toBe("blinkitReports");
    expect(screen.getByRole("heading", { name: "Reports" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Blinkit Report" }).dataset.tab).toBe("blinkitReports");
  });

  test("does not invent Blinkit Report when the backend response omits it", () => {
    const item = { key: "deliveryReports", module: "Delivery Reports", permission: "reports.view" };
    mockItems = [item];
    mockGroups = [{ group: "Reports", items: [item] }];
    renderSidebar();
    expect(screen.getByRole("button", { name: "Delivery Reports" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Blinkit Report" })).toBeNull();
  });
});
