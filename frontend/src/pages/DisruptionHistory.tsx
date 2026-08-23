import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ChevronRight, Clock } from "lucide-react";
import { api } from "../services/api";

export const DisruptionHistory: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await api.getDashboard();
        setEvents(data.recent_events);
      } catch (err) {
        console.error("Failed to load disruption history:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadEvents();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold tracking-widest text-navy-600 uppercase">COMPLIANCE LEDGER</span>
        <h1 className="text-2xl font-extrabold text-offwhite-50 mt-1">Disruption History</h1>
        <p className="text-xs text-offwhite-300 mt-0.5">Chronological record of all trade disruptions registered and analyzed by ARES multi-agent engine.</p>
      </div>

      {/* History List */}
      <div className="panel-card p-6 rounded-lg space-y-6">
        <h3 className="text-sm font-bold border-b border-navy-800 pb-3 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          <span>Monitored Trade Remedial Events</span>
        </h3>

        {isLoading ? (
          <div className="text-center text-xs text-offwhite-300 py-12">
            Loading historical trade logs...
          </div>
        ) : events.length === 0 ? (
          <div className="text-center text-xs text-offwhite-300 py-12">
            No disruption events registered. Go to Mission Control to query HTS codes or run alerts.
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((evt) => (
              <div
                key={evt.event_id}
                onClick={() => navigate(`/disruption/${evt.event_id}`)}
                className="p-5 bg-navy-950 rounded-lg border border-navy-850 hover:border-navy-700 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer text-left"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">{evt.hs_code}</span>
                    <span className="status-badge badge-critical">Active Disruption</span>
                  </div>
                  <h4 className="text-sm font-extrabold text-offwhite-50 leading-relaxed">{evt.product_description}</h4>
                  <div className="flex gap-4 text-[10px] text-offwhite-300">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(evt.retrieved_at).toLocaleString()}</span>
                    </span>
                    <span>Source: {evt.source} ({evt.source_name})</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between border-t border-navy-900 sm:border-0 pt-3 sm:pt-0">
                  <div className="text-right text-xs">
                    <span className="text-offwhite-300 block">Tariff Delta</span>
                    <span className="font-extrabold text-red-400">+{evt.rate_change * 100}%</span>
                  </div>
                  <button
                    className="flex items-center gap-1 bg-navy-800 hover:bg-navy-700 text-offwhite-100 px-4 py-2 rounded text-xs font-bold transition-all border border-navy-700"
                  >
                    <span>Inspect Workspace</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
