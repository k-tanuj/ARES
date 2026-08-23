import React, { useState, useEffect } from "react";
import { Users, Truck, CheckCircle, RefreshCw, Globe } from "lucide-react";
import { api } from "../services/api";

export const SupplierPortal: React.FC = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("S01");
  const [portalView, setPortalView] = useState<any | null>(null);
  
  // Simulation Inputs
  const [capacity, setCapacity] = useState(0);
  const [leadTime, setLeadTime] = useState(0);
  const [originCountry, setOriginCountry] = useState("China");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSuppliers = async () => {
    try {
      const sups = await api.getSuppliers();
      setSuppliers(sups);
    } catch (err) {
      console.error("Failed to load suppliers:", err);
    }
  };

  const loadPortalView = async (supplierId: string) => {
    try {
      const data = await api.getSupplierPortalView(supplierId);
      setPortalView(data);
      setCapacity(data.current_capacity);
      setLeadTime(data.lead_time);
      setOriginCountry(data.country);
    } catch (err) {
      console.error("Failed to load supplier portal:", err);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (selectedSupplierId) {
      loadPortalView(selectedSupplierId);
    }
  }, [selectedSupplierId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);
    try {
      const primaryComponentId = portalView?.affected_components[0]?.id || "C02";
      await api.updateSupplierPortal({
        supplier_id: selectedSupplierId,
        component_id: primaryComponentId,
        capacity_units_per_month: capacity,
        lead_time_days: leadTime,
        origin_country: originCountry,
      });
      setSuccessMessage("Operational parameters submitted to buyer. Exposure metrics updated successfully.");
      await loadPortalView(selectedSupplierId);
    } catch (err) {
      console.error("Submission failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-navy-900 border border-navy-700 p-6 rounded-lg">
        <div>
          <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">TWO-SIDED RESILIENCE</span>
          <h1 className="text-2xl font-extrabold text-offwhite-50 mt-1">Supplier Operational Portal</h1>
          <p className="text-xs text-offwhite-300 mt-0.5">Select a partner supplier to audit their export capacities, contract exposures, or propose mitigation parameters.</p>
        </div>
        <select
          value={selectedSupplierId}
          onChange={(e) => setSelectedSupplierId(e.target.value)}
          className="bg-navy-800 border border-navy-700 text-offwhite-50 rounded px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-navy-600"
        >
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.country})
            </option>
          ))}
        </select>
      </div>

      {portalView && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Columns: Exposure View */}
          <div className="lg:col-span-2 space-y-8">
            {/* Exposure Dashboard */}
            <div className="panel-card p-6 rounded-lg space-y-6">
              <h3 className="text-lg font-bold border-b border-navy-800 pb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-offwhite-300" />
                <span>Supplier Exposure Summary</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { name: "Active Tariff Rate", value: portalView.tariff_change > 0 ? `+${portalView.tariff_change * 100}%` : "0%" },
                  { name: "Monthly Cost Impact", value: `$${portalView.estimated_cost_impact.toLocaleString()}` },
                  { name: "Unit Contract cost", value: `$${portalView.estimated_cost_impact > 0 ? (portalView.estimated_cost_impact / portalView.current_capacity).toFixed(2) : "0.00"}` },
                  { name: "Potential Pass-Through", value: `$${portalView.potential_pass_through.toLocaleString()}` },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-navy-950 p-4 rounded border border-navy-850">
                    <span className="text-[10px] font-semibold text-offwhite-300 uppercase tracking-wider block mb-1">{stat.name}</span>
                    <span className="text-lg font-black text-offwhite-50">{stat.value}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 text-xs text-offwhite-300">
                <h4 className="font-bold text-offwhite-50 text-sm">Affected Components Supplied</h4>
                <div className="space-y-2">
                  {portalView.affected_components.map((c: any) => (
                    <div key={c.id} className="p-3 bg-navy-950 rounded border border-navy-850 flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-offwhite-50">{c.name}</span>
                        <p className="text-[10px] text-offwhite-300 mt-0.5">HS Classification: {c.hs_code}</p>
                      </div>
                      <span className="status-badge badge-safe">{c.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Simulated Mitigation Proposals */}
            <div className="panel-card p-6 rounded-lg space-y-4">
              <h3 className="text-lg font-bold border-b border-navy-800 pb-3 flex items-center gap-2">
                <Truck className="w-5 h-5 text-offwhite-300" />
                <span>Alternative Production & Routing Options</span>
              </h3>
              
              <div className="space-y-3 text-xs">
                {portalView.alternative_production_options.map((opt: string, idx: number) => (
                  <div key={idx} className="flex gap-2 items-center p-3 bg-navy-950 rounded border border-navy-850">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-offwhite-300">{opt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Update simulation form */}
          <div className="panel-card p-6 rounded-lg flex flex-col justify-between">
            <div className="space-y-6">
              <h3 className="text-lg font-bold border-b border-navy-800 pb-3 flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-500" />
                <span>Simulation Workshop</span>
              </h3>
              
              <p className="text-xs text-offwhite-300 leading-relaxed">
                Propose changes to operational parameters to see how shifts in sourcing origin or capacity mitigate tariff exposures on the buyer's dashboards.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* Capacity Input */}
                <div className="space-y-2">
                  <label className="text-offwhite-300 font-semibold block">Production Capacity (Units/Month)</label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full bg-navy-950 border border-navy-800 text-offwhite-50 rounded p-2.5 font-bold focus:outline-none focus:border-navy-700"
                  />
                </div>

                {/* Lead Time Input */}
                <div className="space-y-2">
                  <label className="text-offwhite-300 font-semibold block">Lead Time (Days)</label>
                  <input
                    type="number"
                    value={leadTime}
                    onChange={(e) => setLeadTime(Number(e.target.value))}
                    className="w-full bg-navy-950 border border-navy-800 text-offwhite-50 rounded p-2.5 font-bold focus:outline-none focus:border-navy-700"
                  />
                </div>

                {/* Sourcing Origin */}
                <div className="space-y-2">
                  <label className="text-offwhite-300 font-semibold block">Sourcing Origin Country</label>
                  <select
                    value={originCountry}
                    onChange={(e) => setOriginCountry(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-800 text-offwhite-50 rounded p-2.5 font-bold focus:outline-none focus:border-navy-700"
                  >
                    <option value="China">China</option>
                    <option value="Mexico">Mexico</option>
                    <option value="USA">USA</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-offwhite-100 hover:bg-offwhite-200 text-navy-950 font-extrabold py-3 px-4 rounded text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  <span>Submit Parameter Updates</span>
                </button>
              </form>
            </div>

            {successMessage && (
              <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-xs flex gap-2 items-start">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{successMessage}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
