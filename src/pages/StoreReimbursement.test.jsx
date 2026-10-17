import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

let mockAxiosGet = jest.fn();
let mockAxiosPost = jest.fn();
let mockAxiosPatch = jest.fn();

jest.mock(
  "axios",
  () => ({
    __esModule: true,
    default: {
      get: (...args) => mockAxiosGet(...args),
      post: (...args) => mockAxiosPost(...args),
      patch: (...args) => mockAxiosPatch(...args),
      delete: jest.fn(),
    },
  }),
  { virtual: true }
);

jest.mock("../config", () => ({ API_BASE_URL: "https://api.example.test" }));

const mockSummaryData = {
  total_claims: 5,
  pending_count: 2,
  approved_count: 1,
  partially_paid_count: 1,
  paid_count: 1,
  total_reimbursement_amount: 15000,
  total_paid_amount: 7000,
  total_outstanding_amount: 8000,
};

const mockListResponseData = {
  items: [
    {
      id: 101,
      reimbursement_number: "CR-2026-0001",
      store_id: "STR-001",
      store_name: "Blinkit Koramangala",
      poc_name: "Rahul Sharma",
      poc_phone: "9876543210",
      purchase_date: "2026-01-15",
      total_amount: 5000,
      total_paid: 2000,
      outstanding_amount: 3000,
      status: "PARTIALLY_PAID",
      created_by_id: 1,
      reason: "Purchased packaging bubble wrap",
    },
    {
      id: 102,
      reimbursement_number: "CR-2026-0002",
      store_id: "STR-002",
      store_name: "Zepto Indiranagar",
      poc_name: "Priya Patel",
      poc_phone: "9876543211",
      purchase_date: "2026-01-16",
      total_amount: 3000,
      total_paid: 0,
      outstanding_amount: 3000,
      status: "PENDING",
      created_by_id: 2,
      reason: "Emergency water cans",
    },
    {
      id: 103,
      reimbursement_number: "CR-2026-0003",
      store_id: "STR-003",
      store_name: "Blinkit HSR",
      poc_name: "Amit Kumar",
      poc_phone: "9876543212",
      purchase_date: "2026-01-17",
      total_amount: 4000,
      total_paid: 0,
      outstanding_amount: 4000,
      status: "APPROVED",
      created_by_id: 1,
      reason: "Local tanker supply",
    },
  ],
  total: 3,
  page: 1,
  page_size: 20,
  total_pages: 1,
};

const mockDetailData = {
  id: 101,
  reimbursement_number: "CR-2026-0001",
  store_id: "STR-001",
  store_name: "Blinkit Koramangala",
  store_channel: "BLINKIT",
  store_region: "SOUTH",
  poc_name: "Rahul Sharma",
  poc_phone: "9876543210",
  purchase_date: "2026-01-15",
  total_amount: 5000,
  total_paid: 2000,
  outstanding_amount: 3000,
  status: "PARTIALLY_PAID",
  reason: "Purchased packaging bubble wrap",
  notes: "Urgent restocking",
  payments: [
    {
      id: 201,
      amount: 2000,
      payment_date: "2026-01-18T10:00:00Z",
      payment_mode: "UPI",
      transaction_reference: "UPI123456789",
      remarks: "First tranche",
      paid_by_name: "Finance Admin",
      paid_to_name: "Rahul Sharma",
    },
  ],
  attachments: [
    {
      id: 301,
      attachment_type: "INVOICE",
      file_name: "bill_jan15.pdf",
      file_url: "https://example.com/files/bill_jan15.pdf",
      voided_at: null,
    },
  ],
};

jest.mock("../services/storeReimbursementService", () => {
  return {
    __esModule: true,
    default: {
      getSummary: jest.fn(),
      listReimbursements: jest.fn(),
      getDetail: jest.fn(),
      createReimbursement: jest.fn(),
      updateReimbursement: jest.fn(),
      approveReimbursement: jest.fn(),
      rejectReimbursement: jest.fn(),
      cancelReimbursement: jest.fn(),
      recordPayment: jest.fn(),
      uploadAttachment: jest.fn(),
      voidAttachment: jest.fn(),
      exportReimbursements: jest.fn(),
      getStoreSelector: jest.fn(),
      getStoreSelectorFilters: jest.fn(),
    },
  };
});

let mockHasPermission = () => true;

jest.mock("../hooks/usePermissions", () => ({
  __esModule: true,
  default: () => ({
    hasPermission: (...args) => mockHasPermission(...args),
    permissionsLoading: false,
  }),
}));

import StoreReimbursement from "./StoreReimbursement";
import storeReimbursementService from "../services/storeReimbursementService";

