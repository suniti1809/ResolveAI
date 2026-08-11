// App.jsx – Root application shell: navigation, stats bar, and two-pane layout
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "motion/react";
import { Toaster } from "react-hot-toast";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FilePlus2,
  Inbox,
  RefreshCw,
  Zap,
} from "lucide-react";

import { fetchComplaints, fetchStats, setFilters, updateComplaint, deleteComplaint } from "./store/complaintSlice";
import IntakePanel from "./components/IntakePanel";



// ─────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      className="flex items-center gap-4 rounded-xl glass-panel px-5 py-4 transition-all duration-300"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-[#F8FAFC] leading-tight tracking-tight">{value}</p>
        <p className="text-xs font-medium text-[#94A3B8] mt-0.5">{label}</p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Priority / Status badge
// ─────────────────────────────────────────────
const PRIORITY_COLORS = {
  low:      "bg-emerald-900/50 text-emerald-400 border-emerald-800",
  medium:   "bg-yellow-900/50 text-yellow-400 border-yellow-800",
  high:     "bg-orange-900/50 text-orange-400 border-orange-800",
  critical: "bg-red-900/50 text-red-400 border-red-800",
};

const STATUS_COLORS = {
  open:        "bg-blue-900/50 text-blue-400 border-blue-800",
  in_progress: "bg-violet-900/50 text-violet-400 border-violet-800",
  resolved:    "bg-emerald-900/50 text-emerald-400 border-emerald-800",
  closed:      "bg-slate-700/50 text-slate-400 border-slate-600",
};

