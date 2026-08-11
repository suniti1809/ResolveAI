// AIAssistant.jsx – AI Complaint Intake Assistant panel (dark-mode redesign)
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bot,
  FileUp,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  Upload,
  User,
  X,
} from "lucide-react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const api      = axios.create({ baseURL: BASE_URL });



// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ─────────────────────────────────────────────
// Message Bubble
// ─────────────────────────────────────────────
function Bubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md
          ${isUser
            ? "bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white"
            : "bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] text-white"
          }
        `}
      >
        {isUser ? <User size={13} /> : <Bot size={13} />}
      </div>

      {/* Bubble */}
      <div
        className={`
          max-w-[82%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap font-medium shadow-md
          ${isUser
            ? "bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white rounded-2xl rounded-tr-sm"
            : "glass-panel text-[#F3F4F6] rounded-2xl rounded-tl-sm"
          }
        `}
      >
        {msg.content}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Typing Indicator
// ─────────────────────────────────────────────
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-3 items-end"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] flex items-center justify-center shadow-md">
        <Bot size={13} className="text-white" />
      </div>
      <div className="glass-panel rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 shadow-md">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full bg-[#3b82f6]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Drag & Drop Zone
// ─────────────────────────────────────────────
function DropZone({ onFile }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      id="ai-drop-zone"
      className={`drop-zone flex flex-col items-center justify-center gap-2 py-5 px-4 text-center transition-all duration-200 ${dragOver ? "drag-over" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${dragOver ? "bg-[#1d4ed8]/30" : "bg-[#1e293b]"}`}>
        <Upload size={18} className={dragOver ? "text-[#3b82f6]" : "text-[#64748B]"} />
      </div>
      <div>
        <p className="text-sm font-medium text-[#94A3B8]">
          {dragOver ? "Drop to attach file" : "Drag & drop a file, or click to browse"}
        </p>
        <p className="text-xs text-[#64748B] mt-0.5">PDF · PNG · JPG · DOCX · CSV</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.docx,.csv"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Progress Indicator
// ─────────────────────────────────────────────
function ExtractionProgress({ status }) {
  const stages = [
    { key: "idle",        label: "Awaiting AI extraction…",  pct: 0   },
    { key: "uploading",   label: "Uploading document…",      pct: 25  },
    { key: "parsing",     label: "Parsing with OCR…",        pct: 55  },
    { key: "extracting",  label: "Extracting fields…",       pct: 78  },
    { key: "done",        label: "Extraction complete ✓",    pct: 100 },
  ];
  const current = stages.find((s) => s.key === status) ?? stages[0];
  const isDone  = status === "done";

  return (
    <div className="px-4 py-3 border-b border-[#334155]/60 bg-[#0f172a]/40 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${isDone ? "text-emerald-400" : "text-[#94A3B8]"}`}>
          {current.label}
        </span>
        <span className="text-xs font-semibold text-[#64748B]">{current.pct}%</span>
      </div>
      <div className="progress-track">
        <div
          className={`progress-fill ${!isDone && status !== "idle" ? "progress-fill-animated" : ""}`}
          style={{ width: `${current.pct}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function AIAssistant({ complaintId = null }) {
  const [messages,         setMessages]         = useState([]);
  const [input,            setInput]            = useState("");
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState(null);
  const [attachedFile,     setAttachedFile]     = useState(null);
  const [extractionStatus, setExtractionStatus] = useState("idle");
  const [showDropZone,     setShowDropZone]     = useState(true);

  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);

  // Greeting on mount / complaint switch
  useEffect(() => {
    setMessages([{
      id:      uid(),
      role:    "assistant",
      content: complaintId
        ? `Hello! I'm the ResolveAI Assistant. I have context for complaint #${complaintId}. How can I help you resolve this issue?`
        : `Hello! I'm the ResolveAI Assistant 🤖\n\nI can help you:\n• Understand complaint root causes\n• Draft professional customer responses\n• Suggest resolution steps\n• Analyse quality trends\n\nHow can I assist you today?`,
    }]);
    setExtractionStatus("idle");
    setAttachedFile(null);
    setShowDropZone(true);
  }, [complaintId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── File handling ──────────────────────────
  const handleFile = useCallback((file) => {
    setAttachedFile(file);
    setShowDropZone(false);
    simulateExtraction(file);
  }, []);

  const simulateExtraction = (file) => {
    // Simulate multi-stage extraction pipeline feedback
    const stages = ["uploading", "parsing", "extracting", "done"];
    const delays  = [600, 1400, 2200, 3200];
    stages.forEach((stage, i) => {
      setTimeout(() => {
        setExtractionStatus(stage);
        if (stage === "done") {
          setMessages((prev) => [
            ...prev,
            {
              id:      uid(),
              role:    "assistant",
              content: `📄 File "${file.name}" processed by the AI assistant.\n\nI've extracted the key fields. You can ask me to:\n• Fill the form automatically\n• Summarise the document\n• Flag any quality deviations`,
            },
          ]);
        }
      }, delays[i]);
    });
  };

  // ── Chat ───────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg    = { id: uid(), role: "user", content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setError(null);
    setLoading(true);

    const apiMessages = newHistory
      .filter((m) => m.role !== "system")
      .map(({ role, content }) => ({ role, content }));

    try {
      const { data } = await api.post("/api/assistant/chat", {
        messages:     apiMessages,
        complaint_id: complaintId ?? undefined,
      });
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to reach the AI assistant.";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", content: `⚠️ ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setAttachedFile(null);
    setExtractionStatus("idle");
    setShowDropZone(true);
    setTimeout(() => {
      setMessages([{ id: uid(), role: "assistant", content: "Chat cleared. How can I help?" }]);
    }, 100);
  };

  const headerTitle = "AI Complaint Intake Assistant";
  const headerSubtitle = complaintId ? `Complaint #${complaintId}` : "AI Assistant";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full w-full min-h-0 rounded-3xl glass-panel shadow-2xl overflow-hidden border border-white/10"
    >
      {/* ── Header ──────────────────────────── */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3.5 border-b border-[#334155]/70 bg-[#0f172a]/90 backdrop-blur-md shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] flex items-center justify-center shadow-lg shadow-blue-900/30">
            <Sparkles size={17} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-[#F8FAFC] text-sm leading-tight">
              {headerTitle}
            </h3>
            <p className="text-[11px] text-[#64748B] font-medium">
              {headerSubtitle}
            </p>
          </div>
          {/* Live status dot */}
          <span className="relative flex h-2 w-2 ml-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="ai-attach-btn"
            title="Attach file"
            onClick={() => setShowDropZone((v) => !v)}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#1e293b] transition-colors"
          >
            <FileUp size={15} />
          </button>
          {/* Clear */}
          <button
            id="ai-clear-btn"
            onClick={clearChat}
            title="Clear chat"
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#1e293b] transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* ── Extraction progress bar ──────────── */}
      <ExtractionProgress status={extractionStatus} />

      {/* ── Drag & Drop zone ────────────────── */}
      <AnimatePresence>
        {showDropZone && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pt-3 pb-2 flex-shrink-0 overflow-hidden"
          >
            <DropZone onFile={handleFile} />
            {attachedFile && (
              <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400 font-medium px-1">
                <CheckAttachedIcon />
                {attachedFile.name}
                <button
                  onClick={() => { setAttachedFile(null); setExtractionStatus("idle"); }}
                  className="ml-auto text-[#64748B] hover:text-red-400 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages ────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4 min-h-0">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <Bubble key={m.id} msg={m} />
          ))}
          {loading && <TypingIndicator key="typing" />}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* ── Input ───────────────────────────── */}
      <div className="sticky bottom-0 z-20 px-4 pb-4 pt-3 border-t border-[#334155]/70 bg-[#0f172a]/90 backdrop-blur-md flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            id="ai-chat-input"
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything… (Enter to send)"
            disabled={loading}
            className={`
              flex-1 h-12 resize-none rounded-lg border border-[#334155] bg-[#0F172A]
              px-3.5 py-2.5 text-sm font-medium text-[#F8FAFC] placeholder-[#64748B] leading-relaxed
              focus:outline-none input-focus-glow
              transition-all duration-200 overflow-hidden
              ${loading ? "opacity-50 cursor-not-allowed" : "hover:border-[#475569]"}
            `}
          />

          <motion.button
            id="ai-send-btn"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300
              ${loading || !input.trim()
                ? "bg-[#1e293b] text-[#475569] cursor-not-allowed border border-[#334155]"
                : "bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white shadow-lg shadow-blue-900/30 hover:-translate-y-0.5 hover:shadow-blue-800/50"
              }
            `}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// tiny helper icon
function CheckAttachedIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="5.5" stroke="#34d399" />
      <path d="M3.5 6l2 2 3-3.5" stroke="#34d399" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