describe("StoreReimbursement comprehensive verification", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("user_role", "superadmin");
    localStorage.setItem("user_id", "1");
    mockHasPermission = () => true;

    mockAxiosGet.mockResolvedValue({
      data: [
        { id: "STR-001", store_name: "Blinkit Koramangala" },
        { id: "STR-002", store_name: "Zepto Indiranagar" },
      ],
    });

    storeReimbursementService.getSummary.mockResolvedValue(mockSummaryData);
    storeReimbursementService.listReimbursements.mockResolvedValue(mockListResponseData);
    storeReimbursementService.getDetail.mockResolvedValue(mockDetailData);
    storeReimbursementService.getStoreSelector.mockResolvedValue({ items: [
      { id: "STR-001", store_name: "Blinkit Koramangala" },
      { id: "STR-002", store_name: "Zepto Indiranagar" },
    ], page: 1, page_size: 20, has_more: false });
    storeReimbursementService.getStoreSelectorFilters.mockResolvedValue({ regions: [], channels: [], states: [], cities: [] });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("1. Renders summary metric cards, filter toolbar, and table rows correctly", async () => {
    render(<StoreReimbursement />);

    expect(screen.getByText(/Store Reimbursement/i)).toBeInTheDocument();
    expect(await screen.findByText("CR-2026-0001")).toBeInTheDocument();
    expect(screen.getByText("CR-2026-0002")).toBeInTheDocument();
    expect(screen.getByText("CR-2026-0003")).toBeInTheDocument();

    // Summary metrics
    expect(screen.getByText("Total Claims")).toBeInTheDocument();
    expect(screen.getByText("Total Claimed")).toBeInTheDocument();
    expect(screen.getByText("Paid in Full")).toBeInTheDocument();
    expect(screen.getByText("Outstanding Balance")).toBeInTheDocument();
  });

  test("2. SuperAdmin creates reimbursement with proof attachment", async () => {
    storeReimbursementService.createReimbursement.mockResolvedValue({
      id: 104,
      reimbursement_number: "CR-2026-0004",
      store_id: "STR-001",
    });
    storeReimbursementService.uploadAttachment.mockResolvedValue({ id: 401 });

    render(<StoreReimbursement />);

    const createBtn = screen.getByRole("button", { name: /\+ Create Claim/i });
    fireEvent.click(createBtn);

    expect(screen.getByText("Submit Reimbursement Claim")).toBeInTheDocument();

    // Wait for store options to load
    fireEvent.click(screen.getByLabelText(/Store \*/i));
    await screen.findByRole("button", { name: /Blinkit Koramangala \(STR-001\)/i });

    // Fill form
    fireEvent.click(screen.getByRole("button", { name: /Blinkit Koramangala \(STR-001\)/i }));
    fireEvent.change(screen.getByLabelText(/Purchase Date \*/i), { target: { value: "2026-01-20" } });
    fireEvent.change(screen.getByLabelText(/Total Amount \(₹\) \*/i), { target: { value: "1250" } });
    fireEvent.change(screen.getByLabelText(/Reason \*/i), {
      target: { value: "Emergency diesel for generator" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Internal reference notes.../i), {
      target: { value: "Approved by cluster manager" },
    });

    // Upload dummy file
    const file = new File(["dummy content"], "invoice.pdf", { type: "application/pdf" });
    const fileInput = screen.getByLabelText(/Initial Bill \/ Invoice/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Submit
    const submitBtn = screen.getByRole("button", { name: /Submit Claim/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(storeReimbursementService.createReimbursement).toHaveBeenCalledWith({
        store_id: "STR-001",
        purchase_date: "2026-01-20",
        total_amount: 1250,
        reason: "Emergency diesel for generator",
        poc_id: undefined,
        instructed_by_user_id: undefined,
        notes: "Approved by cluster manager",
      });
    });

    await waitFor(() => {
      expect(storeReimbursementService.uploadAttachment).toHaveBeenCalledWith(
        104,
        expect.any(File),
        "INVOICE"
      );
    });

    expect(await screen.findByText(/Claim CR-2026-0004 created successfully/i)).toBeInTheDocument();
  });

  test("3. Edit pending claim submits PATCH payload", async () => {
    storeReimbursementService.updateReimbursement.mockResolvedValue({
      id: 102,
      reimbursement_number: "CR-2026-0002",
      total_amount: 3500,
    });

    render(<StoreReimbursement />);

    await screen.findByText("CR-2026-0002");

    // The second row (CR-2026-0002) is PENDING so has Edit button
    const editBtns = screen.getAllByRole("button", { name: "Edit" });
    expect(editBtns.length).toBeGreaterThan(0);
    fireEvent.click(editBtns[0]);

    expect(screen.getByText(/Edit Reimbursement Claim: CR-2026-0002/i)).toBeInTheDocument();

    // Modify amount
    const amountInput = screen.getByLabelText(/Total Amount \(₹\) \*/i);
    fireEvent.change(amountInput, { target: { value: "3500" } });

    // Save
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(storeReimbursementService.updateReimbursement).toHaveBeenCalledWith(102, {
        purchase_date: "2026-01-16",
        total_amount: 3500,
        reason: "Emergency water cans",
        notes: undefined,
        poc_id: undefined,
        instructed_by_user_id: undefined,
      });
    });

    expect(await screen.findByText(/Claim CR-2026-0002 updated successfully/i)).toBeInTheDocument();
  });

  test("4. SuperAdmin Approve claim executes approveReimbursement", async () => {
    storeReimbursementService.approveReimbursement.mockResolvedValue({ id: 102, status: "APPROVED" });

    render(<StoreReimbursement />);

    await screen.findByText("CR-2026-0002");

    // Approve button for PENDING claim (CR-2026-0002)
    const approveBtn = screen.getByRole("button", { name: "Approve" });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(storeReimbursementService.approveReimbursement).toHaveBeenCalledWith(102);
    });

    expect(await screen.findByText("Claim approved successfully.")).toBeInTheDocument();
  });

  test("5. SuperAdmin Reject claim prompts for mandatory reason", async () => {
    storeReimbursementService.rejectReimbursement.mockResolvedValue({ id: 102, status: "REJECTED" });

    render(<StoreReimbursement />);

    await screen.findByText("CR-2026-0002");

    const rejectBtn = screen.getByRole("button", { name: "Reject" });
    fireEvent.click(rejectBtn);

    expect(screen.getByText("Reject Reimbursement Claim")).toBeInTheDocument();

    // Try submit empty
    const confirmBtn = screen.getByRole("button", { name: "Confirm" });
    fireEvent.click(confirmBtn);

    // Enter reason
    const reasonInput = screen.getByPlaceholderText(/Mandatory reason.../i);
    fireEvent.change(reasonInput, { target: { value: "Invoice is illegible and unverified" } });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(storeReimbursementService.rejectReimbursement).toHaveBeenCalledWith(
        102,
        "Invoice is illegible and unverified"
      );
    });

    expect(await screen.findByText("Claim rejected.")).toBeInTheDocument();
  });

  test("6. SuperAdmin can cancel APPROVED claim when total_paid is 0", async () => {
    storeReimbursementService.cancelReimbursement.mockResolvedValue({ id: 103, status: "CANCELLED" });

    render(<StoreReimbursement />);

    await screen.findByText("CR-2026-0003");

    // CR-2026-0003 is APPROVED with total_paid: 0. SuperAdmin should see Cancel button
    const cancelBtns = screen.getAllByRole("button", { name: "Cancel" });
    expect(cancelBtns.length).toBeGreaterThan(0);

    // Click cancel on the APPROVED unpaid claim
    fireEvent.click(cancelBtns[cancelBtns.length - 1]);

    expect(screen.getByText("Cancel Reimbursement Claim")).toBeInTheDocument();

    const reasonInput = screen.getByPlaceholderText(/Mandatory reason.../i);
    fireEvent.change(reasonInput, { target: { value: "Operational cancellation by admin" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(storeReimbursementService.cancelReimbursement).toHaveBeenCalledWith(
        103,
        "Operational cancellation by admin"
      );
    });

    expect(await screen.findByText("Claim cancelled.")).toBeInTheDocument();
  });

  test("7. SuperAdmin records partial payment installment and verifies overpayment guard", async () => {
    storeReimbursementService.recordPayment.mockResolvedValue({ id: 202, amount: 1500 });
    storeReimbursementService.uploadAttachment.mockResolvedValue({ id: 402 });

    render(<StoreReimbursement />);

    await screen.findByText("CR-2026-0001");

    // CR-2026-0001 is PARTIALLY_PAID with outstanding 3000
    const payBtns = screen.getAllByRole("button", { name: "Pay" });
    fireEvent.click(payBtns[0]);

    expect(screen.getByText(/Record Payment: CR-2026-0001/i)).toBeInTheDocument();

    const amtInput = screen.getByLabelText(/Payment Amount \(₹\) \*/i);

    // Check overpayment validation
    fireEvent.change(amtInput, { target: { value: "99999" } });
    fireEvent.click(screen.getByRole("button", { name: "Record Payment" }));

    expect(await screen.findByText(/Payment amount cannot exceed outstanding balance/i)).toBeInTheDocument();

    // Enter valid partial amount
    fireEvent.change(amtInput, { target: { value: "1500" } });
    fireEvent.change(screen.getByLabelText(/UTR \/ Transaction Reference/i), {
      target: { value: "UTR987654" },
    });

    const proofFile = new File(["payment screenshot"], "proof.jpg", { type: "image/jpeg" });
    const proofInput = screen.getByLabelText(/Upload Payment Proof \(Optional\)/i);
    fireEvent.change(proofInput, { target: { files: [proofFile] } });

    fireEvent.click(screen.getByRole("button", { name: "Record Payment" }));

    await waitFor(() => {
      expect(storeReimbursementService.recordPayment).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          amount: 1500,
          transaction_reference: "UTR987654",
        })
      );
    });

    await waitFor(() => {
      expect(storeReimbursementService.uploadAttachment).toHaveBeenCalledWith(
        101,
        expect.any(File),
        "PAYMENT_PROOF",
        202
      );
    });
  });

  test("8. Detail modal displays ledger & attachments, and allows inline attachment upload", async () => {
    storeReimbursementService.uploadAttachment.mockResolvedValue({ id: 302 });

    render(<StoreReimbursement />);

    await screen.findByText("CR-2026-0001");

    const viewBtns = screen.getAllByRole("button", { name: "View" });
    fireEvent.click(viewBtns[0]);

    await waitFor(() => {
      expect(storeReimbursementService.getDetail).toHaveBeenCalledWith(101);
    });

    expect(await screen.findByText(/Claim Details: CR-2026-0001/i)).toBeInTheDocument();
    expect(screen.getByText("Purchased packaging bubble wrap")).toBeInTheDocument();
    expect(screen.getByText("bill_jan15.pdf")).toBeInTheDocument();
    expect(screen.getByText(/Ref \/ UTR: UPI123456789/i)).toBeInTheDocument();

    // Inline upload additional attachment
    const newFile = new File(["receipt2"], "receipt2.png", { type: "image/png" });
    const inlineFileInput = screen.getByLabelText ? screen.getAllByRole("button", { name: /Upload Attachment/i }) : null;
    expect(screen.getByText(/Upload Additional Proof \/ Receipt/i)).toBeInTheDocument();

    const fileInputs = document.querySelectorAll('input[type="file"]');
    const detailFileInput = fileInputs[fileInputs.length - 1];
    fireEvent.change(detailFileInput, { target: { files: [newFile] } });

    const uploadBtn = screen.getByRole("button", { name: "Upload Attachment" });
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(storeReimbursementService.uploadAttachment).toHaveBeenCalledWith(
        101,
        expect.any(File),
        "INVOICE"
      );
    });
  });

  test("9. SuperAdmin can void attachment with reason", async () => {
    storeReimbursementService.voidAttachment.mockResolvedValue({ id: 301, voided_at: "2026-01-20" });

    render(<StoreReimbursement />);

    await screen.findByText("CR-2026-0001");

    // Open detail modal
    fireEvent.click(screen.getAllByRole("button", { name: "View" })[0]);

    await screen.findByText("bill_jan15.pdf");

    // Click void button
    const voidBtn = screen.getByRole("button", { name: "Void" });
    fireEvent.click(voidBtn);

    expect(screen.getByText("Void Attachment")).toBeInTheDocument();

    const reasonInput = screen.getByPlaceholderText(/Mandatory reason.../i);
    fireEvent.change(reasonInput, { target: { value: "Wrong store bill uploaded" } });

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(storeReimbursementService.voidAttachment).toHaveBeenCalledWith(
        101,
        301,
        "Wrong store bill uploaded"
      );
    });

    expect(await screen.findByText("Attachment voided.")).toBeInTheDocument();
  });

  test("10. Export Excel triggers exportReimbursements with active filters", async () => {
    storeReimbursementService.exportReimbursements.mockResolvedValue();

    render(<StoreReimbursement />);

    const exportBtn = screen.getByRole("button", { name: /Export Excel/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(storeReimbursementService.exportReimbursements).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "ALL",
          region: "ALL",
          channel: "ALL",
          entity: "ALL",
        })
      );
    });

    expect(await screen.findByText("Export downloaded successfully.")).toBeInTheDocument();
  });

  test("11. Employee role uses backend-scoped selector and limits cancellation", async () => {
    localStorage.setItem("user_role", "employee");
    localStorage.setItem("user_id", "99"); // not owner of claim 101, 102, or 103

    render(<StoreReimbursement />);

    await waitFor(() => {
      expect(storeReimbursementService.getStoreSelector).toHaveBeenCalledWith(expect.objectContaining({ page: 1, page_size: 20 }));
    });

    await screen.findByText("CR-2026-0001");

    // Employee cannot approve or pay
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pay" })).not.toBeInTheDocument();

    // Since employee (user_id 99) is not creator of any item, Cancel and Edit are not shown
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });
});
