import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import storeReimbursementService from "../services/storeReimbursementService";
import usePermissions from "../hooks/usePermissions";
import { PERMISSIONS } from "../permissions";
import "./StoreReimbursement.css";

const CANONICAL_REGIONS = ["NORTH", "SOUTH", "EAST", "WEST", "CENTRAL"];
const CANONICAL_CHANNELS = ["BLINKIT", "ZEPTO", "IBM", "GENERAL", "CUSTOM"];
const CANONICAL_ENTITIES = ["AMB", "BCPL", "BCPL-DS", "BFL", "BISTRO", "ZHPL", "ZEPTO"];
const STATUS_OPTIONS = ["ALL", "PENDING", "APPROVED", "PARTIALLY_PAID", "PAID", "REJECTED", "CANCELLED"];
const PAYMENT_MODES = ["UPI", "IMPS", "NEFT", "BANK_TRANSFER", "CASH", "OTHER"];
const ATTACHMENT_TYPES = ["INVOICE", "PAYMENT_PROOF", "OTHER"];

const formatINR = (val) => {
  const num = Number(val || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
};

export default function StoreReimbursement() {
  const { hasPermission } = usePermissions();

  // Role detection
  const currentUserRole = String(
    localStorage.getItem("user_role") ||
    localStorage.getItem("role") ||
    ""
  ).toLowerCase();
  const isSuperAdmin = currentUserRole === "superadmin";
  const currentUserId = Number(localStorage.getItem("user_id") || 0);

  // Permission guards
  const canView = isSuperAdmin || hasPermission(PERMISSIONS.STORE_REIMBURSEMENT_VIEW);
  const canCreate = isSuperAdmin || hasPermission(PERMISSIONS.STORE_REIMBURSEMENT_CREATE);
  const canEdit = isSuperAdmin || hasPermission(PERMISSIONS.STORE_REIMBURSEMENT_EDIT);
  const canApprove = isSuperAdmin || hasPermission(PERMISSIONS.STORE_REIMBURSEMENT_APPROVE);
  const canRecordPayment = isSuperAdmin && (hasPermission(PERMISSIONS.STORE_REIMBURSEMENT_RECORD_PAYMENT) || true);
  const canUploadProof = isSuperAdmin || hasPermission(PERMISSIONS.STORE_REIMBURSEMENT_UPLOAD_PROOF);
  const canCancel = isSuperAdmin || hasPermission(PERMISSIONS.STORE_REIMBURSEMENT_CANCEL);
  const canExport = isSuperAdmin || hasPermission(PERMISSIONS.STORE_REIMBURSEMENT_EXPORT);

  // Data states
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [errorNotice, setErrorNotice] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);

  // Filter toolbar state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [storeIdFilter, setStoreIdFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [purchaseDateFrom, setPurchaseDateFrom] = useState("");
  const [purchaseDateTo, setPurchaseDateTo] = useState("");
  const [outstandingOnly, setOutstandingOnly] = useState(false);

  // Available store scoping
  const [availableStores, setAvailableStores] = useState([]);

  // Modals state
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const [promptAction, setPromptAction] = useState(null); // { type: 'REJECT' | 'CANCEL' | 'VOID_ATTACHMENT', id, extraId }
  const [promptReason, setPromptReason] = useState("");
  const [promptSubmitting, setPromptSubmitting] = useState(false);

  // Form states - Create Claim
  const [claimStoreId, setClaimStoreId] = useState("");
  const [claimPurchaseDate, setClaimPurchaseDate] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [claimReason, setClaimReason] = useState("");
  const [claimPocId, setClaimPocId] = useState("");
  const [claimInstructedBy, setClaimInstructedBy] = useState("");
  const [claimNotes, setClaimNotes] = useState("");
  const [claimInitialFile, setClaimInitialFile] = useState(null);

  // Form states - Record Payment
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 16));
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [paymentTxRef, setPaymentTxRef] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [paidToName, setPaidToName] = useState("");
  const [paidToPhone, setPaidToPhone] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState(null);

  // Form states - Edit Claim
  const [editingClaim, setEditingClaim] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editPurchaseDate, setEditPurchaseDate] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editPocId, setEditPocId] = useState("");
  const [editInstructedBy, setEditInstructedBy] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Detail modal additional attachment upload
  const [detailUploadFile, setDetailUploadFile] = useState(null);
  const [detailUploadType, setDetailUploadType] = useState("INVOICE");
  const [detailUploading, setDetailUploading] = useState(false);

  // Fetch available stores (SuperAdmin: /stores, Employee: /employees/me/stores)
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const token =
          localStorage.getItem("auth_token") ||
          localStorage.getItem("userToken") ||
          localStorage.getItem("partner_token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const endpoint = isSuperAdmin
          ? `${API_BASE_URL}/store/all`
          : `${API_BASE_URL}/employees/me/stores`;

        const res = await axios.get(endpoint, { headers });
        const data = Array.isArray(res.data) ? res.data : (res.data?.stores || res.data?.items || []);
        setAvailableStores(data);
      } catch (err) {
        console.error("Failed to load scoped stores", err);
      }
    };
    fetchStores();
  }, [isSuperAdmin]);

  // Load summary metrics
  const loadSummary = useCallback(async () => {
    try {
      const res = await storeReimbursementService.getSummary({
        search: searchTerm,
        store_id: storeIdFilter,
        region: regionFilter,
        channel: channelFilter,
        entity: entityFilter,
        purchase_date_from: purchaseDateFrom || undefined,
        purchase_date_to: purchaseDateTo || undefined,
      });
      setSummary(res);
    } catch (err) {
      console.error("Failed to load summary", err);
    }
  }, [searchTerm, storeIdFilter, regionFilter, channelFilter, entityFilter, purchaseDateFrom, purchaseDateTo]);

  // Load table records
  const loadReimbursements = useCallback(async () => {
    setLoading(true);
    setErrorNotice(null);
    try {
      const res = await storeReimbursementService.listReimbursements({
        page,
        page_size: pageSize,
        search: searchTerm,
        status: statusFilter,
        store_id: storeIdFilter,
        region: regionFilter,
        channel: channelFilter,
        entity: entityFilter,
        purchase_date_from: purchaseDateFrom || undefined,
        purchase_date_to: purchaseDateTo || undefined,
        outstanding_only: outstandingOnly || undefined,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 0);
    } catch (err) {
      setErrorNotice(err.response?.data?.detail || "Failed to load reimbursement claims.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, statusFilter, storeIdFilter, regionFilter, channelFilter, entityFilter, purchaseDateFrom, purchaseDateTo, outstandingOnly]);

  useEffect(() => {
    if (canView) {
      loadReimbursements();
      loadSummary();
    }
  }, [canView, loadReimbursements, loadSummary]);

  // Load claim detail
  const openDetail = async (id) => {
    setDetailLoading(true);
    setIsDetailOpen(true);
    try {
      const data = await storeReimbursementService.getDetail(id);
      setSelectedDetail(data);
    } catch (err) {
      setErrorNotice(err.response?.data?.detail || "Failed to load claim detail.");
      setIsDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Handle Export
  const handleExport = async () => {
    try {
      await storeReimbursementService.exportReimbursements({
        search: searchTerm,
        status: statusFilter,
        store_id: storeIdFilter,
        region: regionFilter,
        channel: channelFilter,
        entity: entityFilter,
        purchase_date_from: purchaseDateFrom || undefined,
        purchase_date_to: purchaseDateTo || undefined,
      });
      setSuccessNotice("Export downloaded successfully.");
    } catch (err) {
      setErrorNotice(err.response?.data?.detail || "Export failed.");
    }
  };

  // Handle Create Claim
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setErrorNotice(null);

    try {
      const payload = {
        store_id: claimStoreId,
        purchase_date: claimPurchaseDate,
        total_amount: Number(claimAmount),
        reason: claimReason,
        poc_id: claimPocId ? Number(claimPocId) : undefined,
        instructed_by_user_id: claimInstructedBy ? Number(claimInstructedBy) : undefined,
        notes: claimNotes || undefined,
      };

      const created = await storeReimbursementService.createReimbursement(payload);

      // If initial proof attached, upload it
      let fileUploadWarning = null;
      if (claimInitialFile && created?.id) {
        try {
          await storeReimbursementService.uploadAttachment(created.id, claimInitialFile, "INVOICE");
        } catch (uploadErr) {
          console.warn("Claim created but initial file upload failed", uploadErr);
          fileUploadWarning = uploadErr.response?.data?.detail || uploadErr.message || "Initial attachment upload failed.";
        }
      }

      if (fileUploadWarning) {
        setSuccessNotice(`Claim ${created.reimbursement_number} created, but initial attachment upload failed: ${fileUploadWarning}`);
      } else {
        setSuccessNotice(`Claim ${created.reimbursement_number} created successfully.`);
      }
      setIsCreateOpen(false);
      // Reset form
      setClaimStoreId("");
      setClaimPurchaseDate("");
      setClaimAmount("");
      setClaimReason("");
      setClaimPocId("");
      setClaimInstructedBy("");
      setClaimNotes("");
      setClaimInitialFile(null);

      loadReimbursements();
      loadSummary();
    } catch (err) {
      setErrorNotice(err.response?.data?.detail || "Failed to create reimbursement claim.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (claim) => {
    setEditingClaim(claim);
    setEditPurchaseDate(claim.purchase_date || "");
    setEditAmount(String(claim.total_amount || ""));
    setEditReason(claim.reason || "");
    setEditPocId(claim.poc_id ? String(claim.poc_id) : "");
    setEditInstructedBy(claim.instructed_by_user_id ? String(claim.instructed_by_user_id) : "");
    setEditNotes(claim.notes || "");
    setIsEditOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingClaim) return;
    setEditSubmitting(true);
    setErrorNotice(null);

    try {
      const payload = {
        purchase_date: editPurchaseDate,
        total_amount: Number(editAmount),
        reason: editReason,
        poc_id: editPocId ? Number(editPocId) : undefined,
        instructed_by_user_id: editInstructedBy ? Number(editInstructedBy) : undefined,
        notes: editNotes || undefined,
      };

      const updated = await storeReimbursementService.updateReimbursement(editingClaim.id, payload);
      setSuccessNotice(`Claim ${updated.reimbursement_number || editingClaim.reimbursement_number} updated successfully.`);
      setIsEditOpen(false);
      setEditingClaim(null);
      loadReimbursements();
      loadSummary();
      if (selectedDetail?.id === editingClaim.id) {
        openDetail(editingClaim.id);
      }
    } catch (err) {
      setErrorNotice(err.response?.data?.detail || "Failed to update reimbursement claim.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle Detail Modal Additional Attachment Upload
  const handleDetailAttachmentUpload = async (e) => {
    e.preventDefault();
    if (!detailUploadFile || !selectedDetail?.id) return;
    setDetailUploading(true);
    setErrorNotice(null);
    try {
      await storeReimbursementService.uploadAttachment(
        selectedDetail.id,
        detailUploadFile,
        detailUploadType
      );
      setSuccessNotice("Attachment uploaded successfully.");
      setDetailUploadFile(null);
      openDetail(selectedDetail.id);
    } catch (err) {
      setErrorNotice(err.response?.data?.detail || "Failed to upload attachment.");
    } finally {
      setDetailUploading(false);
    }
  };

  // Handle Approve Claim
  const handleApprove = async (id) => {
    try {
      await storeReimbursementService.approveReimbursement(id);
      setSuccessNotice("Claim approved successfully.");
      loadReimbursements();
      loadSummary();
      if (selectedDetail?.id === id) {
        openDetail(id);
      }
    } catch (err) {
      setErrorNotice(err.response?.data?.detail || "Failed to approve claim.");
    }
  };

  // Open Prompt Modal for Reject / Cancel / Void
  const openPrompt = (type, id, extraId = null) => {
    setPromptAction({ type, id, extraId });
    setPromptReason("");
  };

  const handlePromptSubmit = async (e) => {
    e.preventDefault();
    if (!promptReason.trim() || promptReason.trim().length < 3) {
      setErrorNotice("Reason must be at least 3 characters.");
      return;
    }

    setPromptSubmitting(true);
    setErrorNotice(null);
    try {
      if (promptAction.type === "REJECT") {
        await storeReimbursementService.rejectReimbursement(promptAction.id, promptReason.trim());
        setSuccessNotice("Claim rejected.");
      } else if (promptAction.type === "CANCEL") {
        await storeReimbursementService.cancelReimbursement(promptAction.id, promptReason.trim());
        setSuccessNotice("Claim cancelled.");
      } else if (promptAction.type === "VOID_ATTACHMENT") {
        await storeReimbursementService.voidAttachment(promptAction.id, promptAction.extraId, promptReason.trim());
        setSuccessNotice("Attachment voided.");
      }

      setPromptAction(null);
      setPromptReason("");
      loadReimbursements();
      loadSummary();
      if (selectedDetail?.id === promptAction.id) {
        openDetail(promptAction.id);
      }
    } catch (err) {
      setErrorNotice(err.response?.data?.detail || "Action failed.");
    } finally {
      setPromptSubmitting(false);
    }
  };

  // Open Payment Modal
  const openPaymentModal = (claim) => {
    setSelectedDetail(claim);
    setPaymentAmount(String(claim.outstanding_amount || ""));
    setPaymentDate(new Date().toISOString().slice(0, 16));
    setPaymentMode("UPI");
    setPaymentTxRef("");
    setPaymentRemarks("");
    setPaidToName(claim.poc_name || "");
    setPaidToPhone(claim.poc_phone || "");
    setPaymentProofFile(null);
    setIsPaymentOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const amt = Number(paymentAmount);
    if (amt <= 0) {
      setErrorNotice("Payment amount must be greater than zero.");
      return;
    }
    if (amt > Number(selectedDetail?.outstanding_amount || 0)) {
      setErrorNotice(`Payment amount cannot exceed outstanding balance of ${formatINR(selectedDetail.outstanding_amount)}.`);
      return;
    }

    setPaymentSubmitting(true);
    setErrorNotice(null);
    try {
      const payload = {
        amount: amt,
        payment_date: new Date(paymentDate).toISOString(),
        payment_mode: paymentMode,
        transaction_reference: paymentTxRef.trim() || undefined,
        remarks: paymentRemarks.trim() || undefined,
        paid_to_name: paidToName.trim() || undefined,
        paid_to_phone: paidToPhone.trim() || undefined,
      };

      const payment = await storeReimbursementService.recordPayment(selectedDetail.id, payload);

      if (paymentProofFile && payment?.id) {
        try {
          await storeReimbursementService.uploadAttachment(
            selectedDetail.id,
            paymentProofFile,
            "PAYMENT_PROOF",
            payment.id
          );
        } catch (uploadErr) {
          console.warn("Payment recorded but proof upload failed", uploadErr);
        }
      }

      setSuccessNotice("Payment installment recorded successfully.");
      setIsPaymentOpen(false);
      loadReimbursements();
      loadSummary();
      openDetail(selectedDetail.id);
    } catch (err) {
      setErrorNotice(err.response?.data?.detail || "Failed to record payment.");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setStoreIdFilter("");
    setRegionFilter("ALL");
    setChannelFilter("ALL");
    setEntityFilter("ALL");
    setPurchaseDateFrom("");
    setPurchaseDateTo("");
    setOutstandingOnly(false);
    setPage(1);
  };

  if (!canView) {
    return (
      <div className="reimb-container">
        <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
          <h2>Access Denied</h2>
          <p>You do not have permission to view Store Reimbursements.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reimb-container">
      {/* NOTICES */}
      {errorNotice && (
        <div
          role="alert"
          style={{
            backgroundColor: "#FEE2E2",
            color: "#991B1B",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontWeight: "600",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>{errorNotice}</span>
          <button
            type="button"
            onClick={() => setErrorNotice(null)}
            style={{ background: "none", border: "none", color: "#991B1B", cursor: "pointer", fontWeight: "700" }}
          >
            ✕
          </button>
        </div>
      )}

      {successNotice && (
        <div
          role="status"
          style={{
            backgroundColor: "#DCFCE7",
            color: "#166534",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontWeight: "600",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>{successNotice}</span>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            style={{ background: "none", border: "none", color: "#166534", cursor: "pointer", fontWeight: "700" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="reimb-header">
        <div className="reimb-title-block">
          <h1>Store Reimbursement</h1>
          <p>Track, approve, and disburse local store water purchase expenses.</p>
        </div>
        <div className="reimb-header-actions">
          {canExport && (
            <button type="button" onClick={handleExport} className="reimb-btn-secondary">
              📥 Export Excel
            </button>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="reimb-btn-primary"
            >
              + Create Claim
            </button>
          )}
        </div>
      </div>

      {/* SUMMARY METRIC CARDS */}
      {summary && (
        <div className="reimb-metrics-grid">
          <div className="reimb-metric-card">
            <div className="reimb-metric-label">Total Claims</div>
            <div className="reimb-metric-val">{summary.total_claims}</div>
            <div className="reimb-metric-sub">Across accessible stores</div>
          </div>
          <div className="reimb-metric-card">
            <div className="reimb-metric-label">Pending Approval</div>
            <div className="reimb-metric-val" style={{ color: "#D97706" }}>
              {summary.pending_count}
            </div>
            <div className="reimb-metric-sub">Awaiting verification</div>
          </div>
          <div className="reimb-metric-card">
            <div className="reimb-metric-label">Approved</div>
            <div className="reimb-metric-val" style={{ color: "#2563EB" }}>
              {summary.approved_count}
            </div>
            <div className="reimb-metric-sub">Ready for disbursement</div>
          </div>
          <div className="reimb-metric-card">
            <div className="reimb-metric-label">Paid in Full</div>
            <div className="reimb-metric-val" style={{ color: "#16A34A" }}>
              {summary.paid_count}
            </div>
            <div className="reimb-metric-sub">Disbursed</div>
          </div>
          <div className="reimb-metric-card">
            <div className="reimb-metric-label">Total Claimed</div>
            <div className="reimb-metric-val">{formatINR(summary.total_reimbursement_amount)}</div>
            <div className="reimb-metric-sub">Gross expense</div>
          </div>
          <div className="reimb-metric-card">
            <div className="reimb-metric-label">Outstanding Balance</div>
            <div className="reimb-metric-val" style={{ color: "#DC2626" }}>
              {formatINR(summary.total_outstanding_amount)}
            </div>
            <div className="reimb-metric-sub">Unpaid liability</div>
          </div>
        </div>
      )}

      {/* FILTER TOOLBAR */}
      <div className="reimb-toolbar">
        <div className="reimb-toolbar-header">
          <span style={{ fontSize: "14px", fontWeight: "700", color: "#1E293B" }}>
            Search & Filter Claims
          </span>
          <button
            type="button"
            onClick={handleClearFilters}
            style={{ background: "none", border: "none", color: "#DC2626", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
          >
            Clear All
          </button>
        </div>
        <div className="reimb-toolbar-grid">
          {/* Search */}
          <div style={{ gridColumn: "span 2", minWidth: "220px" }}>
            <label className="reimb-field-label">Search</label>
            <input
              type="search"
              className="reimb-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Claim #, Store ID, Name, POC..."
            />
          </div>

          {/* Store Selector */}
          <div>
            <label className="reimb-field-label">Store</label>
            <select
              className="reimb-input"
              value={storeIdFilter}
              onChange={(e) => setStoreIdFilter(e.target.value)}
            >
              <option value="">All Accessible Stores</option>
              {availableStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.store_name} ({s.id})
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="reimb-field-label">Status</label>
            <select
              className="reimb-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st === "ALL" ? "All Statuses" : st.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Region */}
          <div>
            <label className="reimb-field-label">Region</label>
            <select
              className="reimb-input"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
            >
              <option value="ALL">All Regions</option>
              {CANONICAL_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Channel */}
          <div>
            <label className="reimb-field-label">Channel</label>
            <select
              className="reimb-input"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
            >
              <option value="ALL">All Channels</option>
              {CANONICAL_CHANNELS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>

          {/* Purchase Date From */}
          <div>
            <label className="reimb-field-label">From Date</label>
            <input
              type="date"
              className="reimb-input"
              value={purchaseDateFrom}
              onChange={(e) => setPurchaseDateFrom(e.target.value)}
            />
          </div>

          {/* Purchase Date To */}
          <div>
            <label className="reimb-field-label">To Date</label>
            <input
              type="date"
              className="reimb-input"
              value={purchaseDateTo}
              onChange={(e) => setPurchaseDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="reimb-table-card">
        <div style={{ overflowX: "auto" }}>
          <table className="reimb-table">
            <thead>
              <tr>
                <th>Claim #</th>
                <th>Purchase Date</th>
                <th>Store</th>
                <th>POC</th>
                <th>Total Amt</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "30px", color: "#64748B" }}>
                    Loading claims...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "30px", color: "#64748B" }}>
                    No reimbursement claims found.
                  </td>
                </tr>
              ) : (
                items.map((claim) => {
                  const isOwner = claim.created_by_id === currentUserId;
                  const canCancelThis =
                    (claim.status === "PENDING" && (isSuperAdmin || (isOwner && canCancel))) ||
                    (isSuperAdmin && claim.status === "APPROVED" && Number(claim.total_paid || 0) === 0);
                  const canApproveThis = isSuperAdmin && claim.status === "PENDING" && canApprove;
                  const canPayThis =
                    isSuperAdmin &&
                    (claim.status === "APPROVED" || claim.status === "PARTIALLY_PAID") &&
                    canRecordPayment;
                  const canEditThis = claim.status === "PENDING" && (isSuperAdmin || (isOwner && canEdit));

                  return (
                    <tr key={claim.id}>
                      <td style={{ fontWeight: "700", fontFamily: "monospace" }}>
                        {claim.reimbursement_number}
                      </td>
                      <td>{claim.purchase_date}</td>
                      <td>
                        <div style={{ fontWeight: "600" }}>{claim.store_name}</div>
                        <div style={{ fontSize: "11px", color: "#64748B" }}>{claim.store_id}</div>
                      </td>
                      <td>
                        <div>{claim.poc_name || "—"}</div>
                        {claim.poc_phone && (
                          <div style={{ fontSize: "11px", color: "#64748B" }}>{claim.poc_phone}</div>
                        )}
                      </td>
                      <td style={{ fontWeight: "700" }}>{formatINR(claim.total_amount)}</td>
                      <td style={{ color: "#16A34A" }}>{formatINR(claim.total_paid)}</td>
                      <td style={{ color: Number(claim.outstanding_amount) > 0 ? "#DC2626" : "#64748B", fontWeight: "700" }}>
                        {formatINR(claim.outstanding_amount)}
                      </td>
                      <td>
                        <span className={`reimb-badge reimb-badge-${claim.status.toLowerCase()}`}>
                          {claim.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => openDetail(claim.id)}
                            style={{
                              padding: "4px 8px",
                              border: "1px solid #CBD5E1",
                              borderRadius: "4px",
                              background: "#fff",
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                          >
                            View
                          </button>

                          {canEditThis && (
                            <button
                              type="button"
                              onClick={() => openEditModal(claim)}
                              style={{
                                padding: "4px 8px",
                                border: "1px solid #93C5FD",
                                borderRadius: "4px",
                                background: "#EFF6FF",
                                color: "#1D4ED8",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: "pointer",
                              }}
                            >
                              Edit
                            </button>
                          )}

                          {canPayThis && (
                            <button
                              type="button"
                              onClick={() => openPaymentModal(claim)}
                              style={{
                                padding: "4px 8px",
                                border: "none",
                                borderRadius: "4px",
                                background: "#16A34A",
                                color: "#fff",
                                fontSize: "12px",
                                fontWeight: "700",
                                cursor: "pointer",
                              }}
                            >
                              Pay
                            </button>
                          )}

                          {canApproveThis && (
                            <button
                              type="button"
                              onClick={() => handleApprove(claim.id)}
                              style={{
                                padding: "4px 8px",
                                border: "none",
                                borderRadius: "4px",
                                background: "#2563EB",
                                color: "#fff",
                                fontSize: "12px",
                                fontWeight: "700",
                                cursor: "pointer",
                              }}
                            >
                              Approve
                            </button>
                          )}

                          {canApproveThis && (
                            <button
                              type="button"
                              onClick={() => openPrompt("REJECT", claim.id)}
                              style={{
                                padding: "4px 8px",
                                border: "1px solid #FCA5A5",
                                borderRadius: "4px",
                                background: "#FEF2F2",
                                color: "#DC2626",
                                fontSize: "12px",
                                fontWeight: "700",
                                cursor: "pointer",
                              }}
                            >
                              Reject
                            </button>
                          )}

                          {canCancelThis && (
                            <button
                              type="button"
                              onClick={() => openPrompt("CANCEL", claim.id)}
                              style={{
                                padding: "4px 8px",
                                border: "1px solid #CBD5E1",
                                borderRadius: "4px",
                                background: "#F1F5F9",
                                color: "#64748B",
                                fontSize: "12px",
                                cursor: "pointer",
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="reimb-pagination">
          <span style={{ fontSize: "13px", color: "#64748B" }}>
            Showing {items.length} of {total} claims (Page {page} of {totalPages || 1})
          </span>
          <div className="reimb-page-btns">
            <button
              type="button"
              className="reimb-btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="reimb-btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* CREATE CLAIM MODAL */}
      {isCreateOpen && (
        <div className="reimb-modal-backdrop" role="dialog" aria-modal="true">
          <div className="reimb-modal-card" style={{ maxWidth: "600px" }}>
            <div className="reimb-modal-header">
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800" }}>Submit Reimbursement Claim</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="reimb-modal-body">
                <div>
                  <label htmlFor="claim-store" className="reimb-field-label">Store *</label>
                  <select
                    id="claim-store"
                    className="reimb-input"
                    value={claimStoreId}
                    onChange={(e) => setClaimStoreId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Store --</option>
                    {availableStores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.store_name} ({s.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label htmlFor="claim-date" className="reimb-field-label">Purchase Date *</label>
                    <input
                      id="claim-date"
                      type="date"
                      className="reimb-input"
                      value={claimPurchaseDate}
                      onChange={(e) => setClaimPurchaseDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="claim-amount" className="reimb-field-label">Total Amount (₹) *</label>
                    <input
                      id="claim-amount"
                      type="number"
                      step="0.01"
                      className="reimb-input"
                      value={claimAmount}
                      onChange={(e) => setClaimAmount(e.target.value)}
                      placeholder="e.g. 1500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="claim-reason" className="reimb-field-label">Reason *</label>
                  <textarea
                    id="claim-reason"
                    className="reimb-input"
                    rows={2}
                    value={claimReason}
                    onChange={(e) => setClaimReason(e.target.value)}
                    placeholder="Reason for local water purchase..."
                    required
                  />
                </div>

                <div>
                  <label htmlFor="claim-notes" className="reimb-field-label">Notes (Optional)</label>
                  <textarea
                    id="claim-notes"
                    className="reimb-input"
                    rows={2}
                    value={claimNotes}
                    onChange={(e) => setClaimNotes(e.target.value)}
                    placeholder="Internal reference notes..."
                  />
                </div>

                <div>
                  <label htmlFor="claim-file" className="reimb-field-label">Initial Bill / Invoice (Optional)</label>
                  <input
                    id="claim-file"
                    type="file"
                    className="reimb-input"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={(e) => setClaimInitialFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <div className="reimb-modal-footer">
                <button
                  type="button"
                  className="reimb-btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={createSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="reimb-btn-primary"
                  disabled={createSubmitting}
                >
                  {createSubmitting ? "Submitting..." : "Submit Claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CLAIM MODAL */}
      {isEditOpen && editingClaim && (
        <div className="reimb-modal-backdrop" role="dialog" aria-modal="true">
          <div className="reimb-modal-card" style={{ maxWidth: "600px" }}>
            <div className="reimb-modal-header">
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800" }}>
                Edit Reimbursement Claim: {editingClaim.reimbursement_number}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingClaim(null);
                }}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="reimb-modal-body">
                <div>
                  <label htmlFor="edit-store" className="reimb-field-label">Store</label>
                  <input
                    id="edit-store"
                    type="text"
                    className="reimb-input"
                    value={`${editingClaim.store_name || ""} (${editingClaim.store_id || ""})`}
                    disabled
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label htmlFor="edit-date" className="reimb-field-label">Purchase Date *</label>
                    <input
                      id="edit-date"
                      type="date"
                      className="reimb-input"
                      value={editPurchaseDate}
                      onChange={(e) => setEditPurchaseDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-amount" className="reimb-field-label">Total Amount (₹) *</label>
                    <input
                      id="edit-amount"
                      type="number"
                      step="0.01"
                      className="reimb-input"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-reason" className="reimb-field-label">Reason for Purchase *</label>
                  <textarea
                    id="edit-reason"
                    className="reimb-input"
                    rows={2}
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label htmlFor="edit-poc" className="reimb-field-label">POC ID (Optional)</label>
                    <input
                      id="edit-poc"
                      type="number"
                      className="reimb-input"
                      value={editPocId}
                      onChange={(e) => setEditPocId(e.target.value)}
                      placeholder="e.g. 12"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-instructed" className="reimb-field-label">Instructed By User ID (Optional)</label>
                    <input
                      id="edit-instructed"
                      type="number"
                      className="reimb-input"
                      value={editInstructedBy}
                      onChange={(e) => setEditInstructedBy(e.target.value)}
                      placeholder="e.g. 5"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-notes" className="reimb-field-label">Additional Notes</label>
                  <textarea
                    id="edit-notes"
                    className="reimb-input"
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Optional notes or details"
                  />
                </div>
              </div>

              <div className="reimb-modal-footer">
                <button
                  type="button"
                  className="reimb-btn-secondary"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingClaim(null);
                  }}
                  disabled={editSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="reimb-btn-primary"
                  disabled={editSubmitting}
                >
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL WITH LEDGER & ATTACHMENTS */}
      {isDetailOpen && (
        <div className="reimb-modal-backdrop" role="dialog" aria-modal="true">
          <div className="reimb-modal-card">
            <div className="reimb-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800" }}>
                  Claim Details: {selectedDetail?.reimbursement_number}
                </h3>
                <span className={`reimb-badge reimb-badge-${selectedDetail?.status?.toLowerCase()}`} style={{ marginTop: "4px" }}>
                  {selectedDetail?.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div className="reimb-modal-body">
              {detailLoading || !selectedDetail ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                  Loading claim details...
                </div>
              ) : (
                <>
                  {/* SUMMARY SECTION */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", background: "#F8FAFC", padding: "16px", borderRadius: "10px" }}>
                    <div>
                      <div className="reimb-field-label">Store Snapshot</div>
                      <div style={{ fontWeight: "700" }}>{selectedDetail.store_name}</div>
                      <div style={{ fontSize: "12px", color: "#64748B" }}>ID: {selectedDetail.store_id}</div>
                    </div>
                    <div>
                      <div className="reimb-field-label">Classification</div>
                      <div>Channel: {selectedDetail.store_channel || "—"}</div>
                      <div style={{ fontSize: "12px", color: "#64748B" }}>Region: {selectedDetail.store_region || "—"}</div>
                    </div>
                    <div>
                      <div className="reimb-field-label">Point of Contact</div>
                      <div>{selectedDetail.poc_name || "—"}</div>
                      <div style={{ fontSize: "12px", color: "#64748B" }}>{selectedDetail.poc_phone || "—"}</div>
                    </div>
                    <div>
                      <div className="reimb-field-label">Financials</div>
                      <div>Total: <strong>{formatINR(selectedDetail.total_amount)}</strong></div>
                      <div style={{ color: "#16A34A" }}>Paid: {formatINR(selectedDetail.total_paid)}</div>
                      <div style={{ color: "#DC2626", fontWeight: "700" }}>Outstanding: {formatINR(selectedDetail.outstanding_amount)}</div>
                    </div>
                  </div>

                  {/* REASON & NOTES */}
                  <div>
                    <div className="reimb-field-label">Reason for Purchase</div>
                    <p style={{ margin: "4px 0", color: "#1E293B", fontSize: "14px" }}>{selectedDetail.reason}</p>
                    {selectedDetail.notes && (
                      <p style={{ margin: "4px 0", color: "#64748B", fontSize: "13px" }}>Notes: {selectedDetail.notes}</p>
                    )}
                  </div>

                  {/* PAYMENT LEDGER */}
                  <div>
                    <div className="reimb-field-label" style={{ marginBottom: "8px" }}>Payment Installment Ledger</div>
                    {(selectedDetail.payments || []).length === 0 ? (
                      <p style={{ color: "#94A3B8", fontSize: "13px" }}>No payments recorded yet.</p>
                    ) : (
                      selectedDetail.payments.map((p) => (
                        <div key={p.id} className="reimb-ledger-item">
                          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700" }}>
                            <span>{formatINR(p.amount)} via {p.payment_mode}</span>
                            <span style={{ fontSize: "12px", color: "#64748B" }}>{new Date(p.payment_date).toLocaleDateString()}</span>
                          </div>
                          {p.transaction_reference && (
                            <div style={{ fontSize: "12px", color: "#475569" }}>Ref / UTR: {p.transaction_reference}</div>
                          )}
                          {p.remarks && (
                            <div style={{ fontSize: "12px", color: "#64748B" }}>Remarks: {p.remarks}</div>
                          )}
                          <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "4px" }}>
                            Paid by: {p.paid_by_name || "Admin"} • Paid to: {p.paid_to_name || "POC"}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* ATTACHMENTS */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <div className="reimb-field-label" style={{ margin: 0 }}>Receipt & Payment Attachments</div>
                    </div>

                    {canUploadProof && selectedDetail.status !== "CANCELLED" && selectedDetail.status !== "REJECTED" && (
                      <form
                        onSubmit={handleDetailAttachmentUpload}
                        style={{
                          background: "#F8FAFC",
                          border: "1px dashed #CBD5E1",
                          borderRadius: "6px",
                          padding: "10px",
                          marginBottom: "12px",
                        }}
                      >
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>
                          Upload Additional Proof / Receipt
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                            onChange={(e) => setDetailUploadFile(e.target.files?.[0] || null)}
                            style={{ fontSize: "12px" }}
                            required
                          />
                          <select
                            value={detailUploadType}
                            onChange={(e) => setDetailUploadType(e.target.value)}
                            style={{ fontSize: "12px", padding: "4px 8px", borderRadius: "4px", border: "1px solid #CBD5E1" }}
                          >
                            {ATTACHMENT_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t.replace("_", " ")}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            disabled={detailUploading || !detailUploadFile}
                            style={{
                              padding: "4px 10px",
                              backgroundColor: "#2563EB",
                              color: "#fff",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: detailUploading || !detailUploadFile ? "not-allowed" : "pointer",
                            }}
                          >
                            {detailUploading ? "Uploading..." : "Upload Attachment"}
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="reimb-attach-grid">
                      {(selectedDetail.attachments || []).map((att) => {
                        const isVoided = Boolean(att.voided_at);
                        return (
                          <div
                            key={att.id}
                            className="reimb-attach-card"
                            style={{ opacity: isVoided ? 0.5 : 1, border: isVoided ? "1px dashed #CBD5E1" : "1px solid #E2E8F0" }}
                          >
                            <div style={{ fontSize: "11px", fontWeight: "700", color: "#2563EB" }}>
                              {att.attachment_type}
                            </div>
                            <div style={{ fontSize: "12px", margin: "6px 0", wordBreak: "break-all" }}>
                              {att.file_name}
                            </div>
                            {isVoided ? (
                              <span style={{ fontSize: "10px", color: "#DC2626", fontWeight: "700" }}>VOIDED</span>
                            ) : (
                              <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "6px" }}>
                                <a
                                  href={att.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ fontSize: "11px", color: "#2563EB", textDecoration: "none" }}
                                >
                                  Open
                                </a>
                                {isSuperAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => openPrompt("VOID_ATTACHMENT", selectedDetail.id, att.id)}
                                    style={{ background: "none", border: "none", color: "#DC2626", fontSize: "11px", cursor: "pointer" }}
                                  >
                                    Void
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="reimb-modal-footer">
              <button
                type="button"
                className="reimb-btn-secondary"
                onClick={() => setIsDetailOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL (SuperAdmin Only) */}
      {isPaymentOpen && selectedDetail && (
        <div className="reimb-modal-backdrop" role="dialog" aria-modal="true">
          <div className="reimb-modal-card" style={{ maxWidth: "560px" }}>
            <div className="reimb-modal-header">
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800" }}>
                Record Payment: {selectedDetail.reimbursement_number}
              </h3>
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit}>
              <div className="reimb-modal-body">
                <div style={{ background: "#F1F5F9", padding: "12px", borderRadius: "8px", display: "flex", justifyContent: "space-between" }}>
                  <div>Total: <strong>{formatINR(selectedDetail.total_amount)}</strong></div>
                  <div>Outstanding: <strong style={{ color: "#DC2626" }}>{formatINR(selectedDetail.outstanding_amount)}</strong></div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label htmlFor="payment-amount" className="reimb-field-label">Payment Amount (₹) *</label>
                    <input
                      id="payment-amount"
                      type="number"
                      step="0.01"
                      className="reimb-input"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      max={selectedDetail.outstanding_amount}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="payment-mode" className="reimb-field-label">Payment Mode *</label>
                    <select
                      id="payment-mode"
                      className="reimb-input"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                    >
                      {PAYMENT_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="payment-tx-ref" className="reimb-field-label">UTR / Transaction Reference</label>
                  <input
                    id="payment-tx-ref"
                    type="text"
                    className="reimb-input"
                    value={paymentTxRef}
                    onChange={(e) => setPaymentTxRef(e.target.value)}
                    placeholder="Bank reference or UTR"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label htmlFor="paid-to-name" className="reimb-field-label">Paid To (Name)</label>
                    <input
                      id="paid-to-name"
                      type="text"
                      className="reimb-input"
                      value={paidToName}
                      onChange={(e) => setPaidToName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="paid-to-phone" className="reimb-field-label">Paid To (Phone / UPI)</label>
                    <input
                      id="paid-to-phone"
                      type="text"
                      className="reimb-input"
                      value={paidToPhone}
                      onChange={(e) => setPaidToPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="payment-remarks" className="reimb-field-label">Payment Remarks</label>
                  <input
                    id="payment-remarks"
                    type="text"
                    className="reimb-input"
                    value={paymentRemarks}
                    onChange={(e) => setPaymentRemarks(e.target.value)}
                    placeholder="Optional notes"
                  />
                </div>

                <div>
                  <label htmlFor="payment-proof-file" className="reimb-field-label">Upload Payment Proof (Optional)</label>
                  <input
                    id="payment-proof-file"
                    type="file"
                    className="reimb-input"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <div className="reimb-modal-footer">
                <button
                  type="button"
                  className="reimb-btn-secondary"
                  onClick={() => setIsPaymentOpen(false)}
                  disabled={paymentSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="reimb-btn-success"
                  disabled={paymentSubmitting}
                >
                  {paymentSubmitting ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROMPT MODAL (REJECT / CANCEL / VOID) */}
      {promptAction && (
        <div className="reimb-modal-backdrop" role="dialog" aria-modal="true">
          <div className="reimb-modal-card" style={{ maxWidth: "450px" }}>
            <div className="reimb-modal-header">
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800" }}>
                {promptAction.type === "REJECT"
                  ? "Reject Reimbursement Claim"
                  : promptAction.type === "CANCEL"
                  ? "Cancel Reimbursement Claim"
                  : "Void Attachment"}
              </h3>
              <button
                type="button"
                onClick={() => setPromptAction(null)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handlePromptSubmit}>
              <div className="reimb-modal-body">
                <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>
                  Please enter a mandatory reason for this action:
                </p>
                <textarea
                  className="reimb-input"
                  rows={3}
                  value={promptReason}
                  onChange={(e) => setPromptReason(e.target.value)}
                  placeholder="Mandatory reason..."
                  required
                />
              </div>
              <div className="reimb-modal-footer">
                <button
                  type="button"
                  className="reimb-btn-secondary"
                  onClick={() => setPromptAction(null)}
                  disabled={promptSubmitting}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="reimb-btn-danger"
                  disabled={promptSubmitting}
                >
                  {promptSubmitting ? "Submitting..." : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
