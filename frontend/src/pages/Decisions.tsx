import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ShieldCheck, Play, Ban, RefreshCw, ChevronRight } from "lucide-react";
import { api } from "../services/api";

export const Decisions: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [decision, setDecision] = useState<any | null>(null);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [selectedScenarioName, setSelectedScenarioName] = useState("");
  const [isModifying, setIsModifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionPlan, setExecutionPlan] = useState<string[]>([]);

  const loadDecisionData = async () => {
    if (!eventId) return;
    try {
      const dec = await api.getDecision(eventId);
      setDecision(dec);
      if (dec) {
        setSelectedScenarioName(dec.selected_scenario || "");
      }
      
      const scs = await api.getScenarios(eventId);
      setScenarios(scs);
      
      // Load execution plan if already approved
      if (dec && dec.status === "APPROVED") {
        setExecutionPlan([
          "Task 1: Initiate alternate sourcing contract negotiation with Monterrey ECU Solutions.",
          "Task 2: Issue spot buy purchase order for 2,000 units safety stock to Detroit Harness.",
          "Task 3: Re-route Ohio transit shipments from ocean SEA mode to USMCA ROAD container lines."
        ]);
      }
    } catch (err) {
      console.error("Failed to load decision data:", err);
    }
  };

  useEffect(() => {
    loadDecisionData();
  }, [eventId]);

  const handleApprove = async () => {
    if (!eventId) return;
    setIsSubmitting(true);
    try {
      const res = await api.approveDecision(eventId);
      setDecision(res);
      setExecutionPlan([
        "Task 1: Initiate alternate sourcing contract negotiation with Monterrey ECU Solutions.",
        "Task 2: Issue spot buy purchase order for 2,000 units safety stock to Detroit Harness.",
        "Task 3: Re-route Ohio transit shipments from ocean SEA mode to USMCA ROAD container lines."
      ]);
    } catch (err) {
      console.error("Approval failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!eventId) return;
    setIsSubmitting(true);
    try {
      const res = await api.rejectDecision(eventId);
      setDecision(res);
      setExecutionPlan([]);
    } catch (err) {
      console.error("Rejection failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveModified = async () => {
    if (!eventId) return;
    setIsSubmitting(true);
    try {
      // Modify sets custom selected scenario in local state
      // For demo, we trigger approve on the newly selected scenario name
      const res = await api.approveDecision(eventId);
      setDecision({
        ...res,
        selected_scenario: selectedScenarioName
      });
      setIsModifying(false);
      setExecutionPlan([
        `Task 1: Initiate transition to ${selectedScenarioName}.`,
        "Task 2: Adjust procurement monthly orders to align with selected split constraints.",
        "Task 3: Dispatch carrier notice to update transport routes."
      ]);
    } catch (err) {
      console.error("Modification failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!decision) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-offwhite-300">
        Reviewing decision parameters...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold tracking-widest text-navy-600 uppercase">OPERATIONAL COMMAND</span>
        <h1 className="text-2xl font-extrabold text-offwhite-50 mt-1">Decision Center</h1>
        <p className="text-xs text-offwhite-300 mt-0.5">Authorize mitigation actions and trigger enterprise logistics orchestration.</p>
      </div>

      {/* Decision Card */}
      <div className={`panel-card p-8 rounded-lg border-l-4 ${
        decision.status === "APPROVED"
          ? "border-l-emerald-500"
          : decision.status === "REJECTED"
          ? "border-l-red-500"
          : "border-l-amber-500"
      } space-y-6`}>
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-bold text-navy-600 uppercase">RECOMMENDED MITIGATION</span>
            {isModifying ? (
              <select
                value={selectedScenarioName}
                onChange={(e) => setSelectedScenarioName(e.target.value)}
                className="mt-2 block bg-navy-800 border border-navy-700 text-offwhite-50 rounded p-2 text-sm font-bold focus:outline-none focus:border-navy-600"
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.scenario_name}>
                    {s.scenario_name}
                  </option>
                ))}
              </select>
            ) : (
              <h2 className="text-xl font-black text-offwhite-50 mt-1">{decision.selected_scenario || selectedScenarioName}</h2>
            )}
          </div>
          <span className={`status-badge ${
            decision.status === "APPROVED"
              ? "badge-safe"
              : decision.status === "REJECTED"
              ? "badge-risk"
              : "badge-watch"
          }`}>
            {decision.status}
          </span>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold text-offwhite-300 block">Agent Cognitive Recommendation Summary</span>
          <p className="text-xs text-offwhite-300 leading-relaxed bg-navy-950 p-4 rounded border border-navy-850">
            {decision.recommendation}
          </p>
        </div>

        {/* Buttons / Actions */}
        {decision.status === "PENDING" && (
          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-navy-850">
            {isModifying ? (
              <>
                <button
                  onClick={handleSaveModified}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-offwhite-50 px-6 py-3 rounded text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirm Plan Modification</span>
                </button>
                <button
                  onClick={() => setIsModifying(false)}
                  className="bg-navy-800 hover:bg-navy-700 text-offwhite-300 px-6 py-3 rounded text-xs font-bold transition-all"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="bg-offwhite-100 hover:bg-offwhite-200 text-navy-950 px-6 py-3 rounded text-xs font-extrabold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>Approve & Execute Plan</span>
                </button>
                <button
                  onClick={() => setIsModifying(true)}
                  className="bg-navy-800 hover:bg-navy-700 text-offwhite-100 px-6 py-3 rounded text-xs font-bold border border-navy-700 transition-all"
                >
                  Modify Strategy
                </button>
                <button
                  onClick={handleReject}
                  disabled={isSubmitting}
                  className="bg-red-950/40 hover:bg-red-950/60 text-red-400 px-6 py-3 rounded text-xs font-bold border border-red-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Ban className="w-4 h-4" />
                  <span>Reject Strategy</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Execution Plan Tasks */}
      {executionPlan.length > 0 && (
        <div className="panel-card p-6 rounded-lg space-y-4">
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            <span>Simulated Sourcing & Logistics Execution Tasks</span>
          </h3>

          <div className="space-y-3">
            {executionPlan.map((task, idx) => (
              <div key={idx} className="flex gap-3 items-start p-3 bg-navy-950 rounded border border-navy-850 text-xs">
                <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  {idx + 1}
                </div>
                <div>
                  <span className="font-semibold text-offwhite-50 block">Status: PENDING OPERATION</span>
                  <p className="text-offwhite-300 mt-1">{task}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-navy-850 flex justify-between items-center text-xs">
            <span className="text-offwhite-300">Auditable Log Registered</span>
            <Link to={`/audit/${eventId}`} className="text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1">
              <span>View Audit Trail</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
