import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Shield, Users, FileText, ChevronRight } from "lucide-react";
import { api } from "../services/api";

export const DisruptionDetail: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<any | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);

  useEffect(() => {
    if (!eventId) return;

    const loadData = async () => {
      try {
        const dashboardData = await api.getDashboard();
        const foundEvent = dashboardData.recent_events.find((e: any) => e.event_id === eventId);
        
        if (foundEvent) {
          setEvent(foundEvent);
          
          // Gather suppliers & plants from agent logs or state
          // For demo, we parse them from the seeded database models
          const suppliersData = await api.getSuppliers();
          setSuppliers(suppliersData.filter((s: any) => s.country === foundEvent.origin_country));
          
          // Ohio Assembly Plant (P01) is default plant
          setPlants([
            {
              id: "P01",
              name: "Ohio Assembly Plant",
              consumption: 420,
              stock: 4500,
              runway: 10.7,
              status: "WATCH"
            }
          ]);
        }
      } catch (err) {
        console.error("Failed to load disruption details:", err);
      }
    };

    loadData();
  }, [eventId]);

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-offwhite-300">
        Loading disruption analysis metrics...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-navy-900 border border-navy-700 p-6 rounded-lg">
        <div>
          <span className="text-xs font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20 uppercase tracking-widest">ACTIVE DISRUPTION</span>
          <h1 className="text-2xl font-extrabold text-offwhite-50 mt-2">{event.product_description}</h1>
          <p className="text-xs text-offwhite-300 mt-1">Event Reference ID: {event.event_id} | HTS Subheading: {event.hs_code}</p>
        </div>
        <Link
          to={`/agents/${eventId}`}
          className="flex items-center gap-2 bg-navy-800 border border-navy-600 hover:bg-navy-700 text-offwhite-100 px-5 py-2.5 rounded text-sm font-bold transition-all"
        >
          <span>Track Agent Workflows</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Source Evidence & Metrics row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Source Evidence Panel */}
        <div className="panel-card p-6 rounded-lg space-y-4">
          <h3 className="text-lg font-bold border-b border-navy-800 pb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-offwhite-300" />
            <span>Source Evidence Panel</span>
          </h3>
          
          <div className="space-y-4 text-xs">
            <div className="flex justify-between border-b border-navy-850 pb-2">
              <span className="text-offwhite-300 font-medium">Source Registry</span>
              <span className="font-bold text-offwhite-50">{event.source_name}</span>
            </div>
            <div className="flex justify-between border-b border-navy-850 pb-2">
              <span className="text-offwhite-300 font-medium">Retrieved Time</span>
              <span className="font-bold text-offwhite-50">{new Date(event.retrieved_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-navy-850 pb-2">
              <span className="text-offwhite-300 font-medium">Effective Date</span>
              <span className="font-bold text-emerald-400">{new Date(event.effective_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between border-b border-navy-850 pb-2">
              <span className="text-offwhite-300 font-medium">Tariff Rate Delta</span>
              <span className="font-bold text-red-400">+{event.rate_change * 100}%</span>
            </div>
            <div className="flex justify-between border-b border-navy-850 pb-2">
              <span className="text-offwhite-300 font-medium">Origin Country</span>
              <span className="font-bold text-offwhite-50">{event.origin_country}</span>
            </div>
            <div className="flex justify-between border-b border-navy-850 pb-2">
              <span className="text-offwhite-300 font-medium">Destination Country</span>
              <span className="font-bold text-offwhite-50">{event.destination_country}</span>
            </div>
            
            <div className="space-y-2 pt-2">
              <span className="text-offwhite-300 font-medium block">Raw Registry Citations</span>
              <div className="p-3 bg-navy-950 rounded border border-navy-800 text-offwhite-300 leading-relaxed max-h-32 overflow-y-auto">
                {event.evidence}
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Dual-Perspective Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Manufacturer Perspective */}
          <div className="panel-card p-6 rounded-lg space-y-4">
            <h3 className="text-lg font-bold border-b border-navy-800 pb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              <span>Manufacturer Impact</span>
            </h3>

            {plants.map((plant, idx) => (
              <div key={idx} className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-offwhite-50 text-sm mb-1">{plant.name}</h4>
                  <span className={`status-badge badge-${plant.status.toLowerCase()}`}>{plant.status}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-navy-950 p-3 rounded border border-navy-850">
                  <div>
                    <span className="text-offwhite-300 block mb-0.5">Inventory Runway</span>
                    <span className="text-sm font-bold text-offwhite-50">{plant.runway} Days</span>
                  </div>
                  <div>
                    <span className="text-offwhite-300 block mb-0.5">Safety Stock Level</span>
                    <span className="text-sm font-bold text-offwhite-50">3,000 Units</span>
                  </div>
                  <div>
                    <span className="text-offwhite-300 block mb-0.5">Daily Consumption</span>
                    <span className="text-sm font-bold text-offwhite-50">{plant.consumption} / Day</span>
                  </div>
                  <div>
                    <span className="text-offwhite-300 block mb-0.5">Current Stock</span>
                    <span className="text-sm font-bold text-offwhite-50">{plant.stock} Units</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-offwhite-300 font-semibold block">Manufacturer Cost Impact</span>
                  <p className="text-offwhite-300 leading-relaxed bg-navy-950/50 p-3 rounded border border-navy-850">
                    Tariff increase on Chinese wiring harnesses raises component landed cost by +25%, translating to $11.25 cost increase per unit. Monthly procurement costs expand by $168,750.
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Supplier Perspective */}
          <div className="panel-card p-6 rounded-lg space-y-4">
            <h3 className="text-lg font-bold border-b border-navy-800 pb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              <span>Supplier Impact</span>
            </h3>

            {suppliers.map((sup, idx) => (
              <div key={idx} className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-offwhite-50 text-sm mb-1">{sup.name} ({sup.country})</h4>
                  <span className="status-badge badge-watch">EXPOSED</span>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-navy-950 p-3 rounded border border-navy-850">
                  <div>
                    <span className="text-offwhite-300 block mb-0.5">Export Dependency</span>
                    <span className="text-sm font-bold text-offwhite-50">{sup.export_dependency * 100}%</span>
                  </div>
                  <div>
                    <span className="text-offwhite-300 block mb-0.5">Capacity Utilization</span>
                    <span className="text-sm font-bold text-offwhite-50">92%</span>
                  </div>
                  <div>
                    <span className="text-offwhite-300 block mb-0.5">Historical Reliability</span>
                    <span className="text-sm font-bold text-offwhite-50">{sup.reliability * 100}%</span>
                  </div>
                  <div>
                    <span className="text-offwhite-300 block mb-0.5">Potential Pass-Through</span>
                    <span className="text-sm font-bold text-amber-400">72%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-offwhite-300 font-semibold block">Supplier Margin Pressure</span>
                  <p className="text-offwhite-300 leading-relaxed bg-navy-950/50 p-3 rounded border border-navy-850">
                    Given Chaozhou Auto's 82% export dependency on this buyer, they cannot easily absorb the full 25% duty. Sourcing audit predicts they will pass through 72% of the tariff increase to maintain viability.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation footer */}
      <div className="flex justify-end gap-4 border-t border-navy-800 pt-6">
        <Link
          to={`/scenarios/${eventId}`}
          className="bg-offwhite-100 hover:bg-offwhite-200 text-navy-950 px-6 py-3 rounded text-sm font-extrabold transition-all"
        >
          Evaluate Mitigation Scenarios
        </Link>
      </div>
    </div>
  );
};
