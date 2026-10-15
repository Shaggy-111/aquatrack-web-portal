import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import StoreCompliance from "./StoreCompliance";
jest.mock("./StoreComplianceMonthly", () => () => <div>Monthly default content</div>);
jest.mock("../StoreComplianceDashboard", () => () => <div>Legacy Week 1 repository</div>);
test("Monthly default isolates weekly content; legacy remains reachable inside same screen", async () => {
  render(<StoreCompliance />); expect(screen.getByText("Monthly default content")).toBeInTheDocument(); expect(screen.queryByText("Legacy Week 1 repository")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Legacy Weekly History" })); expect(await screen.findByText("Legacy Week 1 repository")).toBeInTheDocument(); expect(screen.queryByText("Monthly default content")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Monthly Compliance" })); expect(screen.getByText("Monthly default content")).toBeInTheDocument();
});
