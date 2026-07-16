
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Eye, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { ToastInline } from "../../components/ui/ToastInline";
import { cn } from "../../lib/cn";

type ItemStatus = "Active" | "Inactive";
type ActiveTab = "suppliers" | "regions-markets" | "customers";
type RegionMarketTarget = "region" | "market";
type DrawerMode = "view" | "edit" | "create";
type DrawerEntity = "supplier" | "region" | "market" | "customer";

type SupplierItem = { id: string; name: string; aliases: string[]; status: ItemStatus; updatedAt: string };
type RegionItem = { id: string; code: string; label: string; status: ItemStatus; updatedAt: string };
type MarketItem = { id: string; code: string; label: string; status: ItemStatus; updatedAt: string };
type CustomerItem = { id: string; name: string; status: ItemStatus; updatedAt: string };
type DrawerState = { open: boolean; mode: DrawerMode; entity: DrawerEntity; id?: string };

const nowIso = () => new Date().toISOString();

const SUPPLIER_SEED: SupplierItem[] = [
  { id: "SUP-001", name: "TE", aliases: ["TE Connectivity", "TE-CONN"], status: "Active", updatedAt: nowIso() },
  { id: "SUP-002", name: "APTIV", aliases: ["Delphi Aptiv", "APTV"], status: "Active", updatedAt: nowIso() },
  { id: "SUP-003", name: "KOSTAL", aliases: ["Leopold Kostal", "KOSTAL Group"], status: "Active", updatedAt: nowIso() },
  { id: "SUP-004", name: "MOLEX", aliases: ["Molex LLC", "MOLX"], status: "Inactive", updatedAt: nowIso() },
];

const REGION_SEED: RegionItem[] = [
  { id: "REG-001", code: "EMEA", label: "Europe, Middle East and Africa", status: "Active", updatedAt: nowIso() },
  { id: "REG-002", code: "AMERICAS", label: "North and South America", status: "Active", updatedAt: nowIso() },
  { id: "REG-003", code: "CHINA", label: "China", status: "Active", updatedAt: nowIso() },
];

const MARKET_SEED: MarketItem[] = [
  { id: "MKT-001", code: "GLOBAL", label: "Global", status: "Active", updatedAt: nowIso() },
  { id: "MKT-002", code: "ASIA", label: "Asia", status: "Active", updatedAt: nowIso() },
  { id: "MKT-003", code: "EUROPE", label: "Europe", status: "Active", updatedAt: nowIso() },
];

const CUSTOMER_SEED: CustomerItem[] = [
  { id: "CUS-001", name: "LEONI", status: "Active", updatedAt: nowIso() },
  { id: "CUS-002", name: "VW", status: "Active", updatedAt: nowIso() },
  { id: "CUS-003", name: "BMW", status: "Active", updatedAt: nowIso() },
  { id: "CUS-004", name: "Stellantis", status: "Active", updatedAt: nowIso() },
  { id: "CUS-005", name: "Renault", status: "Inactive", updatedAt: nowIso() },
];

const fakeImportPreview = Array.from({ length: 10 }, (_, index) => ({
  row: index + 1,
  value: `sample_${index + 1}`,
  status: index % 4 === 0 ? "updated" : "new",
}));

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  return `${prefix}-${Date.now()}`;
}

const statusBadgeClass = (status: ItemStatus) =>
  status === "Active"
    ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : "border-slate-500/35 bg-slate-500/10 text-slate-700 dark:text-slate-300";

