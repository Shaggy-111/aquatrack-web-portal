import { useEffect, useState } from "react";
import service from "../services/storeReimbursementService";

const emptyFilters = () => ({ region: "", channel: "", state: "", city: "" });
const emptyMetadata = () => ({ regions: [], channels: [], states: [], cities: [] });
const message = (error, fallback) => typeof error?.response?.data?.detail === "string" ? error.response.data.detail : fallback;

// One controller per Reimbursement page, shared by its filter and create pickers.
export default function useReimbursementStoreSelector(enabled) {
  const [filters, setFilters] = useState(emptyFilters);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [metadata, setMetadata] = useState(emptyMetadata);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState("");
  const [metadataRetry, setMetadataRetry] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setMetadataLoading(true); setMetadataError(""); setMetadata(emptyMetadata());
    service.getStoreSelectorFilters({ region: filters.region, channel: filters.channel, state: filters.state })
      .then((result) => { if (active) setMetadata(result); })
      .catch((failure) => { if (active) setMetadataError(message(failure, "Unable to load Store filters.")); })
      .finally(() => { if (active) setMetadataLoading(false); });
    return () => { active = false; };
  }, [enabled, filters.region, filters.channel, filters.state, metadataRetry]);

  useEffect(() => {
    if (!enabled) return;
    // Invalidate an old response immediately while the new search is being debounced.
    let active = true;
    setLoading(true); setError("");
    if (search.trim() !== debouncedSearch) return () => { active = false; };
    service.getStoreSelector({ ...filters, search: debouncedSearch, page, page_size: 20 })
      .then((result) => {
        if (!active) return;
        setItems((previous) => [...new Map([...(page === 1 ? [] : previous), ...result.items].map((store) => [String(store.id), store])).values()]);
        setHasMore(Boolean(result.has_more));
      })
      .catch((failure) => { if (active) setError(message(failure, "Unable to load Stores. Please retry.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [enabled, filters, search, debouncedSearch, page, retry]);

  const resetResults = () => { setPage(1); setItems([]); setHasMore(false); };
  const changeFilter = (key, value) => {
    setFilters((current) => ({
      ...current, [key]: value,
      ...(key === "region" ? { channel: "", state: "", city: "" } : {}),
      ...(key === "channel" ? { state: "", city: "" } : {}),
      ...(key === "state" ? { city: "" } : {}),
    }));
    resetResults();
  };
  return {
    filters, search, items, page, hasMore, loading, error, metadata, metadataLoading, metadataError,
    changeFilter,
    changeSearch: (value) => { setSearch(value); resetResults(); },
    loadMore: () => { if (!loading && !error && hasMore) setPage((current) => current + 1); },
    retryResults: () => setRetry((current) => current + 1),
    retryMetadata: () => setMetadataRetry((current) => current + 1),
    clear: () => { setFilters(emptyFilters()); setSearch(""); setDebouncedSearch(""); resetResults(); },
  };
}
