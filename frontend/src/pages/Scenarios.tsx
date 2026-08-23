import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { DollarSign, CheckCircle } from "lucide-react";
import { api } from "../services/api";

export const Scenarios: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [scenarios, setScenarios] = useState<any[]>([]);
  
  // Weights State for dynamic frontend scoring
  const [costWeight, setCostWeight] = useState(0.3);
  const [riskWeight, setRiskWeight] = useState(0.2);
  const [continuityWeight, setContinuityWeight] = useState(0.3);
  const [timeWeight, setTimeWeight] = useState(0.2);

  useEffect(() => {
    if (!eventId) return;
    const loadScenarios = async () => {
      try {
        const scs = await api.getScenarios(eventId);
        setScenarios(scs);
      } catch (err) {
        console.error("Failed to load scenarios:", err);
      }
    };
    loadScenarios();
  }, [eventId]);

  // Compute dynamic scores in client based on sliders
  const getDynamicScenarios = () => {
    const sum = costWeight + riskWeight + continuityWeight + timeWeight || 1.0;
    const wCost = costWeight / sum;
    const wRisk = riskWeight / sum;
    const wCont = continuityWeight / sum;
    const wTime = timeWeight / sum;

    return scenarios.map((sc) => {
      // Normalize cost: lower is better (max expected delta cost is 1.5M)
      const normCost = Math.max(0, 1.0 - (sc.estimated_cost / 1500000));
      
      // Normalize risk: lower risk is better
      let normRisk = 0.5;
      if (sc.supplier_risk.toLowerCase() === "low") normRisk = 1.0;
      if (sc.supplier_risk.toLowerCase() === "high") normRisk = 0.15;

      // Normalize continuity: higher safety is better
      let normCont = 0.5;
      if (sc.production_continuity.toLowerCase() === "safe") normCont = 1.0;
      if (sc.production_continuity.toLowerCase() === "watch") normCont = 0.7;
      if (sc.production_continuity.toLowerCase() === "at_risk") normCont = 0.3;
      if (sc.production_continuity.toLowerCase() === "critical") normCont = 0.0;

      // Normalize time: lower implementation lead time is better
      const normTime = Math.max(0, 1.0 - (sc.implementation_time / 90));

      const calculatedScore = (wCost * normCost) + (wRisk * normRisk) + (wCont * normCont) + (wTime * normTime);
      
      return {
        ...sc,
        score: parseFloat(calculatedScore.toFixed(2))
      };
    }).sort((a, b) => b.score - a.score);
  };

  const sortedScenarios = getDynamicScenarios();
  const recommended = sortedScenarios[0] || null;

  // Format data for Recharts comparison
  const chartData = sortedScenarios.map((s) => ({
    name: s.strategy_type === "ABSORB" ? "Absorb" : s.strategy_type === "SWITCH" ? "Switch" : "Split",
    Cost: s.estimated_cost / 1000, // in Thousands
    Days: s.implementation_time,
  }));

  if (scenarios.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-offwhite-300">
        Generating and ranking strategic scenarios...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold tracking-widest text-navy-600 uppercase">DECISION WORKSPACE</span>
        <h1 className="text-2xl font-extrabold text-offwhite-50 mt-1">Strategic Scenario Modeling</h1>
        <p className="text-xs text-offwhite-300 mt-0.5">Disruption Event: {eventId} // Scenarios dynamically scored on local weight criteria.</p>
      </div>

      {/* Interactive Sliders Panel */}
      <div className="panel-card p-6 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
        <div className="md:col-span-4 border-b border-navy-850 pb-2 flex justify-between items-center">
          <span className="text-xs font-bold text-offwhite-50 uppercase tracking-wider">Dynamic Scenarios Tuning</span>
          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wide">Adjust weights to re-rank cards live</span>
        </div>
        
        {/* Cost Slider */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between font-bold text-offwhite-300">
            <span>Procurement Cost</span>
            <span>{(costWeight * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={costWeight}
            onChange={(e) => setCostWeight(parseFloat(e.target.value))}
            className="w-full h-1 bg-navy-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Risk Slider */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between font-bold text-offwhite-300">
            <span>Supplier Credit / Risk</span>
            <span>{(riskWeight * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={riskWeight}
            onChange={(e) => setRiskWeight(parseFloat(e.target.value))}
            className="w-full h-1 bg-navy-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Continuity Slider */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between font-bold text-offwhite-300">
            <span>Production Continuity</span>
            <span>{(continuityWeight * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={continuityWeight}
            onChange={(e) => setContinuityWeight(parseFloat(e.target.value))}
            className="w-full h-1 bg-navy-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Lead Time Slider */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between font-bold text-offwhite-300">
            <span>Onboarding Speed</span>
            <span>{(timeWeight * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={timeWeight}
            onChange={(e) => setTimeWeight(parseFloat(e.target.value))}
            className="w-full h-1 bg-navy-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      </div>

      {/* Strategic Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {sortedScenarios.map((sc) => {
          const isRec = recommended && sc.id === recommended.id;
          return (
            <div
              key={sc.id}
              className={`panel-card p-6 rounded-lg relative overflow-hidden flex flex-col justify-between border-t-4 transition-all duration-300 ${
                isRec
                  ? "border-t-amber-500 bg-navy-900/80 ring-1 ring-amber-500/30"
                  : "border-t-navy-700"
              }`}
            >
              {isRec && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-black text-amber-500 uppercase tracking-widest">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Recommended</span>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-navy-600 uppercase tracking-wider">{sc.strategy_type}</span>
                  <h3 className="text-lg font-black text-offwhite-50 mt-1 text-left">{sc.scenario_name}</h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-navy-850 pb-2">
                    <span className="text-offwhite-300">Annualized Cost</span>
                    <span className="font-extrabold text-offwhite-50">${(sc.estimated_cost / 1000).toLocaleString()}k</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-navy-850 pb-2">
                    <span className="text-offwhite-300">Tariff Exposure</span>
                    <span className="font-bold text-offwhite-50">${(sc.tariff_exposure / 1000).toLocaleString()}k</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-navy-850 pb-2">
                    <span className="text-offwhite-300">Implementation Speed</span>
                    <span className="font-bold text-offwhite-50">{sc.implementation_time} Days</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-navy-850 pb-2">
                    <span className="text-offwhite-300">Production Continuity</span>
                    <span className={`status-badge badge-${sc.production_continuity.toLowerCase()}`}>{sc.production_continuity}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-navy-850 pb-2">
                    <span className="text-offwhite-300">Supplier Sourcing Risk</span>
                    <span className="font-bold text-offwhite-50">{sc.supplier_risk}</span>
                  </div>
                </div>

                <div className="p-3 bg-navy-950 rounded border border-navy-850 text-xs text-offwhite-300 leading-relaxed text-left">
                  <span className="font-semibold text-offwhite-50 block mb-1">ARES Analysis Summary</span>
                  {sc.assumptions}
                </div>
              </div>

              <div className="mt-6 border-t border-navy-850 pt-4 flex justify-between items-center text-xs">
                <span className="text-offwhite-300 font-bold">Dynamic Score</span>
                <span className="font-extrabold text-amber-500 text-sm">{sc.score}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Chart & Next Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recharts chart */}
        <div className="lg:col-span-2 panel-card p-6 rounded-lg">
          <h3 className="text-sm font-bold text-offwhite-50 mb-6 uppercase tracking-wider text-left">Scenario Trade-off Visualizer</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
                <XAxis dataKey="name" stroke="#faf9f8" fontSize={11} />
                <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" fontSize={11} label={{ value: 'Cost Increase ($k)', angle: -90, position: 'insideLeft', fill: '#3b82f6', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={11} label={{ value: 'Lead Time (Days)', angle: 90, position: 'insideRight', fill: '#f59e0b', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0b0f19", border: "1px solid #384c66", borderRadius: 4 }} />
                <Legend />
                <Bar yAxisId="left" dataKey="Cost" name="Incremental Cost ($k)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="Days" name="Qualification Days" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Panel */}
        <div className="panel-card p-6 rounded-lg flex flex-col justify-between text-left">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-offwhite-50 uppercase tracking-wider">Decision Recommendation Summary</h3>
            <p className="text-xs text-offwhite-300 leading-relaxed">
              Based on the configurable enterprise scoring weights, ARES recommends executing the plan with the optimal trade-off of risk hedging and cost constraints.
            </p>
            {recommended && (
              <div className="p-4 bg-navy-950 rounded border border-navy-850">
                <span className="text-[10px] font-bold text-amber-500 uppercase">Scoring Engine Choice</span>
                <h4 className="text-sm font-extrabold text-offwhite-50 mt-1">{recommended.scenario_name}</h4>
                <p className="text-xs text-offwhite-300 mt-2">Provides the highest production safety margin with acceptable procurement cost impact.</p>
              </div>
            )}
          </div>
          <div className="pt-6 border-t border-navy-850">
            <Link
              to={`/decisions/${eventId}`}
              className="w-full bg-offwhite-100 hover:bg-offwhite-200 text-navy-950 font-extrabold py-3 px-4 rounded text-xs flex items-center justify-center gap-2 transition-all"
            >
              <span>Proceed to Decision Center</span>
              <DollarSign className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
