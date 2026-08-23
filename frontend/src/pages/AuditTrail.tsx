import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FileText, Clock, ShieldCheck, RefreshCw } from "lucide-react";
import { api } from "../services/api";

export const AuditTrail: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    
    const loadAuditTrail = async () => {
      try {
        const data = await api.getAuditTrail(eventId);
        setLogs(data);
      } catch (err) {
        console.error("Failed to load audit trail:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAuditTrail();
  }, [eventId]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold tracking-widest text-navy-600 uppercase">COMPLIANCE LEDGER</span>
        <h1 className="text-2xl font-extrabold text-offwhite-50 mt-1">Audit Trail</h1>
        <p className="text-xs text-offwhite-300 mt-0.5">Immutable record of agent workflow triggers, calculations, scenario scores, and operator approvals.</p>
      </div>

      {/* Audit List */}
      <div className="panel-card p-6 rounded-lg space-y-6">
        <h3 className="text-sm font-bold border-b border-navy-800 pb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-offwhite-300" />
          <span>Operational Event Logs // Event: {eventId}</span>
        </h3>

        {isLoading ? (
          <div className="text-center text-xs text-offwhite-300 py-8 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Retrieving compliance records...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center text-xs text-offwhite-300 py-8">
            No compliance log entries recorded for this disruption.
          </div>
        ) : (
          <div className="relative border-l border-navy-800 ml-4 pl-6 space-y-8">
            {logs.map((log) => (
              <div key={log.id} className="relative space-y-2 text-xs">
                {/* Dot marker */}
                <span className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border border-navy-950 flex items-center justify-center ${
                  log.status === "COMPLETED"
                    ? "bg-emerald-500"
                    : log.status === "PROCESSING"
                    ? "bg-amber-500"
                    : log.status === "FAILED"
                    ? "bg-red-500"
                    : "bg-navy-700"
                }`}></span>

                {/* Log Item Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-offwhite-50 text-sm">{log.agent_name}</span>
                    <span className={`status-badge ${
                      log.status === "COMPLETED"
                        ? "badge-safe"
                        : log.status === "PROCESSING"
                        ? "badge-watch"
                        : log.status === "FAILED"
                        ? "badge-risk"
                        : "bg-navy-800 text-offwhite-300"
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-offwhite-300 text-[10px]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(log.timestamp).toLocaleTimeString()} ({log.duration_ms || 0}ms)</span>
                  </div>
                </div>

                {/* Log Item Content */}
                <div className="p-3 bg-navy-950 rounded border border-navy-850 space-y-2 text-offwhite-300">
                  <p className="leading-relaxed">{log.reasoning}</p>
                  {log.evidence && (
                    <p className="text-[10px] text-offwhite-300 italic border-t border-navy-850 pt-2 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Citations: {log.evidence}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
