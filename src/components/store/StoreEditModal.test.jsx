import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import StoreEditModal from "./StoreEditModal";

describe("StoreEditModal component", () => {
  const mockStore = {
    id: "STR-BLR-001",
    store_name: "Blinkit Whitefield",
    region: "SOUTH",
    channel: "BLINKIT",
    entity: "BCPL",
    state: "Karnataka",
    city: "Bengaluru",
    is_active: true,
  };

  const defaultProps = {
    isVisible: true,
    onClose: jest.fn(),
    onSubmit: jest.fn((e) => e.preventDefault()),
    store: mockStore,
    name: "Blinkit Whitefield",
    setName: jest.fn(),
    region: "SOUTH",
    setRegion: jest.fn(),
    entity: "BCPL",
    setEntity: jest.fn(),
    channel: "BLINKIT",
    setChannel: jest.fn(),
    projectCode: "PRJ-01",
    setProjectCode: jest.fn(),
    state: "Karnataka",
    setState: jest.fn(),
    city: "Bengaluru",
    setCity: jest.fn(),
    address: "123 Main Rd",
    setAddress: jest.fn(),
    zipCode: "560066",
    setZipCode: jest.fn(),
    lat: "12.97",
    setLat: jest.fn(),
    long: "77.59",
    setLong: jest.fn(),
    assignedManagerId: "1",
    setAssignedManagerId: jest.fn(),
    pocName: "John Doe",
    setPocName: jest.fn(),
    pocPhone: "9876543210",
    setPocPhone: jest.fn(),
    isActive: true,
    setIsActive: jest.fn(),
    deliveryManagers: [{ id: 1, full_name: "Vendor Alpha" }],
    isLoading: false,
  };

  test("renders Store ID as permanently immutable and read-only", () => {
    render(<StoreEditModal {...defaultProps} />);

    const idInput = screen.getByDisplayValue("STR-BLR-001");
    expect(idInput).toBeDisabled();
    expect(idInput).toHaveAttribute("readOnly");
  });

  test("renders 6 distinct sections with canonical inputs", () => {
    render(<StoreEditModal {...defaultProps} />);

    expect(screen.getByText(/A\. Store Identity/i)).toBeInTheDocument();
    expect(screen.getByText(/B\. Business Classification/i)).toBeInTheDocument();
    expect(screen.getByText(/C\. Location Details/i)).toBeInTheDocument();
    expect(screen.getByText(/D\. Vendor Assignment/i)).toBeInTheDocument();
    expect(screen.getByText(/E\. Store Point of Contact/i)).toBeInTheDocument();
    expect(screen.getByText(/F\. Operational Status/i)).toBeInTheDocument();
  });

  test("submits form on Save Changes click", () => {
    render(<StoreEditModal {...defaultProps} />);

    const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveBtn);
    expect(defaultProps.onSubmit).toHaveBeenCalled();
  });
});
