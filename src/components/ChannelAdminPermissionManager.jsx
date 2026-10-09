import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import usePermissionCatalog from "../hooks/usePermissionCatalog";

export const BLINKIT_CHANNEL_ADMIN_PERMISSIONS = [
  { key: "blinkit_reports.view", label: "View Blinkit Report", defaultEnabled: true },
  { key: "blinkit_reports.export", label: "Export Blinkit Report", defaultEnabled: true },
  { key: "blinkit_reports.metadata_manage", label: "Manage Blinkit Metadata", defaultEnabled: false },
  { key: "blinkit_reports.vendor_rate_export", label: "Vendor Rate Export", defaultEnabled: false },
];

const getToken = () =>
  localStorage.getItem("auth_token") ||
  localStorage.getItem("userToken") ||
  localStorage.getItem("partner_token");

const permissionList = (payload) =>
  Array.isArray(payload) ? payload : payload?.permissions || payload?.items || payload?.data || [];

const permissionId = (permission) =>
  Number(typeof permission === "number" ? permission : permission?.permission_id ?? permission?.permission?.id ?? permission?.id);

const errorMessage = (error) => {
  const detail = error?.response?.data?.detail || error?.response?.data?.message;
  return typeof detail === "string" ? detail : "Unable to update Channel Admin permissions.";
};

export default function ChannelAdminPermissionManager({ admin, onClose }) {
  const { catalog, loading: catalogLoading, error: catalogError } = usePermissionCatalog();
  const [assigned, setAssigned] = useState(new Set());
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const defaultsSeeded = useRef(false);
  const isBlinkit = String(admin?.channel || "").toUpperCase() === "BLINKIT";

  const config = useMemo(() => ({ headers: { Authorization: `Bearer ${getToken()}` } }), []);
  const relevantPermissions = useMemo(() => BLINKIT_CHANNEL_ADMIN_PERMISSIONS.map((definition) => {
    const catalogPermission = catalog.find((permission) => permission.key === definition.key);
    return catalogPermission ? { ...definition, ...catalogPermission, label: definition.label } : null;
  }).filter(Boolean), [catalog]);

  const loadCurrentPermissions = useCallback(async () => {
    if (!admin?.id || !isBlinkit) return;
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${API_BASE_URL}/employees/${admin.id}/permissions`, config);
      const ids = permissionList(response.data).map(permissionId).filter(Number.isInteger);
      const next = new Set(ids);
      if (!defaultsSeeded.current) {
        BLINKIT_CHANNEL_ADMIN_PERMISSIONS.filter((permission) => permission.defaultEnabled).forEach((definition) => {
          const catalogPermission = catalog.find((permission) => permission.key === definition.key);
          if (catalogPermission?.id) next.add(catalogPermission.id);
        });
        defaultsSeeded.current = true;
      }
      setAssigned(new Set(ids));
      setSelected(next);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [admin?.id, catalog, config, isBlinkit]);

  useEffect(() => {
    if (!catalogLoading) loadCurrentPermissions();
  }, [catalogLoading, loadCurrentPermissions]);

  if (!admin || !isBlinkit) return null;

  const toggle = (id) => setSelected((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await axios.post(
        `${API_BASE_URL}/employees/${admin.id}/permissions/bulk`,
        { permission_ids: [...selected].sort((left, right) => left - right) },
        config
      );
      await loadCurrentPermissions();
      setAssigned(new Set(selected));
      setMessage("Channel Admin permissions updated successfully.");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  return <div style={styles.backdrop} role="presentation">
    <section style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="channel-admin-permissions-title">
      <div style={styles.header}>
        <div>
          <h2 id="channel-admin-permissions-title" style={styles.title}>Manage Channel Admin Permissions</h2>
          <p style={styles.subtitle}>{admin.full_name} · BLINKIT</p>
        </div>
        <button type="button" onClick={onClose} disabled={saving} aria-label="Close permission manager" style={styles.close}>×</button>
      </div>
      {error && <div role="alert" style={styles.error}>{error}</div>}
      {message && <div role="status" style={styles.success}>{message}</div>}
      {loading || catalogLoading ? <p>Loading permissions...</p> : catalogError ? <div role="alert" style={styles.error}>Permission catalog unavailable.</div> : <>
        <p style={styles.help}>Blinkit report permissions are added to the Channel Admin's complete existing permission set.</p>
        <div style={styles.permissions}>
          {relevantPermissions.map((permission) => <label key={permission.key} style={styles.permission}>
            <input type="checkbox" checked={selected.has(permission.id)} onChange={() => toggle(permission.id)} disabled={saving} />
            <span><strong>{permission.label}</strong><small style={styles.key}>{permission.key}</small></span>
          </label>)}
        </div>
        {!relevantPermissions.length && <div role="alert" style={styles.error}>Blinkit permissions are missing from the permission catalog.</div>}
        <p style={styles.count}>{assigned.size} currently assigned · {selected.size} selected in total</p>
      </>}
      <div style={styles.actions}>
        <button type="button" onClick={onClose} disabled={saving} style={styles.cancel}>Close</button>
        <button type="button" onClick={save} disabled={saving || loading || catalogLoading || !relevantPermissions.length} style={styles.save}>{saving ? "Saving..." : "Save Permissions"}</button>
      </div>
    </section>
  </div>;
}

const styles = {
  backdrop: { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,.55)", display: "grid", placeItems: "center", padding: 20 },
  modal: { width: "min(620px, 100%)", maxHeight: "85vh", overflowY: "auto", background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 20px 50px rgba(15,23,42,.3)" },
  header: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" },
  title: { margin: 0, color: "#102a43", fontSize: 22 },
  subtitle: { margin: "6px 0 18px", color: "#64748b" },
  close: { border: 0, background: "transparent", fontSize: 28, cursor: "pointer", color: "#475569" },
  help: { color: "#475569", lineHeight: 1.5 },
  permissions: { display: "grid", gap: 10, margin: "16px 0" },
  permission: { display: "flex", gap: 10, alignItems: "flex-start", padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" },
  key: { display: "block", marginTop: 3, color: "#64748b" },
  count: { color: "#64748b", fontSize: 13 },
  actions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 },
  cancel: { border: 0, borderRadius: 7, padding: "10px 16px", cursor: "pointer", background: "#e2e8f0", color: "#334155" },
  save: { border: 0, borderRadius: 7, padding: "10px 16px", cursor: "pointer", background: "#1565C0", color: "#fff", fontWeight: 700 },
  error: { marginBottom: 12, padding: 10, borderRadius: 7, background: "#fee2e2", color: "#991b1b" },
  success: { marginBottom: 12, padding: 10, borderRadius: 7, background: "#dcfce7", color: "#166534" },
};


