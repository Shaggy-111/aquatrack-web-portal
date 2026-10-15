import React, { useEffect, useMemo, useRef, useState } from "react";
import usePermissions from "../hooks/usePermissions";
import service from "../services/storeComplianceMonthlyService";
import MonthlyComplianceFilters, { emptyFilters } from "../components/storeCompliance/MonthlyComplianceFilters";
import MonthlyComplianceTable from "../components/storeCompliance/MonthlyComplianceTable";
import MonthlyComplianceDetailDrawer from "../components/storeCompliance/MonthlyComplianceDetailDrawer";
import CreateMonthlyRecordModal from "../components/storeCompliance/CreateMonthlyRecordModal";
import MonthlyCardModal from "../components/storeCompliance/MonthlyCardModal";
import InvoiceModal from "../components/storeCompliance/InvoiceModal";
import PaymentModal from "../components/storeCompliance/PaymentModal";
import AttachmentUploadModal from "../components/storeCompliance/AttachmentUploadModal";
import AttachmentViewer from "../components/storeCompliance/AttachmentViewer";
import VoidAttachmentModal from "../components/storeCompliance/VoidAttachmentModal";
import { capabilities, errorMessage, money } from "../components/storeCompliance/shared";
import "./StoreComplianceMonthly.css";

export function exportFilename(disposition) {
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition || "");
  const plain = /filename="?([^";]+)"?/i.exec(disposition || "");
  let filename;
  try { filename = encoded ? decodeURIComponent(encoded[1]) : plain?.[1]; } catch { filename = plain?.[1]; }
  const now = new Date();
  return (filename || `store_compliance_monthly_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.xlsx`).replace(/[\\/:*?"<>|]/g, "_");
}
export default function StoreComplianceMonthly() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const role = localStorage.getItem("user_role") || localStorage.getItem("role");
  const caps = capabilities(role, hasPermission);
  const allowed = caps.view && (caps.superAdmin || !permissionsLoading);
  const [filters, setFilters] = useState(emptyFilters);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(20);
  const [revision, setRevision] = useState(0);
  const [list, setList] = useState({ items: [], total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true); const [listError, setListError] = useState("");
  const [summary, setSummary] = useState(null); const [summaryError, setSummaryError] = useState(""); const [summaryLoading, setSummaryLoading] = useState(true);
  const [stores, setStores] = useState([]); const [storeError, setStoreError] = useState(""); const [storesLoading, setStoresLoading] = useState(true); const [storeRetry, setStoreRetry] = useState(0);
  const [selectedId, setSelectedId] = useState(null); const [detail, setDetail] = useState(null); const [detailLoading, setDetailLoading] = useState(false); const [detailError, setDetailError] = useState(""); const [detailRetry, setDetailRetry] = useState(0);
  const [action, setAction] = useState(null); const [busy, setBusy] = useState(false); const [actionError, setActionError] = useState(""); const [progress, setProgress] = useState(0);
  const [viewer, setViewer] = useState(null); const [notice, setNotice] = useState(""); const [exporting, setExporting] = useState(false);
  const mutationLock = useRef(false);
  useEffect(() => { const timer = setTimeout(() => { setSearch(filters.search.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [filters.search]);
  const params = useMemo(() => ({ ...filters, search, has_invoice: filters.has_invoice === "" ? undefined : filters.has_invoice === "true", page, page_size: pageSize }), [filters, search, page, pageSize]);
  const listScope = JSON.stringify(params);
  // Separate serialized scope prevents pagination and list-only filters from refetching the summary.
  const summaryScope = JSON.stringify({ year: filters.year, month: filters.month, region: filters.region, channel: filters.channel, entity: filters.entity });
  useEffect(() => {
    if (!allowed) return;
    let active = true; setLoading(true); setListError("");
    service.listMonthlyCompliance(JSON.parse(listScope)).then((result) => {
      if (!active) return;
      if (result.total_pages > 0 && page > result.total_pages) { setPage(result.total_pages); return; }
      setList(result);
    }).catch((error) => { if (active) setListError(errorMessage(error)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed, listScope, revision, page]);
  useEffect(() => {
    if (!allowed) return;
    let active = true; setSummaryLoading(true); setSummaryError("");
    service.getMonthlySummary(JSON.parse(summaryScope)).then((result) => { if (active) setSummary(result); }).catch((error) => { if (active) setSummaryError(errorMessage(error)); }).finally(() => { if (active) setSummaryLoading(false); });
    return () => { active = false; };
  }, [allowed, summaryScope, revision]);
  useEffect(() => {
    if (!allowed) return;
    let active = true; setStoresLoading(true); setStoreError(""); setStores([]);
    service.listStores(caps.superAdmin).then((result) => { if (active) setStores(Array.isArray(result) ? result : result.stores || result.items || []); }).catch((error) => { if (active) setStoreError(errorMessage(error)); }).finally(() => { if (active) setStoresLoading(false); });
    return () => { active = false; };
  }, [allowed, caps.superAdmin, storeRetry]);
  useEffect(() => {
    if (!allowed || selectedId === null) return;
    let active = true; setDetailLoading(true); setDetailError("");
    service.getMonthlyDetail(selectedId).then((result) => { if (active) setDetail(result); }).catch((error) => { if (active) setDetailError(errorMessage(error)); }).finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [allowed, selectedId, revision, detailRetry]);
  const changeFilter = (key, value) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1); };
  const openAction = (type, extra = {}) => { setActionError(""); setProgress(0); setAction({ type, ...extra }); };
  const closeAction = () => { if (!mutationLock.current) { setAction(null); setActionError(""); } };
  const mutate = async (request, onSuccess, fallback) => {
    if (mutationLock.current) return;
    mutationLock.current = true; setBusy(true); setActionError("");
    try {
      const result = await request();
      setRevision((value) => value + 1); setAction(null); onSuccess?.(result);
    } catch (error) { setActionError(`${fallback || ""}${errorMessage(error)}`); }
    finally { mutationLock.current = false; setBusy(false); }
  };
  const doExport = async () => {
    setExporting(true); setNotice("");
    try {
      const response = await service.exportMonthlyCompliance(params);
      const url = URL.createObjectURL(response.data); const link = document.createElement("a");
      link.href = url; link.download = exportFilename(response.headers?.["content-disposition"]); document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setNotice(`Export failed: ${errorMessage(error)}`); }
    finally { setExporting(false); }
  };
  if (!caps.superAdmin && permissionsLoading) return <div className="sc-page" role="status">Loading permissions…</div>;
  if (!caps.view) return <div className="sc-page" role="alert">You do not have permission to view Store Compliance.</div>;
  const formProps = { busy, error: actionError, onClose: closeAction };
  const primary = [["Total Monthly Records", "total_monthly_records"], ["Pending Cards", "pending_cards"], ["Total Invoice Amount", "total_invoice_amount", true], ["Total Paid", "total_paid_amount", true], ["Outstanding", "total_outstanding_amount", true]];
  const secondary = [["Cards Uploaded", "cards_uploaded"], ["With Invoice", "with_invoice"], ["Without Invoice", "without_invoice"], ["Unpaid", "unpaid_count"], ["Partially Paid", "partially_paid_count"], ["Paid", "paid_count"]];
  return <main className="sc-page">
    <div className="sc-section-header"><div><h1>Store Compliance</h1><p>Monthly water card, invoice and payment tracking</p></div><div className="sc-actions">{caps.create && <button className="sc-primary" disabled={storesLoading || Boolean(storeError) || !stores.length} onClick={() => openAction("create")}>Create Monthly Record</button>}{caps.export && <button disabled={exporting} onClick={doExport}>{exporting ? "Exporting…" : "Export Excel"}</button>}</div></div>
    {notice && <div className="sc-notice" role="status">{notice}<button onClick={() => setNotice("")}>Dismiss</button></div>}
    <section aria-label="Monthly summary"><p className="sc-scope">Summary scope: Year, Month, Region, Channel and Entity only. Store, search and status filters apply to the list and export.</p>
      {summaryError ? <div role="alert">Summary unavailable: {summaryError}<button onClick={() => setRevision((value) => value + 1)}>Retry summary</button></div> : <><div className="sc-metrics">{primary.map(([title, key, currency]) => <article key={key}><p>{title}</p><strong>{summaryLoading ? "…" : currency ? money(summary?.[key]) : summary?.[key] ?? 0}</strong></article>)}</div><div className="sc-secondary">{secondary.map(([title, key]) => <span key={key}>{title} <strong>{summaryLoading ? "…" : summary?.[key] ?? 0}</strong></span>)}</div></>}
    </section>
    {storesLoading ? <p role="status">Loading available Stores…</p> : storeError ? <div role="alert">Store selector unavailable: {storeError}<button onClick={() => setStoreRetry((value) => value + 1)}>Retry Stores</button></div> : !stores.length && <p>No stores assigned or available.</p>}
    <MonthlyComplianceFilters filters={filters} stores={stores} onChange={changeFilter} onClear={() => { setFilters(emptyFilters()); setSearch(""); setPage(1); }} />
    {loading ? <p role="status" className="sc-panel">Loading monthly records…</p> : listError ? <div className="sc-panel" role="alert">{listError}<button onClick={() => setRevision((value) => value + 1)}>Retry list</button></div> : <MonthlyComplianceTable items={list.items} onView={(id) => { setDetail(null); setSelectedId(id); }} />}
    <div className="sc-pagination"><span>{list.total} records · Page {list.total_pages ? page : 0} of {list.total_pages}</span><label>Page size<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>{[10, 20, 50, 100].map((size) => <option key={size}>{size}</option>)}</select></label><button disabled={loading || Boolean(listError) || page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button disabled={loading || Boolean(listError) || page >= list.total_pages} onClick={() => setPage((value) => value + 1)}>Next</button></div>
    {selectedId !== null && !action && !viewer && <MonthlyComplianceDetailDrawer record={detail} loading={detailLoading} error={detailError} onRetry={() => setDetailRetry((value) => value + 1)} onClose={() => { setSelectedId(null); setDetail(null); }} caps={caps} onCard={() => openAction("card")} onInvoice={() => openAction("invoice")} onPayment={() => openAction("payment")} onAttachment={() => openAction("attachment")} onProof={(payment) => openAction("attachment", { payment })} onPreview={setViewer} onVoid={(attachment) => openAction("void", { attachment })} />}
    {action?.type === "create" && caps.create && <CreateMonthlyRecordModal {...formProps} stores={stores} onSubmit={(payload) => mutate(() => service.createMonthlyCompliance(payload), (result) => { setSelectedId(result.id); setDetail(null); setNotice("Monthly record created. Choose Upload Monthly Card in the detail panel to add the card."); })} />}
    {detail && action?.type === "card" && caps.upload && <MonthlyCardModal {...formProps} record={detail} progress={progress} onSubmit={(file, remarks) => mutate(() => service.uploadMonthlyCard(detail.id, file, remarks, (event) => { if (event.total) setProgress(Math.round(event.loaded * 100 / event.total)); }), () => setNotice("Monthly card saved."))} />}
    {detail && action?.type === "invoice" && caps.invoice && <InvoiceModal {...formProps} record={detail} onSubmit={(payload, edit) => mutate(() => edit ? service.updateInvoice(detail.id, payload) : service.createInvoice(detail.id, payload), () => setNotice("Invoice saved."))} />}
    {detail && action?.type === "payment" && caps.payment && <PaymentModal {...formProps} record={detail} onSubmit={(payload) => mutate(() => service.recordPayment(detail.id, payload), (payment) => { setNotice("Payment recorded successfully. Attach proof now or from the payment ledger."); setAction({ type: "attachment", payment }); })} />}
    {detail && action?.type === "attachment" && caps.upload && (!action.payment || caps.superAdmin) && <AttachmentUploadModal {...formProps} record={detail} payment={action.payment} superAdmin={caps.superAdmin} onSubmit={(payload) => mutate(() => service.uploadAttachment(detail.id, payload), () => setNotice("Attachment uploaded."), action.payment ? "Payment recorded successfully, but proof upload failed. " : "")} />}
    {detail && action?.type === "void" && caps.void && <VoidAttachmentModal {...formProps} attachment={action.attachment} onSubmit={(reason) => mutate(() => service.voidAttachment(detail.id, action.attachment.id, reason), () => setNotice("Attachment voided. Audit history retained."))} />}
    {viewer && <AttachmentViewer file={viewer} onClose={() => setViewer(null)} />}
  </main>;
}
