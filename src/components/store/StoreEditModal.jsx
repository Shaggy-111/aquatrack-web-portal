import React, { useMemo } from "react";
import { INDIA_STATES, getCitiesForState } from "../../constants/indiaLocations";

const CANONICAL_REGIONS = ["NORTH", "SOUTH", "EAST", "WEST", "CENTRAL"];
const CANONICAL_CHANNELS = ["BLINKIT", "ZEPTO", "IBM", "GENERAL", "CUSTOM"];
const CANONICAL_ENTITIES = ["AMB", "BCPL", "BCPL-DS", "BFL", "BISTRO", "ZHPL", "ZEPTO"];

export default function StoreEditModal({
  isVisible,
  onClose,
  onSubmit,
  store,
  name,
  setName,
  region,
  setRegion,
  entity,
  setEntity,
  channel,
  setChannel,
  projectCode,
  setProjectCode,
  state,
  setState,
  city,
  setCity,
  address,
  setAddress,
  zipCode,
  setZipCode,
  lat,
  setLat,
  long,
  setLong,
  assignedManagerId,
  setAssignedManagerId,
  pocName,
  setPocName,
  pocPhone,
  setPocPhone,
  isActive,
  setIsActive,
  deliveryManagers = [],
  isLoading = false,
  styles = {},
}) {
  if (!isVisible || !store) return null;

  // City options based on state
  const citiesForState = useMemo(() => {
    if (!state) return [];
    return getCitiesForState(state) || [];
  }, [state]);

  const modalBackdrop = styles.modalStyles?.backdrop || {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
    padding: "16px",
  };

  const modalContent = {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "800px",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    overflow: "hidden",
  };

  const sectionHeaderStyle = {
    fontSize: "12px",
    fontWeight: "800",
    color: "#0F766E",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "12px",
    borderBottom: "1px solid #E2E8F0",
    paddingBottom: "6px",
  };

  const labelStyle = {
    display: "block",
    fontSize: "12px",
    fontWeight: "700",
    color: "#334155",
    marginBottom: "4px",
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #CBD5E1",
    borderRadius: "8px",
    fontSize: "13px",
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
  };

  const readOnlyStyle = {
    ...inputStyle,
    backgroundColor: "#F1F5F9",
    color: "#64748B",
    cursor: "not-allowed",
    fontWeight: "700",
    fontFamily: "monospace",
  };

  return (
    <div style={modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="edit-store-title">
      <div style={modalContent}>
        {/* MODAL HEADER */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#F8FAFC",
          }}
        >
          <div>
            <h3 id="edit-store-title" style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#0F172A" }}>
              Edit Store Details
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748B" }}>
              Update store configuration and operational details.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: "#64748B",
              padding: "4px 8px",
              borderRadius: "6px",
            }}
          >
            ✕
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <form id="edit-store-form" onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div
            style={{
              padding: "24px",
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            {/* SECTION A: STORE IDENTITY */}
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <div style={sectionHeaderStyle}>A. Store Identity</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>Store ID (Read-Only):</label>
                  <input style={readOnlyStyle} value={store.id} disabled readOnly />
                </div>
                <div>
                  <label style={labelStyle}>Store Name *:</label>
                  <input
                    style={inputStyle}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter store name"
                    required
                  />
                </div>
              </div>
            </div>

            {/* SECTION B: BUSINESS CLASSIFICATION */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <div style={sectionHeaderStyle}>B. Business Classification</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>Channel *:</label>
                  <select
                    style={inputStyle}
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    required
                  >
                    {CANONICAL_CHANNELS.map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Region:</label>
                  <select
                    style={inputStyle}
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  >
                    <option value="">Select Region</option>
                    {CANONICAL_REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Entity:</label>
                  <select
                    style={inputStyle}
                    value={entity}
                    onChange={(e) => setEntity(e.target.value)}
                  >
                    <option value="">Select Entity</option>
                    {CANONICAL_ENTITIES.map((ent) => (
                      <option key={ent} value={ent}>
                        {ent}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Project Code:</label>
                  <input
                    style={inputStyle}
                    value={projectCode}
                    onChange={(e) => setProjectCode(e.target.value)}
                    placeholder="Project Code"
                  />
                </div>
              </div>
            </div>

            {/* SECTION C: LOCATION & ADDRESS */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <div style={sectionHeaderStyle}>C. Location Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>State:</label>
                  <select
                    style={inputStyle}
                    value={state}
                    onChange={(e) => {
                      setState(e.target.value);
                      setCity("");
                    }}
                  >
                    <option value="">Select State</option>
                    {INDIA_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>City *:</label>
                  {citiesForState.length > 0 ? (
                    <select
                      style={inputStyle}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    >
                      <option value="">Select City</option>
                      {citiesForState.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      style={inputStyle}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Enter City"
                      required
                    />
                  )}
                </div>
                <div>
                  <label style={labelStyle}>PIN Code:</label>
                  <input
                    style={inputStyle}
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="Postal PIN code"
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={labelStyle}>Latitude:</label>
                    <input
                      style={inputStyle}
                      type="number"
                      step="any"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="Lat"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Longitude:</label>
                    <input
                      style={inputStyle}
                      type="number"
                      step="any"
                      value={long}
                      onChange={(e) => setLong(e.target.value)}
                      placeholder="Long"
                    />
                  </div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={labelStyle}>Address:</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: "56px", resize: "vertical" }}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Complete store street address"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* SECTION D: VENDOR ASSIGNMENT */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <div style={sectionHeaderStyle}>D. Vendor Assignment</div>
              <div>
                <label style={labelStyle}>Assigned Vendor (Delivery Manager):</label>
                <select
                  style={inputStyle}
                  value={assignedManagerId}
                  onChange={(e) => setAssignedManagerId(e.target.value)}
                >
                  <option value="">-- No Vendor Assigned --</option>
                  {(deliveryManagers || []).map((dm) => (
                    <option key={dm.id} value={dm.id}>
                      {dm.full_name || dm.name || dm.email} (ID: {dm.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SECTION E: STORE POC */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <div style={sectionHeaderStyle}>E. Store Point of Contact (POC)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>POC Name:</label>
                  <input
                    style={inputStyle}
                    value={pocName}
                    onChange={(e) => setPocName(e.target.value)}
                    placeholder="Contact person name"
                  />
                </div>
                <div>
                  <label style={labelStyle}>POC Phone:</label>
                  <input
                    style={inputStyle}
                    value={pocPhone}
                    onChange={(e) => setPocPhone(e.target.value)}
                    placeholder="Contact phone number"
                  />
                </div>
              </div>
            </div>

            {/* SECTION F: OPERATIONAL STATUS */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                padding: "16px",
              }}
            >
              <div style={sectionHeaderStyle}>F. Operational Status</div>
              <div>
                <label style={labelStyle}>Store Status:</label>
                <select
                  style={inputStyle}
                  value={isActive ? "true" : "false"}
                  onChange={(e) => setIsActive(e.target.value === "true")}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* STICKY FOOTER ACTIONS */}
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid #E2E8F0",
              backgroundColor: "#F8FAFC",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                background: "#ffffff",
                color: "#475569",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: "10px 22px",
                borderRadius: "8px",
                border: "none",
                background: "#2563EB",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: "700",
                cursor: isLoading ? "wait" : "pointer",
              }}
            >
              {isLoading ? "Saving Changes…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
