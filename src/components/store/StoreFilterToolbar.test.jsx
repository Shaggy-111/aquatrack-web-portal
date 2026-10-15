import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import StoreFilterToolbar from "./StoreFilterToolbar";

describe("StoreFilterToolbar component", () => {
  const defaultProps = {
    searchTerm: "",
    onSearchChange: jest.fn(),
    regionFilter: "ALL",
    onRegionChange: jest.fn(),
    channelFilter: "ALL",
    onChannelChange: jest.fn(),
    entityFilter: "ALL",
    onEntityChange: jest.fn(),
    stateFilter: "ALL",
    onStateChange: jest.fn(),
    cityFilter: "ALL",
    onCityChange: jest.fn(),
    vendorFilter: "ALL",
    onVendorChange: jest.fn(),
    statusFilter: "ALL",
    onStatusChange: jest.fn(),
    vendors: [
      { id: 1, full_name: "Vendor Alpha" },
      { id: 2, full_name: "Vendor Beta" },
    ],
    totalCount: 50,
    filteredCount: 25,
    onClearAll: jest.fn(),
  };

  test("renders all required filter controls with canonical options", () => {
    render(<StoreFilterToolbar {...defaultProps} />);

    expect(screen.getByPlaceholderText(/Search by ID, name, project code/i)).toBeInTheDocument();
    expect(screen.getByText("All Regions")).toBeInTheDocument();
    expect(screen.getByText("All Channels")).toBeInTheDocument();
    expect(screen.getByText("All Entities")).toBeInTheDocument();
    expect(screen.getByText("All States")).toBeInTheDocument();
    expect(screen.getByText("Select State First")).toBeInTheDocument();
    expect(screen.getByText("All Vendors")).toBeInTheDocument();
    expect(screen.getByText("All Status")).toBeInTheDocument();
  });

  test("cascades state selection to enable city selection", () => {
    const { rerender } = render(<StoreFilterToolbar {...defaultProps} stateFilter="ALL" />);
    const disabledCityOption = screen.getByText("Select State First");
    expect(disabledCityOption.closest("select")).toBeDisabled();

    // Select Karnataka
    rerender(<StoreFilterToolbar {...defaultProps} stateFilter="Karnataka" />);
    expect(screen.getByText("All Cities").closest("select")).not.toBeDisabled();
    expect(screen.getByText("Bengaluru")).toBeInTheDocument();
  });

  test("calculates active filter count and triggers onClearAll", () => {
    render(
      <StoreFilterToolbar
        {...defaultProps}
        regionFilter="NORTH"
        channelFilter="BLINKIT"
        statusFilter="ACTIVE"
      />
    );

    expect(screen.getByText(/3 active/i)).toBeInTheDocument();
    const clearBtn = screen.getByRole("button", { name: /Clear All/i });
    fireEvent.click(clearBtn);
    expect(defaultProps.onClearAll).toHaveBeenCalledTimes(1);
  });
});