export default function AdminMasterDataPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("suppliers");
  const [search, setSearch] = useState("");
  const [lastRegionTarget, setLastRegionTarget] = useState<RegionMarketTarget>("region");

  const [suppliers, setSuppliers] = useState<SupplierItem[]>(SUPPLIER_SEED);
  const [regions, setRegions] = useState<RegionItem[]>(REGION_SEED);
  const [markets, setMarkets] = useState<MarketItem[]>(MARKET_SEED);
  const [customers, setCustomers] = useState<CustomerItem[]>(CUSTOMER_SEED);

  const [drawer, setDrawer] = useState<DrawerState>({ open: false, mode: "view", entity: "supplier" });
  const [supplierName, setSupplierName] = useState("");
  const [supplierAliases, setSupplierAliases] = useState<string[]>([]);
  const [aliasDraft, setAliasDraft] = useState("");
  const [entryCode, setEntryCode] = useState("");
  const [entryLabel, setEntryLabel] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [status, setStatus] = useState<ItemStatus>("Active");
  const [updatedAt, setUpdatedAt] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const readOnly = drawer.mode === "view";

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!drawer.open && !importOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawer((prev) => ({ ...prev, open: false }));
        setImportOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawer.open, importOpen]);

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((item) => `${item.name} ${item.aliases.join(" ")}`.toLowerCase().includes(q));
  }, [search, suppliers]);

  const filteredRegions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return regions;
    return regions.filter((item) => `${item.code} ${item.label}`.toLowerCase().includes(q));
  }, [search, regions]);

  const filteredMarkets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return markets;
    return markets.filter((item) => `${item.code} ${item.label}`.toLowerCase().includes(q));
  }, [search, markets]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((item) => item.name.toLowerCase().includes(q));
  }, [search, customers]);

  const openDrawer = (mode: DrawerMode, entity: DrawerEntity, id?: string) => {
    setDrawer({ open: true, mode, entity, id });
    setAliasDraft("");

    if (mode === "create") {
      setSupplierName("");
      setSupplierAliases([]);
      setEntryCode("");
      setEntryLabel("");
      setCustomerName("");
      setStatus("Active");
      setUpdatedAt(formatDateTime(nowIso()));
      return;
    }

    if (!id) return;

    if (entity === "supplier") {
      const item = suppliers.find((it) => it.id === id);
      if (!item) return;
      setSupplierName(item.name);
      setSupplierAliases(item.aliases);
      setStatus(item.status);
      setUpdatedAt(formatDateTime(item.updatedAt));
      return;
    }

    if (entity === "region") {
      const item = regions.find((it) => it.id === id);
      if (!item) return;
      setEntryCode(item.code);
      setEntryLabel(item.label);
      setStatus(item.status);
      setUpdatedAt(formatDateTime(item.updatedAt));
      return;
    }

    if (entity === "market") {
      const item = markets.find((it) => it.id === id);
      if (!item) return;
      setEntryCode(item.code);
      setEntryLabel(item.label);
      setStatus(item.status);
      setUpdatedAt(formatDateTime(item.updatedAt));
      return;
    }

    const item = customers.find((it) => it.id === id);
    if (!item) return;
    setCustomerName(item.name);
    setStatus(item.status);
    setUpdatedAt(formatDateTime(item.updatedAt));
  };

  const deactivateItem = (entity: DrawerEntity, id: string) => {
    if (!window.confirm("Deactivate this item?")) return;
    const ts = nowIso();
    if (entity === "supplier") setSuppliers((prev) => prev.map((item) => (item.id === id ? { ...item, status: "Inactive", updatedAt: ts } : item)));
    else if (entity === "region") setRegions((prev) => prev.map((item) => (item.id === id ? { ...item, status: "Inactive", updatedAt: ts } : item)));
    else if (entity === "market") setMarkets((prev) => prev.map((item) => (item.id === id ? { ...item, status: "Inactive", updatedAt: ts } : item)));
    else setCustomers((prev) => prev.map((item) => (item.id === id ? { ...item, status: "Inactive", updatedAt: ts } : item)));
    setToast({ type: "info", message: "Item deactivated" });
  };

  const saveDrawer = () => {
    const ts = nowIso();
    const mode = drawer.mode;

    if (drawer.entity === "supplier") {
      if (!supplierName.trim()) return;
      if (mode === "create") setSuppliers((prev) => [{ id: makeId("SUP"), name: supplierName.trim(), aliases: supplierAliases, status, updatedAt: ts }, ...prev]);
      else if (drawer.id) setSuppliers((prev) => prev.map((item) => (item.id === drawer.id ? { ...item, name: supplierName.trim(), aliases: supplierAliases, status, updatedAt: ts } : item)));
    }

    if (drawer.entity === "region") {
      if (!entryCode.trim() || !entryLabel.trim()) return;
      if (mode === "create") setRegions((prev) => [{ id: makeId("REG"), code: entryCode.trim().toUpperCase(), label: entryLabel.trim(), status, updatedAt: ts }, ...prev]);
      else if (drawer.id) setRegions((prev) => prev.map((item) => (item.id === drawer.id ? { ...item, code: entryCode.trim().toUpperCase(), label: entryLabel.trim(), status, updatedAt: ts } : item)));
    }

    if (drawer.entity === "market") {
      if (!entryCode.trim() || !entryLabel.trim()) return;
      if (mode === "create") setMarkets((prev) => [{ id: makeId("MKT"), code: entryCode.trim().toUpperCase(), label: entryLabel.trim(), status, updatedAt: ts }, ...prev]);
      else if (drawer.id) setMarkets((prev) => prev.map((item) => (item.id === drawer.id ? { ...item, code: entryCode.trim().toUpperCase(), label: entryLabel.trim(), status, updatedAt: ts } : item)));
    }

    if (drawer.entity === "customer") {
      if (!customerName.trim()) return;
      if (mode === "create") setCustomers((prev) => [{ id: makeId("CUS"), name: customerName.trim(), status, updatedAt: ts }, ...prev]);
      else if (drawer.id) setCustomers((prev) => prev.map((item) => (item.id === drawer.id ? { ...item, name: customerName.trim(), status, updatedAt: ts } : item)));
    }

    setToast({ type: "success", message: mode === "create" ? "Item created" : "Item saved" });
    setDrawer((prev) => ({ ...prev, open: false }));
  };

  const openCreateDrawer = () => {
    if (activeTab === "suppliers") return openDrawer("create", "supplier");
    if (activeTab === "customers") return openDrawer("create", "customer");
    openDrawer("create", lastRegionTarget === "region" ? "region" : "market");
  };

  const addAlias = () => {
    const alias = aliasDraft.trim();
    if (!alias || supplierAliases.some((item) => item.toLowerCase() === alias.toLowerCase())) return;
    setSupplierAliases((prev) => [...prev, alias]);
    setAliasDraft("");
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-premium">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-text">Master Data</h2>
            <p className="mt-1 text-sm text-muted">Manage reference lists used for imports and business rules.</p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
            <div className="relative min-w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search value, alias, code..."
                className="h-11 w-full rounded-xl border border-border bg-bg/80 pl-9 pr-3 text-sm text-text outline-none transition-colors placeholder:text-muted hover:border-primary/45 focus:border-primary focus:ring-2 focus:ring-ring/35"
              />
            </div>
            <button type="button" onClick={openCreateDrawer} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-[0_8px_18px_rgba(22,103,240,0.3)] transition hover:brightness-110">
              <Plus className="h-4 w-4" />
              Add item
            </button>
            <button type="button" onClick={() => setImportOpen(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-bg/70 px-4 text-sm text-text transition hover:border-primary/35">
              <Upload className="h-4 w-4" />
              Import CSV
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[{ key: "suppliers", label: "Suppliers" }, { key: "regions-markets", label: "Regions & Markets" }, { key: "customers", label: "Customers" }].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as ActiveTab)}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", activeTab === tab.key ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-bg/60 text-muted hover:border-primary/35 hover:text-text")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "suppliers" ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-premium">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-medium">Supplier</th>
                  <th className="px-3 py-2 font-medium">Aliases</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Updated</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((item) => (
                  <tr key={item.id} className="cursor-pointer border-b border-border/70 transition-colors hover:bg-primary/5 last:border-b-0" onClick={() => openDrawer("view", "supplier", item.id)}>
                    <td className="px-3 py-2 text-text">{item.name}</td>
                    <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{item.aliases.slice(0, 3).map((alias) => (<span key={alias} className="rounded-full border border-border bg-bg/60 px-2 py-0.5 text-xs text-muted">{alias}</span>))}{item.aliases.length > 3 ? (<span className="rounded-full border border-border bg-bg/60 px-2 py-0.5 text-xs text-muted">+{item.aliases.length - 3}</span>) : null}</div></td>
                    <td className="px-3 py-2"><span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", statusBadgeClass(item.status))}>{item.status}</span></td>
                    <td className="px-3 py-2 text-text">{formatDateTime(item.updatedAt)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" title="View" aria-label="View supplier" onClick={(event) => { event.stopPropagation(); openDrawer("view", "supplier", item.id); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition hover:border-primary/35 hover:bg-primary/10 hover:text-text"><Eye className="h-4 w-4" /></button>
                        <button type="button" title="Edit" aria-label="Edit supplier" onClick={(event) => { event.stopPropagation(); openDrawer("edit", "supplier", item.id); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition hover:border-primary/35 hover:bg-primary/10 hover:text-text"><Pencil className="h-4 w-4" /></button>
                        <button type="button" title="Deactivate" aria-label="Deactivate supplier" onClick={(event) => { event.stopPropagation(); deactivateItem("supplier", item.id); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/30 text-rose-400 transition hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === "regions-markets" ? (
        <section className="space-y-3">
          <div className="inline-flex rounded-xl border border-border bg-bg/60 p-1">
            <button type="button" onClick={() => setLastRegionTarget("region")} className={cn("rounded-lg px-3 py-1 text-xs font-medium transition-colors", lastRegionTarget === "region" ? "bg-primary/12 text-primary" : "text-muted hover:text-text")}>Regions</button>
            <button type="button" onClick={() => setLastRegionTarget("market")} className={cn("rounded-lg px-3 py-1 text-xs font-medium transition-colors", lastRegionTarget === "market" ? "bg-primary/12 text-primary" : "text-muted hover:text-text")}>Markets</button>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-premium">
              <div className="border-b border-border px-3 py-2"><h3 className="text-sm font-semibold text-text">Regions</h3></div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted"><th className="px-3 py-2 font-medium">Code</th><th className="px-3 py-2 font-medium">Label</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Updated</th><th className="px-3 py-2 text-right font-medium">Actions</th></tr></thead>
                  <tbody>{filteredRegions.map((item) => (<tr key={item.id} className="cursor-pointer border-b border-border/70 transition-colors hover:bg-primary/5 last:border-b-0" onClick={() => { setLastRegionTarget("region"); openDrawer("view", "region", item.id); }}><td className="px-3 py-2 text-text">{item.code}</td><td className="px-3 py-2 text-text">{item.label}</td><td className="px-3 py-2"><span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", statusBadgeClass(item.status))}>{item.status}</span></td><td className="px-3 py-2 text-text">{formatDateTime(item.updatedAt)}</td><td className="px-3 py-2"><div className="flex items-center justify-end gap-1"><button type="button" title="View" aria-label="View region" onClick={(event) => { event.stopPropagation(); setLastRegionTarget("region"); openDrawer("view", "region", item.id); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition hover:border-primary/35 hover:bg-primary/10 hover:text-text"><Eye className="h-4 w-4" /></button><button type="button" title="Edit" aria-label="Edit region" onClick={(event) => { event.stopPropagation(); setLastRegionTarget("region"); openDrawer("edit", "region", item.id); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition hover:border-primary/35 hover:bg-primary/10 hover:text-text"><Pencil className="h-4 w-4" /></button><button type="button" title="Deactivate" aria-label="Deactivate region" onClick={(event) => { event.stopPropagation(); deactivateItem("region", item.id); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/30 text-rose-400 transition hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button></div></td></tr>))}</tbody>
                </table>
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-premium">
              <div className="border-b border-border px-3 py-2"><h3 className="text-sm font-semibold text-text">Usage markets</h3></div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted"><th className="px-3 py-2 font-medium">Code</th><th className="px-3 py-2 font-medium">Label</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Updated</th><th className="px-3 py-2 text-right font-medium">Actions</th></tr></thead>
                  <tbody>{filteredMarkets.map((item) => (<tr key={item.id} className="cursor-pointer border-b border-border/70 transition-colors hover:bg-primary/5 last:border-b-0" onClick={() => { setLastRegionTarget("market"); openDrawer("view", "market", item.id); }}><td className="px-3 py-2 text-text">{item.code}</td><td className="px-3 py-2 text-text">{item.label}</td><td className="px-3 py-2"><span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", statusBadgeClass(item.status))}>{item.status}</span></td><td className="px-3 py-2 text-text">{formatDateTime(item.updatedAt)}</td><td className="px-3 py-2"><div className="flex items-center justify-end gap-1"><button type="button" title="View" aria-label="View market" onClick={(event) => { event.stopPropagation(); setLastRegionTarget("market"); openDrawer("view", "market", item.id); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition hover:border-primary/35 hover:bg-primary/10 hover:text-text"><Eye className="h-4 w-4" /></button><button type="button" title="Edit" aria-label="Edit market" onClick={(event) => { event.stopPropagation(); setLastRegionTarget("market"); openDrawer("edit", "market", item.id); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition hover:border-primary/35 hover:bg-primary/10 hover:text-text"><Pencil className="h-4 w-4" /></button><button type="button" title="Deactivate" aria-label="Deactivate market" onClick={(event) => { event.stopPropagation(); deactivateItem("market", item.id); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/30 text-rose-400 transition hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button></div></td></tr>))}</tbody>
                </table>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {activeTab === "customers" ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-premium">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted"><th className="px-3 py-2 font-medium">Customer</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Updated</th><th className="px-3 py-2 text-right font-medium">Actions</th></tr></thead>
              <tbody>{filteredCustomers.map((item) => (<tr key={item.id} className="cursor-pointer border-b border-border/70 transition-colors hover:bg-primary/5 last:border-b-0" onClick={() => openDrawer("view", "customer", item.id)}><td className="px-3 py-2 text-text">{item.name}</td><td className="px-3 py-2"><span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", statusBadgeClass(item.status))}>{item.status}</span></td><td className="px-3 py-2 text-text">{formatDateTime(item.updatedAt)}</td><td className="px-3 py-2"><div className="flex items-center justify-end gap-1"><button type="button" title="View" aria-label="View customer" onClick={(event) => { event.stopPropagation(); openDrawer("view", "customer", item.id); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition hover:border-primary/35 hover:bg-primary/10 hover:text-text"><Eye className="h-4 w-4" /></button><button type="button" title="Edit" aria-label="Edit customer" onClick={(event) => { event.stopPropagation(); openDrawer("edit", "customer", item.id); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition hover:border-primary/35 hover:bg-primary/10 hover:text-text"><Pencil className="h-4 w-4" /></button><button type="button" title="Deactivate" aria-label="Deactivate customer" onClick={(event) => { event.stopPropagation(); deactivateItem("customer", item.id); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/30 text-rose-400 transition hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button></div></td></tr>))}</tbody>
            </table>
          </div>
        </section>
      ) : null}

      <AnimatePresence>
        {toast ? (<div className="fixed bottom-5 right-5 z-50 w-[min(360px,calc(100vw-2rem))]"><ToastInline type={toast.type} message={toast.message} /></div>) : null}
      </AnimatePresence>

      {drawer.open ? (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Close details drawer" onClick={() => setDrawer((prev) => ({ ...prev, open: false }))} className="absolute inset-0 bg-slate-950/45" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-border bg-surface shadow-panel">
            <div className="flex items-start justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="text-lg font-semibold text-text">{drawer.entity === "supplier" ? "Supplier details" : drawer.entity === "region" ? "Region details" : drawer.entity === "market" ? "Market details" : "Customer details"}</h3>
                <p className="text-xs text-muted capitalize">{drawer.mode} mode</p>
              </div>
              <button type="button" onClick={() => setDrawer((prev) => ({ ...prev, open: false }))} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition hover:border-primary/35 hover:bg-primary/10 hover:text-text"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {drawer.entity === "supplier" ? (<><div className="space-y-2"><label className="block text-sm font-medium text-text">Name</label><input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} readOnly={readOnly} className={cn("h-11 w-full rounded-xl border border-border bg-bg/80 px-3 text-sm text-text outline-none", !readOnly && "hover:border-primary/45 focus:border-primary focus:ring-2 focus:ring-ring/35", readOnly && "cursor-default opacity-90")} /></div><div className="space-y-2"><label className="block text-sm font-medium text-text">Aliases</label><div className="flex flex-wrap gap-1.5">{supplierAliases.map((alias) => (<span key={alias} className="inline-flex items-center gap-1 rounded-full border border-border bg-bg/60 px-2 py-0.5 text-xs text-muted">{alias}{!readOnly ? (<button type="button" onClick={() => setSupplierAliases((prev) => prev.filter((item) => item !== alias))} className="text-muted hover:text-text"><X className="h-3 w-3" /></button>) : null}</span>))}</div>{!readOnly ? (<div className="flex items-center gap-2"><input value={aliasDraft} onChange={(event) => setAliasDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addAlias(); } }} placeholder="Add alias and press Enter" className="h-10 w-full rounded-xl border border-border bg-bg/80 px-3 text-sm text-text outline-none transition-colors placeholder:text-muted hover:border-primary/45 focus:border-primary focus:ring-2 focus:ring-ring/35" /><button type="button" onClick={addAlias} className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-bg/70 px-3 text-sm text-text hover:border-primary/35">Add</button></div>) : null}</div></>) : null}
              {drawer.entity === "region" || drawer.entity === "market" ? (<><div className="space-y-2"><label className="block text-sm font-medium text-text">Code</label><input value={entryCode} onChange={(event) => setEntryCode(event.target.value)} readOnly={readOnly} className={cn("h-11 w-full rounded-xl border border-border bg-bg/80 px-3 text-sm text-text outline-none", !readOnly && "hover:border-primary/45 focus:border-primary focus:ring-2 focus:ring-ring/35", readOnly && "cursor-default opacity-90")} /></div><div className="space-y-2"><label className="block text-sm font-medium text-text">Label</label><input value={entryLabel} onChange={(event) => setEntryLabel(event.target.value)} readOnly={readOnly} className={cn("h-11 w-full rounded-xl border border-border bg-bg/80 px-3 text-sm text-text outline-none", !readOnly && "hover:border-primary/45 focus:border-primary focus:ring-2 focus:ring-ring/35", readOnly && "cursor-default opacity-90")} /></div></>) : null}
              {drawer.entity === "customer" ? (<div className="space-y-2"><label className="block text-sm font-medium text-text">Name</label><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} readOnly={readOnly} className={cn("h-11 w-full rounded-xl border border-border bg-bg/80 px-3 text-sm text-text outline-none", !readOnly && "hover:border-primary/45 focus:border-primary focus:ring-2 focus:ring-ring/35", readOnly && "cursor-default opacity-90")} /></div>) : null}
              <div className="space-y-2"><label className="block text-sm font-medium text-text">Status</label><button type="button" disabled={readOnly} onClick={() => setStatus((prev) => (prev === "Active" ? "Inactive" : "Active"))} className={cn("inline-flex h-10 items-center rounded-xl border px-3 text-sm", status === "Active" ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-slate-500/35 bg-slate-500/10 text-slate-700 dark:text-slate-300", readOnly && "cursor-default opacity-90")}>{status}</button></div>
              <div className="space-y-2"><label className="block text-sm font-medium text-text">Updated at</label><input value={updatedAt} readOnly className="h-11 w-full rounded-xl border border-border bg-bg/70 px-3 text-sm text-muted" /></div>
            </div>

            <div className="sticky bottom-0 flex items-center justify-between border-t border-border bg-surface px-4 py-3">
              <button type="button" onClick={() => setDrawer((prev) => ({ ...prev, open: false }))} className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-bg/70 px-4 text-sm text-text transition hover:border-primary/35">{readOnly ? "Close" : "Cancel"}</button>
              {!readOnly ? (<button type="button" onClick={saveDrawer} className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-white shadow-[0_8px_18px_rgba(22,103,240,0.3)] transition hover:brightness-110">Save</button>) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {importOpen ? (
        <div className="fixed inset-0 z-50">
          <button type="button" onClick={() => setImportOpen(false)} className="absolute inset-0 bg-slate-950/45" aria-label="Close import modal" />
          <div className="absolute left-1/2 top-1/2 w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-4 shadow-panel">
            <div className="flex items-start justify-between">
              <div><h3 className="text-lg font-semibold text-text">Import CSV</h3><p className="text-sm text-muted">Upload a CSV to bulk add items (mock).</p></div>
              <button type="button" onClick={() => setImportOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition hover:border-primary/35 hover:bg-primary/10 hover:text-text"><X className="h-4 w-4" /></button>
            </div>

            <label className="mt-3 flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg/45 text-sm text-muted hover:border-primary/40">
              <Upload className="mb-1 h-4 w-4" />
              {selectedFile ? selectedFile.name : "Choose CSV file"}
              <input type="file" accept=".csv" className="hidden" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
            </label>

            {selectedFile ? (<div className="mt-3 rounded-xl border border-border bg-bg/45 p-3"><p className="mb-2 text-xs uppercase tracking-wide text-muted">Preview (mock)</p><div className="max-h-40 overflow-auto"><table className="min-w-full text-xs"><thead><tr className="border-b border-border text-left text-muted"><th className="px-2 py-1 font-medium">Row</th><th className="px-2 py-1 font-medium">Value</th><th className="px-2 py-1 font-medium">Result</th></tr></thead><tbody>{fakeImportPreview.map((row) => (<tr key={row.row} className="border-b border-border/60 last:border-b-0"><td className="px-2 py-1 text-text">{row.row}</td><td className="px-2 py-1 text-text">{row.value}</td><td className="px-2 py-1 text-muted">{row.status}</td></tr>))}</tbody></table></div></div>) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setImportOpen(false)} className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-bg/70 px-4 text-sm text-text transition hover:border-primary/35">Cancel</button>
              <button type="button" disabled={!selectedFile} onClick={() => { setImportOpen(false); setSelectedFile(null); setToast({ type: "success", message: "CSV imported (mock)" }); }} className={cn("inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium text-white transition", selectedFile ? "bg-primary shadow-[0_8px_18px_rgba(22,103,240,0.3)] hover:brightness-110" : "cursor-not-allowed bg-primary/45")}>Apply</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
