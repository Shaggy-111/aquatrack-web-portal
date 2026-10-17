import axios from "axios";
import { API_BASE_URL } from "../config";

const BASE_URL = `${API_BASE_URL}/store-reimbursements`;

const getAuthHeaders = () => {
  const token =
    localStorage.getItem("auth_token") ||
    localStorage.getItem("userToken") ||
    localStorage.getItem("partner_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Store Reimbursement Service
 * Connects to AquaTrack backend /store-reimbursements endpoints
 */
export const storeReimbursementService = {
  async getStoreSelector(params = {}) {
    const supported = ["region", "channel", "state", "city", "search", "is_active", "page", "page_size"];
    const cleaned = Object.fromEntries(supported.filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "").map((key) => [key, params[key]]));
    const response = await axios.get(`${API_BASE_URL}/stores/selector`, { params: cleaned, headers: getAuthHeaders() });
    return response.data;
  },

  async getStoreSelectorFilters(params = {}) {
    const supported = ["region", "channel", "state"];
    const cleaned = Object.fromEntries(supported.filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "").map((key) => [key, params[key]]));
    const response = await axios.get(`${API_BASE_URL}/stores/selector/filters`, { params: cleaned, headers: getAuthHeaders() });
    return response.data;
  },
  /**
   * List reimbursements with filters and server pagination
   */
  async listReimbursements(params = {}) {
    const cleanedParams = {};
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "" && val !== "ALL") {
        cleanedParams[key] = val;
      }
    });

    const response = await axios.get(BASE_URL, {
      params: cleanedParams,
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Get financial & count summary metrics
   */
  async getSummary(params = {}) {
    const cleanedParams = {};
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "" && val !== "ALL") {
        cleanedParams[key] = val;
      }
    });

    const response = await axios.get(`${BASE_URL}/summary`, {
      params: cleanedParams,
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Get single reimbursement detail including ledger & attachments
   */
  async getDetail(id) {
    const response = await axios.get(`${BASE_URL}/${id}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Create a new store reimbursement claim
   * payload: { store_id, purchase_date, total_amount, reason, poc_id, instructed_by_user_id, notes }
   */
  async createReimbursement(payload) {
    const response = await axios.post(BASE_URL, payload, {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  /**
   * Update a pending store reimbursement claim
   * payload: { purchase_date, total_amount, reason, poc_id, instructed_by_user_id, notes }
   */
  async updateReimbursement(id, payload) {
    const response = await axios.patch(`${BASE_URL}/${id}`, payload, {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  /**
   * Approve a pending reimbursement claim (SuperAdmin only)
   */
  async approveReimbursement(id) {
    const response = await axios.post(`${BASE_URL}/${id}/approve`, {}, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Reject a pending reimbursement claim (SuperAdmin only)
   * payload: { rejection_reason }
   */
  async rejectReimbursement(id, rejectionReason) {
    const response = await axios.post(
      `${BASE_URL}/${id}/reject`,
      { rejection_reason: rejectionReason },
      {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  /**
   * Cancel an unpaid reimbursement claim
   * payload: { cancellation_reason }
   */
  async cancelReimbursement(id, cancellationReason) {
    const response = await axios.post(
      `${BASE_URL}/${id}/cancel`,
      { cancellation_reason: cancellationReason },
      {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  /**
   * Record a payment installment (SuperAdmin only)
   * payload: { amount, payment_date, payment_mode, transaction_reference, remarks, paid_to_name, paid_to_phone }
   */
  async recordPayment(id, payload) {
    const response = await axios.post(`${BASE_URL}/${id}/payments`, payload, {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  /**
   * Upload an invoice or payment proof attachment
   * form fields: file, attachment_type, payment_id (optional)
   */
  async uploadAttachment(id, file, attachmentType = "INVOICE", paymentId = null) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("attachment_type", attachmentType);
    if (paymentId) {
      formData.append("payment_id", paymentId);
    }

    const response = await axios.post(`${BASE_URL}/${id}/attachments`, formData, {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  /**
   * Void an uploaded attachment (SuperAdmin only)
   * payload: { void_reason }
   */
  async voidAttachment(id, attachmentId, voidReason) {
    const response = await axios.post(
      `${BASE_URL}/${id}/attachments/${attachmentId}/void`,
      { void_reason: voidReason },
      {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  /**
   * Export filtered reimbursements to Excel
   */
  async exportReimbursements(params = {}) {
    const cleanedParams = {};
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "" && val !== "ALL") {
        cleanedParams[key] = val;
      }
    });

    const response = await axios.get(`${BASE_URL}/export`, {
      params: cleanedParams,
      headers: getAuthHeaders(),
      responseType: "blob",
    });

    // Extract filename from header if available
    let filename = `store_reimbursements_${Date.now()}.xlsx`;
    const headers = response.headers || {};
    const disposition = headers["content-disposition"] || headers["Content-Disposition"];
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default storeReimbursementService;
