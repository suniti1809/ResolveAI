// LogForm.jsx – Complaint intake form with 4-section dark-mode design
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "motion/react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Package,
  Send,
  ShieldAlert,
  User,
} from "lucide-react";

import { createComplaint, resetCreateStatus } from "../store/complaintSlice";

// ─────────────────────────────────────────────
// Field data
// ─────────────────────────────────────────────
const CATEGORIES = [
  { value: "product_quality",  label: "Product Quality" },
  { value: "delivery",         label: "Delivery" },
  { value: "customer_service", label: "Customer Service" },
  { value: "billing",          label: "Billing" },
  { value: "technical",        label: "Technical" },
  { value: "other",            label: "Other" },
];

const PRIORITIES = [
  { value: "low",      label: "Low" },
  { value: "medium",   label: "Medium" },
  { value: "high",     label: "High" },
  { value: "critical", label: "Critical" },
];

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
function FieldWrapper({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-[#64748B]">
        {label}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.span
            key="err"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 text-xs text-red-400 mt-0.5"
          >
            <AlertCircle size={11} /> {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

// Dark-mode input styles per design spec
const inputCls =
  "w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3.5 py-2.5 text-sm font-medium " +
  "text-[#F8FAFC] placeholder-[#64748B] " +
  "focus:outline-none input-focus-glow transition-all duration-200 " +
  "hover:border-[#475569]";

// Section card header
function SectionHeader({ number, icon: Icon, title }) {
  return (
    <div className="section-card-header">
      <span className="section-card-number">{number}</span>
      <Icon size={12} />
      <span>{title}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function LogForm() {
  const dispatch     = useDispatch();
  const createStatus = useSelector((s) => s.complaints.createStatus);
  const error        = useSelector((s) => s.complaints.error);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { category: "other", priority: "medium" } });

  const isLoading = createStatus === "loading";

  useEffect(() => {
    if (createStatus === "succeeded") {
      toast.success("Complaint logged! AI analysis running…", { icon: "🤖" });
      reset();
      dispatch(resetCreateStatus());
    }
    if (createStatus === "failed") {
      toast.error(error || "Failed to submit complaint.");
      dispatch(resetCreateStatus());
    }
  }, [createStatus, error, dispatch, reset]);

  const onSubmit = async (data) => {
    dispatch(createComplaint(data));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full"
    >
      {/* ── Card ──────────────────────────────────── */}
      <div className="relative rounded-xl glass-panel shadow-2xl overflow-hidden">
        {/* Electric-blue top stripe */}
        <div className="h-1 w-full bg-gradient-to-r from-[#1d4ed8] via-[#3b82f6] to-[#60a5fa]" />

        <div className="p-5 space-y-5">

          {/* ── Header ──────────────────────────── */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#F8FAFC] tracking-tight">
                Complaint Intake Form
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                AI-powered · Auto-extraction on submit
              </p>
            </div>
            {/* Pending Triage badge */}
            <span className="badge-pending">Pending Triage</span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* ── Section 1: Origin & Customer ──── */}
            <div className="section-card">
              <SectionHeader number="1" icon={User} title="Origin & Customer" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldWrapper label="Customer Name" error={errors.customer_name?.message}>
                  <input
                    id="lf-customer-name"
                    className={inputCls}
                    placeholder="Jane Smith"
                    {...register("customer_name", {
                      required: "Name is required",
                      minLength: { value: 2, message: "At least 2 characters" },
                    })}
                  />
                </FieldWrapper>

                <FieldWrapper label="Email Address" error={errors.customer_email?.message}>
                  <input
                    id="lf-customer-email"
                    type="email"
                    className={inputCls}
                    placeholder="jane@example.com"
                    {...register("customer_email", {
                      required: "Email is required",
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" },
                    })}
                  />
                </FieldWrapper>

                <FieldWrapper label="Phone (optional)" error={errors.customer_phone?.message}>
                  <input
                    id="lf-customer-phone"
                    className={inputCls}
                    placeholder="+1 555-0100"
                    {...register("customer_phone")}
                  />
                </FieldWrapper>

                <FieldWrapper label="Site / Origin" error={errors.origin_site?.message}>
                  <input
                    id="lf-origin-site"
                    className={inputCls}
                    placeholder="Plant A — Line 3"
                    {...register("origin_site")}
                  />
                </FieldWrapper>
              </div>
            </div>

            {/* ── Section 2: Product & Batch ──────── */}
            <div className="section-card">
              <SectionHeader number="2" icon={Package} title="Product & Batch" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldWrapper label="Product / Service" error={errors.product_name?.message}>
                  <input
                    id="lf-product-name"
                    className={inputCls}
                    placeholder="ResolveAI Pro Suite"
                    {...register("product_name")}
                  />
                </FieldWrapper>

                <FieldWrapper label="Batch / Lot Number" error={errors.batch_number?.message}>
                  <input
                    id="lf-batch-number"
                    className={inputCls}
                    placeholder="LOT-2024-0089"
                    {...register("batch_number")}
                  />
                </FieldWrapper>

                <FieldWrapper label="Category" error={errors.category?.message}>
                  <select
                    id="lf-category"
                    className={inputCls + " cursor-pointer"}
                    {...register("category")}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </FieldWrapper>
              </div>
            </div>

            {/* ── Section 3: Complaint Details ───── */}
            <div className="section-card">
              <SectionHeader number="3" icon={AlertCircle} title="Complaint Details" />
              <FieldWrapper label="Complaint Description" error={errors.description?.message}>
                <textarea
                  id="lf-description"
                  rows={4}
                  className={inputCls + " resize-none"}
                  placeholder="Describe the complaint in detail — what happened, when, and the impact…"
                  {...register("description", {
                    required: "Description is required",
                    minLength: { value: 10, message: "At least 10 characters" },
                  })}
                />
              </FieldWrapper>
            </div>

            {/* ── Section 4: Initial Assessment ──── */}
            <div className="section-card">
              <SectionHeader number="4" icon={ShieldAlert} title="Initial Assessment" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldWrapper label="Priority" error={errors.priority?.message}>
                  <select
                    id="lf-priority"
                    className={inputCls + " cursor-pointer"}
                    {...register("priority")}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </FieldWrapper>

                <FieldWrapper label="Detection Date" error={errors.detection_date?.message}>
                  <input
                    id="lf-detection-date"
                    type="date"
                    className={inputCls + " [color-scheme:dark]"}
                    {...register("detection_date")}
                  />
                </FieldWrapper>
              </div>

              {/* File support hint */}
              <div className="file-support-box mt-4">
                <strong>📎 File Attachments Supported</strong> — Upload supporting evidence
                (photos, logs, reports) via the AI Assistant panel. Accepted formats: PDF, PNG,
                JPG, DOCX, CSV.
              </div>
            </div>

            {/* ── Submit ──────────────────────── */}
            <motion.button
              id="lf-submit-btn"
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.01 }}
              whileTap={{ scale: isLoading ? 1 : 0.99 }}
              className={`
                w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3
                font-semibold text-sm text-white transition-all duration-300 tracking-wide
                ${isLoading
                  ? "bg-[#1e293b] cursor-not-allowed opacity-60 border border-[#334155]"
                  : "bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] hover:from-[#2563eb] hover:to-[#3b82f6] shadow-lg shadow-blue-900/30 hover:shadow-blue-700/40 hover:-translate-y-0.5"
                }
              `}
            >
              {isLoading ? (
                <><Loader2 size={15} className="animate-spin" /> Submitting &amp; Analysing…</>
              ) : (
                <><Send size={15} /> Submit Complaint</>
              )}
            </motion.button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
