import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import StoreReimbursement from "./StoreReimbursement";
import service from "../services/storeReimbursementService";

jest.mock("../hooks/usePermissions", () => () => ({ hasPermission: () => true }));
jest.mock("../services/storeReimbursementService", () => ({ __esModule: true, default: Object.fromEntries(["getSummary", "listReimbursements", "getStoreSelector", "getStoreSelectorFilters", "createReimbursement"].map((name) => [name, jest.fn()])) }));

const stores = [{ id: "S1", store_name: "North Store", region: "NORTH", channel: "BLINKIT", state: "Delhi", city: "Delhi" }, { id: "S2", store_name: "South Store", region: "SOUTH", channel: "ZEPTO", state: "Karnataka", city: "Bengaluru" }];
const metadata = { regions: ["NORTH", "SOUTH"], channels: ["BLINKIT", "ZEPTO"], states: ["Delhi", "Karnataka"], cities: ["Delhi", "Bengaluru"] };
const result = (items = stores, has_more = false, page = 1) => ({ items, has_more, page, page_size: 20 });
const claims = { items: [{ id: 1, reimbursement_number: "CR-1", store_name: "North Store", store_id: "S1", status: "PENDING", total_amount: 100, total_paid: 0, outstanding_amount: 100 }], total: 2, total_pages: 2 };
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
beforeEach(() => {
  jest.resetAllMocks(); localStorage.clear(); localStorage.setItem("user_role", "superadmin");
  service.getSummary.mockResolvedValue({ total_claims: 2, total_reimbursement_amount: 100, total_outstanding_amount: 100 });
  service.listReimbursements.mockResolvedValue(claims);
  service.getStoreSelector.mockResolvedValue(result()); service.getStoreSelectorFilters.mockResolvedValue(metadata);
  service.createReimbursement.mockResolvedValue({ id: 3, reimbursement_number: "CR-3" });
});
async function openFilter() { fireEvent.click(screen.getByLabelText("Store", { exact: true })); await screen.findByRole("button", { name: "North Store (S1)", exact: true }); await waitFor(() => expect(screen.getByLabelText("Store Region")).toBeEnabled()); }
async function createForm() { fireEvent.click(screen.getByRole("button", { name: /Create Claim/ })); fireEvent.click(screen.getByLabelText("Store *", { exact: true })); await screen.findByRole("button", { name: "North Store (S1)", exact: true }); }
const change = (name, value) => fireEvent.change(screen.getByLabelText(name, { exact: true }), { target: { value } });

