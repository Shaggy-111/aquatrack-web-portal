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

import storeReimbursementService from "./storeReimbursementService";

describe("storeReimbursementService API Client", () => {
  test("Store selector uses exact paged endpoint, preserves false and excludes unsupported filters", async () => {
    mockAxiosGet.mockResolvedValue({ data: { items: [], page: 1, page_size: 20, has_more: false } });
    await storeReimbursementService.getStoreSelector({ region: "NORTH", channel: "BLINKIT", state: "Delhi", city: "Delhi", search: "STR", page: 1, page_size: 20, is_active: false, entity: "ignored", empty: "" });
    expect(mockAxiosGet).toHaveBeenCalledWith("https://api.example.test/stores/selector", { params: { region: "NORTH", channel: "BLINKIT", state: "Delhi", city: "Delhi", search: "STR", page: 1, page_size: 20, is_active: false }, headers: { Authorization: "Bearer test-token-xyz" } });
  });
  test("Store filter metadata sends only region/channel/state", async () => {
    mockAxiosGet.mockResolvedValue({ data: { regions: [], channels: [], states: [], cities: [] } });
    await storeReimbursementService.getStoreSelectorFilters({ region: "SOUTH", channel: "ZEPTO", state: "Karnataka", city: "ignored", search: "ignored" });
    expect(mockAxiosGet).toHaveBeenCalledWith("https://api.example.test/stores/selector/filters", { params: { region: "SOUTH", channel: "ZEPTO", state: "Karnataka" }, headers: { Authorization: "Bearer test-token-xyz" } });
  });
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("auth_token", "test-token-xyz");
    mockAxiosGet.mockReset();
    mockAxiosPost.mockReset();
    mockAxiosPatch.mockReset();
  });

  test("listReimbursements cleans parameters and attaches auth header", async () => {
    mockAxiosGet.mockResolvedValue({ data: { items: [], total: 0 } });

    const result = await storeReimbursementService.listReimbursements({
      page: 1,
      page_size: 20,
      search: "Koramangala",
      status: "ALL", // should be stripped
      region: "SOUTH",
      channel: "", // should be stripped
      entity: undefined, // should be stripped
    });

    expect(mockAxiosGet).toHaveBeenCalledWith(
      "https://api.example.test/store-reimbursements",
      {
        params: {
          page: 1,
          page_size: 20,
          search: "Koramangala",
          region: "SOUTH",
        },
        headers: { Authorization: "Bearer test-token-xyz" },
      }
    );
    expect(result).toEqual({ items: [], total: 0 });
  });

  test("getSummary calls /summary with cleaned params", async () => {
    mockAxiosGet.mockResolvedValue({ data: { total_claims: 10 } });

    const summary = await storeReimbursementService.getSummary({
      region: "NORTH",
      status: "ALL",
    });

    expect(mockAxiosGet).toHaveBeenCalledWith(
      "https://api.example.test/store-reimbursements/summary",
      {
        params: { region: "NORTH" },
        headers: { Authorization: "Bearer test-token-xyz" },
      }
    );
    expect(summary.total_claims).toBe(10);
  });

  test("getDetail calls /:id", async () => {
    mockAxiosGet.mockResolvedValue({ data: { id: 123, reimbursement_number: "CR-123" } });

    const detail = await storeReimbursementService.getDetail(123);

    expect(mockAxiosGet).toHaveBeenCalledWith(
      "https://api.example.test/store-reimbursements/123",
      { headers: { Authorization: "Bearer test-token-xyz" } }
    );
    expect(detail.id).toBe(123);
  });

  test("createReimbursement posts json body", async () => {
    mockAxiosPost.mockResolvedValue({ data: { id: 456 } });

    const payload = {
      store_id: "STR-001",
      purchase_date: "2026-01-20",
      total_amount: 500,
      reason: "Emergency water bottles",
    };

    const res = await storeReimbursementService.createReimbursement(payload);

    expect(mockAxiosPost).toHaveBeenCalledWith(
      "https://api.example.test/store-reimbursements",
      payload,
      {
        headers: {
          Authorization: "Bearer test-token-xyz",
          "Content-Type": "application/json",
        },
      }
    );
    expect(res.id).toBe(456);
  });

  test("updateReimbursement patches json body", async () => {
    mockAxiosPatch.mockResolvedValue({ data: { id: 456, total_amount: 600 } });

    const payload = {
      purchase_date: "2026-01-21",
      total_amount: 600,
      reason: "Updated reason",
    };

    const res = await storeReimbursementService.updateReimbursement(456, payload);

    expect(mockAxiosPatch).toHaveBeenCalledWith(
      "https://api.example.test/store-reimbursements/456",
      payload,
      {
        headers: {
          Authorization: "Bearer test-token-xyz",
          "Content-Type": "application/json",
        },
      }
    );
    expect(res.total_amount).toBe(600);
  });

  test("approveReimbursement posts to /:id/approve", async () => {
    mockAxiosPost.mockResolvedValue({ data: { id: 789, status: "APPROVED" } });

    await storeReimbursementService.approveReimbursement(789);

    expect(mockAxiosPost).toHaveBeenCalledWith(
      "https://api.example.test/store-reimbursements/789/approve",
      {},
      { headers: { Authorization: "Bearer test-token-xyz" } }
    );
  });

  test("rejectReimbursement posts rejection_reason", async () => {
    mockAxiosPost.mockResolvedValue({ data: { id: 789, status: "REJECTED" } });

    await storeReimbursementService.rejectReimbursement(789, "Invalid receipt");

    expect(mockAxiosPost).toHaveBeenCalledWith(
      "https://api.example.test/store-reimbursements/789/reject",
      { rejection_reason: "Invalid receipt" },
      {
        headers: {
          Authorization: "Bearer test-token-xyz",
          "Content-Type": "application/json",
        },
      }
    );
  });

  test("cancelReimbursement posts cancellation_reason", async () => {
    mockAxiosPost.mockResolvedValue({ data: { id: 789, status: "CANCELLED" } });

    await storeReimbursementService.cancelReimbursement(789, "Cancelled by user");

    expect(mockAxiosPost).toHaveBeenCalledWith(
      "https://api.example.test/store-reimbursements/789/cancel",
      { cancellation_reason: "Cancelled by user" },
      {
        headers: {
          Authorization: "Bearer test-token-xyz",
          "Content-Type": "application/json",
        },
      }
    );
  });

  test("recordPayment posts payment payload", async () => {
    mockAxiosPost.mockResolvedValue({ data: { id: 991, amount: 200 } });

    const payload = {
      amount: 200,
      payment_date: "2026-01-20T12:00:00Z",
      payment_mode: "UPI",
    };

    await storeReimbursementService.recordPayment(789, payload);

    expect(mockAxiosPost).toHaveBeenCalledWith(
      "https://api.example.test/store-reimbursements/789/payments",
      payload,
      {
        headers: {
          Authorization: "Bearer test-token-xyz",
          "Content-Type": "application/json",
        },
      }
    );
  });

  test("uploadAttachment sends multipart FormData", async () => {
    mockAxiosPost.mockResolvedValue({ data: { id: 555 } });

    const file = new File(["test file content"], "receipt.pdf", { type: "application/pdf" });
    await storeReimbursementService.uploadAttachment(789, file, "INVOICE", 991);

    expect(mockAxiosPost).toHaveBeenCalledWith(
      "https://api.example.test/store-reimbursements/789/attachments",
      expect.any(FormData),
      {
        headers: {
          Authorization: "Bearer test-token-xyz",
          "Content-Type": "multipart/form-data",
        },
      }
    );
  });

  test("voidAttachment posts void_reason", async () => {
    mockAxiosPost.mockResolvedValue({ data: { id: 555, voided_at: "2026-01-22" } });

    await storeReimbursementService.voidAttachment(789, 555, "Wrong document");

    expect(mockAxiosPost).toHaveBeenCalledWith(
      "https://api.example.test/store-reimbursements/789/attachments/555/void",
      { void_reason: "Wrong document" },
      {
        headers: {
          Authorization: "Bearer test-token-xyz",
          "Content-Type": "application/json",
        },
      }
    );
  });

  test("exportReimbursements triggers blob download", async () => {
    window.URL.createObjectURL = jest.fn(() => "blob:mock-url");
    window.URL.revokeObjectURL = jest.fn();

    mockAxiosGet.mockResolvedValue({
      data: new Uint8Array([1, 2, 3]),
      headers: { "content-disposition": 'attachment; filename="claims_jan.xlsx"' },
    });

    await storeReimbursementService.exportReimbursements({ status: "ALL", region: "WEST" });

    expect(mockAxiosGet).toHaveBeenCalledWith(
      "https://api.example.test/store-reimbursements/export",
      {
        params: { region: "WEST" },
        headers: { Authorization: "Bearer test-token-xyz" },
        responseType: "blob",
      }
    );
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });
});
