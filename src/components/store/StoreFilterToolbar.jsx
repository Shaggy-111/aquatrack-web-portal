import React, { useMemo } from "react";
import { INDIA_STATES, getCitiesForState } from "../../constants/indiaLocations";

const CANONICAL_REGIONS = ["NORTH", "SOUTH", "EAST", "WEST", "CENTRAL"];
const CANONICAL_CHANNELS = ["BLINKIT", "ZEPTO", "IBM", "GENERAL", "CUSTOM"];
const CANONICAL_ENTITIES = ["AMB", "BCPL", "BCPL-DS", "BFL", "BISTRO", "ZHPL", "ZEPTO"];

export default function StoreFilterToolbar({
  searchTerm,
  onSearchChange,
  regionFilter,
  onRegionChange,
  channelFilter,
  onChannelChange,
  entityFilter,
  onEntityChange,
  stateFilter,
  onStateChange,
  cityFilter,
  onCityChange,
  vendorFilter,
  onVendorChange,
  statusFilter,
  onStatusChange,
  vendors = [],
  totalCount = 0,
  filteredCount = 0,
  onClearAll,
}) {
  // Cascaded cities based on selected state
  const availableCities = useMemo(() => {
    if (!stateFilter || stateFilter === "ALL") return [];
    return getCitiesForState(stateFilter) || [];
  }, [stateFilter]);

  // Compute active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm && searchTerm.trim()) count += 1;
    if (regionFilter && regionFilter !== "ALL") count += 1;
    if (channelFilter && channelFilter !== "ALL") count += 1;
    if (entityFilter && entityFilter !== "ALL") count += 1;
    if (stateFilter && stateFilter !== "ALL") count += 1;
    if (cityFilter && cityFilter !== "ALL") count += 1;
    if (vendorFilter && vendorFilter !== "ALL") count += 1;
    if (statusFilter && statusFilter !== "ALL") count += 1;
    return count;
  }, [
    searchTerm,
    regionFilter,
    channelFilter,
    entityFilter,
    stateFilter,
    cityFilter,
    vendorFilter,
    statusFilter,
  ]);

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #E2E8F0",
        borderRadius: "12px",
        padding: "16px 20px",
        marginBottom: "20px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "14px", fontWeight: "700", color: "#1E293B" }}>
            Filters
          </span>
          {activeFilterCount > 0 && (
            <span
              style={{
                backgroundColor: "#EFF6FF",
                color: "#2563EB",
                fontSize: "12px",
                fontWeight: "700",
                padding: "2px 8px",
                borderRadius: "12px",
                border: "1px solid #DBEAFE",
              }}
            >
              {activeFilterCount} active
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "13px", color: "#64748B" }}>
            Showing <strong>{filteredCount}</strong> of <strong>{totalCount}</strong> stores
          </span>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              style={{
                background: "none",
                border: "none",
                color: "#DC2626",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "4px",
              }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* FILTER CONTROLS GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          alignItems: "flex-end",
        }}
      >
        {/* Search */}
        <div style={{ gridColumn: "span 2", minWidth: "240px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
            Search Stores
          </label>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by ID, name, project code, city, POC..."
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #CBD5E1",
              borderRadius: "8px",
              fontSize: "13px",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Region */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
            Region
          </label>
          <select
            value={regionFilter}
            onChange={(e) => onRegionChange(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #CBD5E1",
              borderRadius: "8px",
              fontSize: "13px",
              boxSizing: "border-box",
              backgroundColor: "#fff",
            }}
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
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
            Channel
          </label>
          <select
            value={channelFilter}
            onChange={(e) => onChannelChange(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #CBD5E1",
              borderRadius: "8px",
              fontSize: "13px",
              boxSizing: "border-box",
              backgroundColor: "#fff",
            }}
          >
            <option value="ALL">All Channels</option>
            {CANONICAL_CHANNELS.map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>
        </div>

        {/* Entity */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
            Entity
          </label>
          <select
            value={entityFilter}
            onChange={(e) => onEntityChange(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #CBD5E1",
              borderRadius: "8px",
              fontSize: "13px",
              boxSizing: "border-box",
              backgroundColor: "#fff",
            }}
          >
            <option value="ALL">All Entities</option>
            {CANONICAL_ENTITIES.map((ent) => (
              <option key={ent} value={ent}>
                {ent}
              </option>
            ))}
          </select>
        </div>

        {/* State */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
            State
          </label>
          <select
            value={stateFilter}
            onChange={(e) => {
              onStateChange(e.target.value);
              onCityChange("ALL");
            }}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #CBD5E1",
              borderRadius: "8px",
              fontSize: "13px",
              boxSizing: "border-box",
              backgroundColor: "#fff",
            }}
          >
            <option value="ALL">All States</option>
            {INDIA_STATES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* City (Cascaded from State) */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
            City
          </label>
          <select
            value={cityFilter}
            onChange={(e) => onCityChange(e.target.value)}
            disabled={!stateFilter || stateFilter === "ALL"}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #CBD5E1",
              borderRadius: "8px",
              fontSize: "13px",
              boxSizing: "border-box",
              backgroundColor: !stateFilter || stateFilter === "ALL" ? "#F1F5F9" : "#fff",
              cursor: !stateFilter || stateFilter === "ALL" ? "not-allowed" : "pointer",
            }}
          >
            <option value="ALL">{stateFilter && stateFilter !== "ALL" ? "All Cities" : "Select State First"}</option>
            {availableCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Vendor / Delivery Manager */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
            Vendor (Manager)
          </label>
          <select
            value={vendorFilter}
            onChange={(e) => onVendorChange(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #CBD5E1",
              borderRadius: "8px",
              fontSize: "13px",
              boxSizing: "border-box",
              backgroundColor: "#fff",
            }}
          >
            <option value="ALL">All Vendors</option>
            {vendors.map((v) => {
              const id = typeof v === "object" ? v.id : v;
              const name = typeof v === "object" ? (v.full_name || v.name || v.email) : v;
              return (
                <option key={id} value={String(id)}>
                  {name}
                </option>
              );
            })}
          </select>
        </div>

        {/* Status */}
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #CBD5E1",
              borderRadius: "8px",
              fontSize: "13px",
              boxSizing: "border-box",
              backgroundColor: "#fff",
            }}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>
    </div>
  );
}
