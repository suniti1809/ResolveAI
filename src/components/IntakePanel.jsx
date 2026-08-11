// IntakePanel.jsx – Two-column split-screen: Form (left) + AI Assistant (right)
import { motion } from "motion/react";
import LogForm     from "./LogForm";
import AIAssistant from "./AIAssistant.jsx";


/**
 * IntakePanel renders the "Log New" tab with a two-pane split layout:
 *   Left  (60%)  → LogForm: 4-section complaint intake form
 *   Right (40%)  → AIAssistant: drag & drop, progress, chat
 */
export default function IntakePanel({ complaintId = null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.28 }}
      className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5"
      style={{ minHeight: "calc(100vh - 240px)" }}
    >
      {/* ── Left panel: Form sections ──────── */}
      <div className="min-h-0 overflow-y-auto">
        <LogForm />
      </div>

      {/* ── Right panel: AI Assistant ──────── */}
      <div className="min-h-0 flex flex-col h-full" style={{ minHeight: 520 }}>
        <AIAssistant complaintId={complaintId} />
      </div>
    </motion.div>
  );
}