function Badge({ value, map }) {
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${map[value] || "bg-slate-700 text-slate-300 border-slate-600"}`}>
      {value?.replace("_", " ")}
    </span>
  );
}

// ─────────────────────────────────────────────
// Complaint row
// ─────────────────────────────────────────────
function ComplaintRow({ complaint, onSelect, selected }) {
  const dispatch = useDispatch();
  const isSelected = selected?.id === complaint.id;

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      onClick={() => onSelect(complaint)}
      className={`border-b border-[#334155]/40 cursor-pointer transition-all duration-200
        ${isSelected
          ? "bg-blue-950/40 border-l-2 border-l-[#2563eb]"
          : "hover:bg-[#1e293b]/40 hover:border-l-2 hover:border-l-[#3b82f6] border-l-2 border-l-transparent"
        }`}
    >
      <td className="px-5 py-4 text-xs font-mono text-[#60a5fa] font-medium">{complaint.complaint_id}</td>
      <td className="px-5 py-4 text-sm text-[#F3F4F6] font-semibold">{complaint.customer_name}</td>
      <td className="px-5 py-4 text-xs text-[#94A3B8] hidden md:table-cell font-medium">{complaint.category?.replace("_", " ")}</td>
      <td className="px-5 py-4"><Badge value={complaint.priority} map={PRIORITY_COLORS} /></td>
      <td className="px-5 py-4"><Badge value={complaint.status}   map={STATUS_COLORS}   /></td>
      <td className="px-5 py-4 text-xs text-[#64748B] hidden lg:table-cell font-medium">
        {new Date(complaint.created_at).toLocaleDateString()}
      </td>
      <td className="px-5 py-4 text-right">
        <button
          id={`del-${complaint.id}`}
          onClick={(e) => { e.stopPropagation(); dispatch(deleteComplaint(complaint.id)); }}
          className="text-[#475569] hover:text-red-400 text-xs transition-colors px-2 py-1.5 rounded-lg hover:bg-red-900/20 font-medium"
        >
          Delete
        </button>
      </td>
    </motion.tr>
  );
}

// ─────────────────────────────────────────────
// Tab button
// ─────────────────────────────────────────────
function Tab({ id, icon: Icon, label, active, onClick }) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 overflow-hidden
        ${active
          ? "text-white"
          : "text-[#94A3B8] hover:text-white hover:bg-[#1e293b]/70"
        }`}
    >
      {active && (
        <motion.div
          layoutId="active-tab"
          className="absolute inset-0 bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] rounded-xl -z-10 shadow-lg shadow-blue-900/40"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <Icon size={15} className="relative z-10" />
      <span className="relative z-10">{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────
// App
// ─────────────────────────────────────────────
export default function App() {
  const dispatch  = useDispatch();
  const { items, total, stats, status } = useSelector((s) => s.complaints);

  const [activeTab,      setActiveTab]      = useState("list");
  const [selectedCmp,    setSelectedCmp]    = useState(null);
  const [statusFilter,   setStatusFilter]   = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  useEffect(() => {
    dispatch(fetchComplaints());
    dispatch(fetchStats());
  }, [dispatch]);

  useEffect(() => {
    const filters = {};
    if (statusFilter)   filters.status   = statusFilter;
    if (priorityFilter) filters.priority = priorityFilter;
    dispatch(setFilters(filters));
    dispatch(fetchComplaints({ filters }));
  }, [statusFilter, priorityFilter, dispatch]);

  const refresh = () => {
    dispatch(fetchComplaints());
    dispatch(fetchStats());
  };

  // Shared select style
  const selectCls = "rounded-lg border border-[#334155] bg-[#0F172A] text-sm font-medium " +
    "text-[#F3F4F6] px-3.5 py-2 focus:outline-none input-focus-glow cursor-pointer";

  return (
    <div className="min-h-screen text-white relative">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1e293b",
            color: "#f8fafc",
            border: "1px solid #334155",
            fontFamily: "Inter, sans-serif",
            fontSize: "13px",
          },
        }}
      />

      {/* ── Background Orbs ──────────────── */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      {/* ── Floating Header ──────────────── */}
      <div className="fixed top-0 inset-x-0 z-50 p-4 sm:p-5 pointer-events-none">
        <header className="max-w-screen-xl mx-auto glass rounded-2xl p-2 pl-5 pointer-events-auto shadow-2xl shadow-black/60">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] flex items-center justify-center shadow-lg shadow-blue-900/40">
                <Zap size={18} className="text-white" />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-[#F8FAFC]">
                Resolve<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#60a5fa] to-[#93c5fd]">AI</span>
              </span>
            </div>

            {/* Tabs */}
            <nav className="flex items-center gap-1 bg-[#0f172a]/60 p-1 rounded-2xl border border-[#334155]/50">
              <Tab id="tab-list" icon={ClipboardList} label="Complaints" active={activeTab === "list"} onClick={() => setActiveTab("list")} />
              <Tab id="tab-log"  icon={FilePlus2}    label="Log New"    active={activeTab === "log"}  onClick={() => setActiveTab("log")}  />
            </nav>
          </div>
        </header>
      </div>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 pt-28 pb-12 space-y-6 relative z-10">

        {/* ── Stat bar ───────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Inbox}         label="Total"    value={stats.total_complaints} color="bg-[#2563eb]"   />
          <StatCard icon={ClipboardList} label="Open"     value={stats.open}             color="bg-blue-600"    />
          <StatCard icon={CheckCircle2}  label="Resolved" value={stats.resolved}         color="bg-emerald-600" />
          <StatCard icon={AlertTriangle} label="Critical" value={stats.critical}         color="bg-red-600"     />
        </div>

        {/* ── Tab content ────────────────── */}
        <AnimatePresence mode="wait">

          {/* ── LIST ── */}
          {activeTab === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22 }}
              className="space-y-4"
            >
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <select
                  id="filter-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={selectCls}
                >
                  <option value="">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>

                <select
                  id="filter-priority"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className={selectCls}
                >
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>

                <button
                  id="refresh-btn"
                  onClick={refresh}
                  className="ml-auto flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-white px-3 py-2 rounded-lg hover:bg-[#1e293b] transition-colors"
                >
                  <RefreshCw size={13} className={status === "loading" ? "animate-spin" : ""} />
                  Refresh
                </button>
                <span className="text-xs text-[#64748B]">{total} complaint{total !== 1 ? "s" : ""}</span>
              </div>

              {/* Table */}
              <div className="rounded-xl glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#334155]/60 bg-[#0f172a]/50">
                        {["Ref ID", "Customer", "Category", "Priority", "Status", "Date", ""].map((h) => (
                          <th key={h} className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#64748B]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-16 text-center text-[#64748B] text-sm">
                              {status === "loading" ? "Loading…" : "No complaints found. Log one to get started!"}
                            </td>
                          </tr>
                        ) : (
                          items.map((c) => (
                            <ComplaintRow
                              key={c.id}
                              complaint={c}
                              onSelect={setSelectedCmp}
                              selected={selectedCmp}
                            />
                          ))
                        )}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detail panel */}
              <AnimatePresence>
                {selectedCmp && (
                  <motion.div
                    key="detail"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="rounded-xl glass-panel p-6 sm:p-8 overflow-hidden relative"
                  >
                    {/* Blue glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex items-start justify-between mb-6 relative z-10">
                      <div>
                        <h3 className="font-extrabold text-xl text-[#F8FAFC] tracking-tight">{selectedCmp.complaint_id}</h3>
                        <p className="text-sm font-medium text-[#60a5fa] mt-1">{selectedCmp.customer_email}</p>
                      </div>
                      <button id="close-detail" onClick={() => setSelectedCmp(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1e293b] text-[#94A3B8] hover:text-white hover:bg-[#334155] transition-colors">✕</button>
                    </div>

                    <p className="text-sm text-[#E2E8F0] leading-relaxed mb-6 font-medium relative z-10">{selectedCmp.description}</p>

                    {selectedCmp.analysis && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 relative z-10">
                        <div className="rounded-xl bg-[#0f172a]/60 border border-[#334155] p-5 space-y-3">
                          <p className="text-[11px] font-bold text-[#60a5fa] uppercase tracking-widest flex items-center gap-2">
                            <Zap size={12}/> AI Analysis
                          </p>
                          <p className="text-sm font-medium"><span className="text-[#64748B]">Sentiment:</span> <span className="text-[#F8FAFC]">{selectedCmp.analysis.sentiment}</span></p>
                          <p className="text-sm font-medium"><span className="text-[#64748B]">Urgency:</span> <span className="text-[#F8FAFC]">{selectedCmp.analysis.urgency_score}/10</span></p>
                          <p className="text-sm font-medium"><span className="text-[#64748B]">Root Cause:</span> <span className="text-[#F8FAFC]">{selectedCmp.analysis.root_cause}</span></p>
                        </div>
                        <div className="rounded-xl bg-[#0f172a]/60 border border-[#334155] p-5 space-y-3">
                          <p className="text-[11px] font-bold text-[#3b82f6] uppercase tracking-widest">Suggested Actions</p>
                          <p className="text-sm text-[#CBD5E1] leading-relaxed font-medium">{selectedCmp.analysis.suggested_action}</p>
                        </div>
                        {selectedCmp.analysis.summary && (
                          <div className="sm:col-span-2 rounded-xl bg-[#0f172a]/60 border border-[#334155] p-5">
                            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-3">Executive Summary</p>
                            <p className="text-sm text-[#CBD5E1] leading-relaxed font-medium">{selectedCmp.analysis.summary}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick status update */}
                    <div className="mt-8 flex flex-wrap gap-3 relative z-10 pt-6 border-t border-[#334155]/60">
                      {["in_progress", "resolved", "closed"].map((s) => (
                        <button
                          key={s}
                          id={`status-${s}`}
                          onClick={() => {
                            dispatch(updateComplaint({ id: selectedCmp.id, payload: { status: s } }));
                            setSelectedCmp((prev) => ({ ...prev, status: s }));
                          }}
                          className="text-sm font-semibold px-4 py-2 rounded-xl bg-[#1e293b] border border-[#334155] text-[#94A3B8] hover:border-[#2563eb] hover:text-[#60a5fa] hover:bg-blue-950/30 transition-all duration-200"
                        >
                          Mark {s.replace("_", " ")}
                        </button>
                      ))}

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── LOG (two-column split) ── */}
          {activeTab === "log" && (
            <IntakePanel key="log" complaintId={selectedCmp?.id ?? null} />
          )}

        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-6 border-t border-[#334155]/50 text-center text-xs text-[#475569] font-medium">
        ResolveAI · FastAPI &amp; LangGraph · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