test("initial requests are independent and selector is bounded to 20 without all-Store preload", async () => {
  const pending = deferred(); service.getStoreSelector.mockReturnValue(pending.promise); service.getStoreSelectorFilters.mockReturnValue(pending.promise);
  render(<StoreReimbursement />); expect(screen.getByRole("heading", { name: "Store Reimbursement" })).toBeInTheDocument(); await screen.findByText("CR-1"); expect(screen.getByText("Total Claims")).toBeInTheDocument();
  expect(service.getStoreSelector).toHaveBeenCalledTimes(1); expect(service.getStoreSelector).toHaveBeenCalledWith({ region: "", channel: "", state: "", city: "", search: "", page: 1, page_size: 20 }); expect(service.getStoreSelectorFilters).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByLabelText("Store", { exact: true })); expect(screen.getByText("Loading Stores…")).toBeInTheDocument(); expect(screen.getByText("Loading Store filters…")).toBeInTheDocument();
});
test("Store results render while summary and metadata are pending", async () => {
  const pending = deferred(); service.getSummary.mockReturnValue(pending.promise); service.getStoreSelectorFilters.mockReturnValue(pending.promise); render(<StoreReimbursement />);
  fireEvent.click(screen.getByLabelText("Store", { exact: true })); await screen.findByRole("button", { name: "North Store (S1)" }); expect(screen.getByText("Loading reimbursement summary…")).toBeInTheDocument(); expect(await screen.findByText("CR-1")).toBeInTheDocument();
});
test("Store metadata loads while claims/results remain pending", async () => {
  const pending = deferred(); service.listReimbursements.mockReturnValue(pending.promise); service.getStoreSelector.mockReturnValue(pending.promise); render(<StoreReimbursement />); fireEvent.click(screen.getByLabelText("Store", { exact: true }));
  await waitFor(() => expect(screen.getByLabelText("Store Region")).toBeEnabled()); expect(within(screen.getByLabelText("Store Region")).getByText("NORTH")).toBeInTheDocument(); expect(screen.getByText("Loading claims...")).toBeInTheDocument(); expect(screen.getByText("Total Claims")).toBeInTheDocument();
});
test("Region, Channel, State and City requests cascade with exact parameters", async () => {
  render(<StoreReimbursement />); await openFilter();
  for (const [name, key, value] of [["Region", "region", "NORTH"], ["Channel", "channel", "BLINKIT"], ["State", "state", "Delhi"], ["City", "city", "Delhi"]]) {
    await waitFor(() => expect(screen.getByLabelText(`Store ${name}`)).toBeEnabled()); change(`Store ${name}`, value);
    await waitFor(() => expect(service.getStoreSelector).toHaveBeenLastCalledWith(expect.objectContaining({ [key]: value, page: 1, page_size: 20 })));
    if (name !== "City") await waitFor(() => expect(service.getStoreSelectorFilters).toHaveBeenLastCalledWith(expect.objectContaining({ [key]: value })));
  }
  expect(service.getStoreSelectorFilters).toHaveBeenCalledTimes(4); expect(service.getSummary).toHaveBeenCalledTimes(1); expect(service.listReimbursements).toHaveBeenCalledTimes(1);
});
test("upstream changes clear all dependent selected values", async () => {
  render(<StoreReimbursement />); await openFilter();
  for (const [name, value] of [["Region", "NORTH"], ["Channel", "BLINKIT"], ["State", "Delhi"], ["City", "Delhi"]]) { await waitFor(() => expect(screen.getByLabelText(`Store ${name}`)).toBeEnabled()); change(`Store ${name}`, value); }
  change("Store State", "Karnataka"); expect(screen.getByLabelText("Store City")).toHaveValue("");
  await waitFor(() => expect(screen.getByLabelText("Store Channel")).toBeEnabled()); change("Store Channel", "ZEPTO"); expect(screen.getByLabelText("Store State")).toHaveValue(""); expect(screen.getByLabelText("Store City")).toHaveValue("");
  await waitFor(() => expect(screen.getByLabelText("Store Region")).toBeEnabled()); change("Store Region", "SOUTH"); expect(screen.getByLabelText("Store Channel")).toHaveValue(""); expect(screen.getByLabelText("Store State")).toHaveValue(""); expect(screen.getByLabelText("Store City")).toHaveValue("");
});
test("Store name/ID search waits 350ms and sends only the final search", async () => {
  render(<StoreReimbursement />); await openFilter(); const count = service.getStoreSelector.mock.calls.length;
  jest.useFakeTimers();
  try {
    change("Store Search Store", "Nor"); act(() => jest.advanceTimersByTime(200)); change("Store Search Store", "North"); act(() => jest.advanceTimersByTime(349)); expect(service.getStoreSelector).toHaveBeenCalledTimes(count);
    await act(async () => { jest.advanceTimersByTime(1); }); expect(service.getStoreSelector).toHaveBeenLastCalledWith(expect.objectContaining({ search: "North", page: 1 })); expect(service.getStoreSelector).toHaveBeenCalledTimes(count + 1);
  } finally { jest.useRealTimers(); }
});
test("stale Store results cannot overwrite newer filter results", async () => {
  render(<StoreReimbursement />); await openFilter(); const old = deferred(); service.getStoreSelector.mockReturnValueOnce(old.promise).mockResolvedValueOnce(result([stores[1]]));
  change("Store Region", "NORTH"); await waitFor(() => expect(screen.getByLabelText("Store Region")).toBeEnabled()); change("Store Region", "SOUTH"); await screen.findByRole("button", { name: "South Store (S2)" });
  await act(async () => old.resolve(result([stores[0]]))); expect(screen.queryByRole("button", { name: "North Store (S1)" })).not.toBeInTheDocument();
});
test("stale metadata cannot replace the latest region metadata", async () => {
  render(<StoreReimbursement />); await openFilter(); const old = deferred(); service.getStoreSelectorFilters.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ ...metadata, channels: ["ZEPTO"] });
  change("Store Region", "NORTH"); change("Store Region", "SOUTH"); await waitFor(() => expect(screen.getByLabelText("Store Channel")).toBeEnabled());
  await act(async () => old.resolve({ ...metadata, channels: ["BLINKIT"] })); expect(within(screen.getByLabelText("Store Channel")).queryByText("BLINKIT")).not.toBeInTheDocument();
});
test("Load More appends and deduplicates IDs, and a filter resets to page one", async () => {
  service.getStoreSelector.mockResolvedValueOnce(result([stores[0]], true)).mockResolvedValueOnce(result(stores, false, 2)).mockResolvedValueOnce(result([stores[1]]));
  render(<StoreReimbursement />); await openFilter(); fireEvent.click(screen.getByText("Load More Stores")); await screen.findByRole("button", { name: "South Store (S2)" });
  expect(screen.getAllByRole("button", { name: "North Store (S1)" })).toHaveLength(1); expect(service.getStoreSelector).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })); expect(screen.queryByText("Load More Stores")).not.toBeInTheDocument();
  change("Store City", "Bengaluru"); await waitFor(() => expect(service.getStoreSelector).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, city: "Bengaluru" }))); expect(screen.queryByRole("button", { name: "North Store (S1)" })).not.toBeInTheDocument();
});
test("search after Load More resets to page one", async () => {
  service.getStoreSelector.mockResolvedValueOnce(result([stores[0]], true)).mockResolvedValueOnce(result(stores, false, 2)); render(<StoreReimbursement />); await openFilter(); fireEvent.click(screen.getByText("Load More Stores")); await screen.findByRole("button", { name: "South Store (S2)" }); change("Store Search Store", "S2"); await waitFor(() => expect(service.getStoreSelector).toHaveBeenLastCalledWith(expect.objectContaining({ search: "S2", page: 1 })));
});
test("selection persists when closed; create reuses selector data and submits exact selected ID and explicit POC", async () => {
  render(<StoreReimbursement />); await createForm(); fireEvent.click(screen.getByRole("button", { name: "South Store (S2)" })); expect(screen.getByLabelText("Store *")).toHaveTextContent("South Store (S2)"); expect(screen.queryByLabelText("Store * selector")).not.toBeInTheDocument();
  change("Purchase Date *", "2026-10-16"); change("Total Amount (₹) *", "1500"); change("Reason *", "Local water"); change("POC ID (Optional)", "37"); fireEvent.click(screen.getByRole("button", { name: "Submit Claim" }));
  await waitFor(() => expect(service.createReimbursement).toHaveBeenCalledWith(expect.objectContaining({ store_id: "S2", poc_id: 37 })));
  expect(service.getStoreSelector).toHaveBeenCalledTimes(1); expect(service.getStoreSelectorFilters).toHaveBeenCalledTimes(1);
});
test("first Store is never selected automatically", async () => {
  render(<StoreReimbursement />); await createForm(); expect(screen.getByLabelText("Store *")).toHaveTextContent("Choose Store"); fireEvent.submit(screen.getByRole("button", { name: "Submit Claim" }).closest("form")); expect(service.createReimbursement).not.toHaveBeenCalled(); expect(screen.getByText("Choose a Store before submitting the claim.")).toBeInTheDocument();
});
test("changing Store clears POC instead of carrying another Store's POC", async () => {
  render(<StoreReimbursement />); await createForm(); fireEvent.click(screen.getByRole("button", { name: "North Store (S1)" })); change("POC ID (Optional)", "37"); fireEvent.click(screen.getByLabelText("Store *")); fireEvent.click(screen.getByRole("button", { name: "South Store (S2)" })); expect(screen.getByLabelText("POC ID (Optional)")).toHaveValue(null);
});
test("claim pagination does not refetch summary, metadata or Store results", async () => {
  render(<StoreReimbursement />); await screen.findByText("CR-1"); fireEvent.click(screen.getByRole("button", { name: "Next" })); await waitFor(() => expect(service.listReimbursements).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  expect(service.getSummary).toHaveBeenCalledTimes(1); expect(service.getStoreSelector).toHaveBeenCalledTimes(1); expect(service.getStoreSelectorFilters).toHaveBeenCalledTimes(1);
});
test("claim-only filters do not refetch unrelated selector data", async () => {
  render(<StoreReimbursement />); await screen.findByText("CR-1"); fireEvent.change(screen.getByPlaceholderText(/Search Claim/), { target: { value: "CR-1" } }); await waitFor(() => expect(service.listReimbursements).toHaveBeenLastCalledWith(expect.objectContaining({ search: "CR-1" })));
  expect(service.getStoreSelector).toHaveBeenCalledTimes(1); expect(service.getStoreSelectorFilters).toHaveBeenCalledTimes(1);
});
test("metadata failure stays local and retries without blocking results or claims", async () => {
  service.getStoreSelectorFilters.mockRejectedValueOnce(new Error("metadata failed")).mockResolvedValue(metadata); render(<StoreReimbursement />); await openFilter(); expect(screen.getByText("Unable to load Store filters.")).toBeInTheDocument(); expect(screen.getByText("CR-1")).toBeInTheDocument(); fireEvent.click(screen.getByText("Retry Store filters")); await waitFor(() => expect(screen.queryByText("Unable to load Store filters.")).not.toBeInTheDocument());
});
test("result errors stay local with retry; empty results are explicit", async () => {
  service.getStoreSelector.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(result([])); render(<StoreReimbursement />); fireEvent.click(screen.getByLabelText("Store", { exact: true })); await screen.findByText("Unable to load Stores. Please retry."); expect(screen.getByText("Total Claims")).toBeInTheDocument(); expect(screen.getByText("CR-1")).toBeInTheDocument(); fireEvent.click(screen.getByText("Retry Stores")); expect(await screen.findByText("No stores found")).toBeInTheDocument();
});
test("summary failure and claim failure have independent retries", async () => {
  service.getSummary.mockRejectedValueOnce(new Error("summary failed")).mockResolvedValue({ total_claims: 2 }); service.listReimbursements.mockRejectedValueOnce(new Error("claims failed")).mockResolvedValue(claims);
  render(<StoreReimbursement />); await screen.findByText("Failed to load reimbursement summary."); await screen.findByText("Failed to load reimbursement claims."); const summaryCount = service.getSummary.mock.calls.length; fireEvent.click(screen.getByText("Retry claims")); await screen.findByText("CR-1"); expect(service.getSummary).toHaveBeenCalledTimes(summaryCount); fireEvent.click(screen.getByText("Retry summary")); await screen.findByText("Total Claims");
});
test("Employee shows only backend-returned Stores with no all-Store fallback", async () => {
  localStorage.setItem("user_role", "employee"); service.getStoreSelector.mockResolvedValue(result([stores[0]])); render(<StoreReimbursement />); await openFilter(); expect(screen.queryByRole("button", { name: "South Store (S2)" })).not.toBeInTheDocument(); expect(service.getStoreSelector).toHaveBeenCalledTimes(1); expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
});
