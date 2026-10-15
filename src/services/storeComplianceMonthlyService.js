import api from "./apiClient";

const BASE = "/store-compliance/monthly";
const FILTERS = ["search", "store_id", "year", "month", "region", "channel", "entity", "card_status", "payment_status", "has_invoice", "outstanding_only"];
const SUMMARY_FILTERS = ["year", "month", "region", "channel", "entity"];
const paramsFor = (values, keys) => Object.fromEntries(keys.filter((key) => values[key] !== "" && values[key] !== undefined && values[key] !== null).map((key) => [key, values[key]]));
const multipart = (values) => {
  const form = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== null && value !== undefined) form.append(key, value);
  });
  return form;
};
const data = (request) => request.then((response) => response.data);

export const storeComplianceMonthlyService = {
  listMonthlyCompliance: (params = {}) => data(api.get(BASE, { params: paramsFor(params, [...FILTERS, "page", "page_size"]) })),
  getMonthlySummary: (params = {}) => data(api.get(`${BASE}/summary`, { params: paramsFor(params, SUMMARY_FILTERS) })),
  exportMonthlyCompliance: (params = {}) => api.get(`${BASE}/export`, { params: paramsFor(params, FILTERS), responseType: "blob" }),
  createMonthlyCompliance: (payload) => data(api.post(BASE, payload)),
  getMonthlyDetail: (id) => data(api.get(`${BASE}/${id}`)),
  uploadMonthlyCard: (id, file, remarks, onUploadProgress) => data(api.post(`${BASE}/${id}/card`, multipart({ file, remarks }), { onUploadProgress })),
  createInvoice: (id, payload) => data(api.post(`${BASE}/${id}/invoice`, multipart(payload))),
  updateInvoice: (id, payload) => data(api.patch(`${BASE}/${id}/invoice`, multipart(payload))),
  recordPayment: (id, payload) => data(api.post(`${BASE}/${id}/payments`, payload)),
  uploadAttachment: (id, payload) => data(api.post(`${BASE}/${id}/attachments`, multipart(payload))),
  voidAttachment: (id, attachmentId, reason) => data(api.post(`${BASE}/${id}/attachments/${attachmentId}/void`, { void_reason: reason })),
  listStores: (superAdmin) => data(api.get(superAdmin ? "/store/store/list/all" : "/employees/me/stores")),
};
export default storeComplianceMonthlyService;
