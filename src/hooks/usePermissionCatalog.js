import { useEffect, useSyncExternalStore } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";

const CATALOG_URL = `${API_BASE_URL}/permissions/catalog`;
const CATALOG_PAGE_SIZE = 100;

const getToken = () =>
  localStorage.getItem("auth_token") ||
  localStorage.getItem("userToken") ||
  localStorage.getItem("partner_token");

const catalogPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const field of ["permissions", "items", "catalog"]) {
    if (Array.isArray(payload[field])) return payload[field];
  }
  return catalogPayload(payload.data);
};

const paginationValue = (payload, ...fields) => {
  const sources = [payload, payload?.pagination, !Array.isArray(payload?.data) ? payload?.data : null, payload?.data?.pagination];
  for (const source of sources) {
    for (const field of fields) {
      if (source?.[field] !== undefined && source?.[field] !== null) return source[field];
    }
  }
  return undefined;
};

const normalizePermission = (permission) => {
  const id = Number(permission?.id ?? permission?.permission_id);
  const key = permission?.permission_key || permission?.key || permission?.code || permission?.name || permission?.permission || "";
  const [keyModule, ...keyAction] = String(key).split(".");
  const module = permission?.module || keyModule;
  const action = permission?.action || keyAction.join(".");
  if (!Number.isInteger(id) || !module || !action) return null;
  return { ...permission, id, key: String(key), module: String(module), action: String(action) };
};

const groupCatalog = (catalog) => {
  const groups = new Map();
  catalog.forEach((permission) => {
    const entries = groups.get(permission.module) || [];
    entries.push(permission);
    groups.set(permission.module, entries);
  });
  return [...groups.entries()].map(([module, permissions]) => ({ module, permissions }));
};

const loadAllCatalogPages = async (token) => {
  const catalog = [];
  const seen = new Set();
  let page = 1;

  while (page <= 1000) {
    const response = await axios.get(CATALOG_URL, {
      headers: { Authorization: `Bearer ${token}` },
      params: { page, page_size: CATALOG_PAGE_SIZE },
    });
    const payload = response.data;
    const pageItems = catalogPayload(payload);
    let added = 0;
    pageItems.forEach((permission) => {
      const identity = String(permission?.permission_id ?? permission?.id ?? permission?.permission_key ?? permission?.key ?? "");
      if (!identity || seen.has(identity)) return;
      seen.add(identity);
      catalog.push(permission);
      added += 1;
    });

    const responsePage = Number(paginationValue(payload, "page", "current_page")) || page;
    const totalPages = Number(paginationValue(payload, "total_pages", "pages"));
    const total = Number(paginationValue(payload, "total", "total_count", "count"));
    const responsePageSize = Number(paginationValue(payload, "page_size", "limit")) || CATALOG_PAGE_SIZE;
    const nextPage = Number(paginationValue(payload, "next_page"));
    const hasNext = paginationValue(payload, "has_next", "has_more");

    if (!pageItems.length || !added) break;
    if (Number.isInteger(nextPage) && nextPage > responsePage) page = nextPage;
    else if (Number.isFinite(totalPages) && responsePage < totalPages) page = responsePage + 1;
    else if (Number.isFinite(total) && catalog.length < total) page = responsePage + 1;
    else if (hasNext === true) page = responsePage + 1;
    else if (!Number.isFinite(totalPages) && !Number.isFinite(total) && pageItems.length >= responsePageSize) page = responsePage + 1;
    else break;
  }

  return catalog.map(normalizePermission).filter(Boolean);
};

let snapshot = { token: null, catalog: [], groups: [], loading: false, loaded: false, error: null };
let requestPromise = null;
const listeners = new Set();

const emit = (next) => {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => snapshot;

const loadCatalog = ({ force = false } = {}) => {
  const token = getToken();
  if (!token) {
    emit({ token: null, catalog: [], groups: [], loading: false, loaded: true, error: null });
    return Promise.resolve([]);
  }
  if (snapshot.token !== token) {
    requestPromise = null;
    emit({ token, catalog: [], groups: [], loading: false, loaded: false, error: null });
  }
  if (!force && snapshot.loaded) return Promise.resolve(snapshot.catalog);
  if (!force && requestPromise) return requestPromise;

  emit({ loading: true, error: null });
  requestPromise = loadAllCatalogPages(token)
    .then((catalog) => {
      emit({ catalog, groups: groupCatalog(catalog), loaded: true, error: null });
      return catalog;
    })
    .catch((error) => {
      emit({ catalog: [], groups: [], loaded: true, error });
      return [];
    })
    .finally(() => {
      requestPromise = null;
      emit({ loading: false });
    });
  return requestPromise;
};

export const refreshPermissionCatalog = () => loadCatalog({ force: true });
export const clearPermissionCatalogCache = () => {
  requestPromise = null;
  emit({ token: null, catalog: [], groups: [], loading: false, loaded: false, error: null });
};

export default function usePermissionCatalog() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    loadCatalog();
  }, []);
  return {
    catalog: state.catalog,
    groups: state.groups,
    loading: state.loading || !state.loaded,
    error: state.error,
    refreshPermissionCatalog,
  };
}
