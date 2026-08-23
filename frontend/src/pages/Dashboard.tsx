import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactFlow, { Background, Controls, Position } from "reactflow";
import type { Node, Edge } from "reactflow";
import "reactflow/dist/style.css";
import { Search, AlertCircle, RefreshCw, Layers, DollarSign, Activity, Database } from "lucide-react";
import { api } from "../services/api";

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState({
    active_disruptions: 0,
    suppliers_exposed: 0,
    production_lines_at_risk: 0,
    inventory_days: 0,
    estimated_cost_exposure: 0.0,
  });
  const [sources, setSources] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [mapViewMode, setMapViewMode] = useState<"flow" | "map">("flow");
  const [refreshTimer, setRefreshTimer] = useState(30 * 60);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Load Dashboard Data
  const loadDashboard = async () => {
    setIsRefreshing(true);
    try {
      const data = await api.getDashboard();
      setKpis(data.kpis);
      setRecentEvents(data.recent_events);
      setSources(data.sources);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    
    // Auto-refresh dashboard data and alerts every 30 minutes (countdown ticker)
    const countdown = setInterval(() => {
      setRefreshTimer((prev) => {
        if (prev <= 1) {
          loadDashboard();
          return 30 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(countdown);
  }, []);

  // Search Live Tariffs
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await api.searchTariffs(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Trigger ARES Workflow
  const handleAnalyze = async (eventData: any) => {
    const targetId = eventData.id || eventData.hs_code;
    setAnalyzingId(targetId);
    try {
      const response = await api.runTariffAnalysis({
        hs_code: eventData.hs_code,
        origin_country: eventData.origin_country,
        destination_country: eventData.destination_country,
        old_rate: eventData.old_rate,
        new_rate: eventData.new_rate,
        product_description: eventData.product_description,
        source: eventData.source,
      });
      await loadDashboard();
      navigate(`/disruption/${response.event_id}`);
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setAnalyzingId(null);
    }
  };

  // Define React Flow Nodes & Edges based on selected event
  const getGraphData = () => {
    const nodes: Node[] = [
      {
        id: "n-tariff",
        type: "input",
        data: { label: "Tariff: +25% China" },
        position: { x: 50, y: 150 },
        sourcePosition: Position.Right,
        style: { background: "#7f1d1d", color: "#fca5a5", border: "1px solid #ef4444" },
      },
      {
        id: "n-origin",
        data: { label: "Origin: China" },
        position: { x: 220, y: 150 },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        style: { background: "#1a2332", color: "#faf9f8", border: "1px solid #384c66" },
      },
      {
        id: "n-supplier",
        data: { label: "S01: Chaozhou Auto" },
        position: { x: 390, y: 80 },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        style: { background: "#78350f", color: "#fde68a", border: "1px solid #d97706" },
      },
      {
        id: "n-supplier-alt",
        data: { label: "S03: Detroit Harness (Alt)" },
        position: { x: 390, y: 220 },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        style: { background: "#065f46", color: "#a7f3d0", border: "1px solid #059669" },
      },
      {
        id: "n-component",
        data: { label: "C02: Wiring Harness" },
        position: { x: 580, y: 150 },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        style: { background: "#1a2332", color: "#faf9f8", border: "1px solid #384c66" },
      },
      {
        id: "n-plant",
        data: { label: "P01: Ohio Assembly" },
        position: { x: 750, y: 150 },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        style: { background: "#111726", color: "#faf9f8", border: "1px solid #ef4444" },
      },
      {
        id: "n-order",
        type: "output",
        data: { label: "PO-O01: 5000 Units" },
        position: { x: 920, y: 150 },
        targetPosition: Position.Left,
        style: { background: "#1a2332", color: "#faf9f8", border: "1px solid #384c66" },
      },
    ];

    const edges: Edge[] = [
      { id: "e1", source: "n-tariff", target: "n-origin", animated: true, style: { stroke: "#ef4444" } },
      { id: "e2", source: "n-origin", target: "n-supplier", animated: true, style: { stroke: "#d97706" } },
      { id: "e3", source: "n-supplier", target: "n-component", style: { stroke: "#d97706" } },
      { id: "e4", source: "n-supplier-alt", target: "n-component", style: { stroke: "#059669" } },
      { id: "e5", source: "n-component", target: "n-plant", animated: true, style: { stroke: "#ef4444" } },
      { id: "e6", source: "n-plant", target: "n-order", style: { stroke: "#384c66" } },
    ];

    return { nodes, edges };
  };

  const { nodes, edges } = getGraphData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        {[
          { name: "Active Disruptions", value: kpis.active_disruptions, icon: AlertCircle, color: "text-red-500" },
          { name: "Suppliers Exposed", value: kpis.suppliers_exposed, icon: Activity, color: "text-amber-500" },
          { name: "Plants At Risk", value: kpis.production_lines_at_risk, icon: Layers, color: "text-red-400" },
          { name: "Avg Inventory Days", value: `${kpis.inventory_days} Days`, icon: Database, color: "text-emerald-500" },
          { name: "Cost Exposure (Annual)", value: `$${(kpis.estimated_cost_exposure / 1000000).toFixed(2)}M`, icon: DollarSign, color: "text-red-500" },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="panel-card p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-offwhite-300 uppercase tracking-wider">{kpi.name}</span>
                <Icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <span className="text-2xl font-black text-offwhite-50">{kpi.value}</span>
            </div>
          );
        })}
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Map Search & Flow Graph */}
        <div className="lg:col-span-2 space-y-8">
          {/* USITC Search Panel */}
          <div className="panel-card p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-offwhite-300" />
              <span>USITC Live Tariff Intelligence</span>
            </h3>
            
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search HS Code or product description (e.g. 8544, aluminum)..."
                className="flex-1 bg-navy-800 border border-navy-700 text-offwhite-50 rounded px-4 py-2 text-sm focus:outline-none focus:border-navy-600"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="bg-offwhite-100 hover:bg-offwhite-200 text-navy-950 px-5 py-2 rounded text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Search</span>
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 border-t border-navy-800 pt-4">
                {searchResults.map((item, idx) => (
                  <div key={idx} className="bg-navy-950 p-4 rounded border border-navy-800 flex justify-between items-center gap-4">
                    <div>
                      <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{item.hs_code}</span>
                      <h4 className="text-sm font-bold mt-1 text-offwhite-50">{item.product_description}</h4>
                      <p className="text-xs text-offwhite-300 mt-0.5">Source: {item.source} | Rate: {item.old_rate * 100}% General</p>
                    </div>
                    <button
                      onClick={() => handleAnalyze(item)}
                      disabled={analyzingId !== null}
                      className="bg-navy-700 hover:bg-navy-600 text-offwhite-50 px-4 py-2 rounded text-xs font-bold transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {analyzingId === item.hs_code ? "Analyzing..." : "Run Analysis"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Supply Chain Graph / Map */}
          <div className="panel-card rounded-lg overflow-hidden h-96 flex flex-col">
            <div className="p-4 border-b border-navy-800 bg-navy-900/50 flex justify-between items-center">
              <span className="text-sm font-bold text-offwhite-50">Supply Chain Visualizer</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setMapViewMode("flow")}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    mapViewMode === "flow"
                      ? "bg-navy-800 text-offwhite-50 border border-navy-600"
                      : "text-offwhite-300 hover:text-offwhite-50"
                  }`}
                >
                  Dependency Flow
                </button>
                <button
                  onClick={() => setMapViewMode("map")}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    mapViewMode === "map"
                      ? "bg-navy-800 text-offwhite-50 border border-navy-600"
                      : "text-offwhite-300 hover:text-offwhite-50"
                  }`}
                >
                  Transit Routes
                </button>
              </div>
            </div>
            <div className="flex-1 bg-navy-950">
              {mapViewMode === "flow" ? (
                <ReactFlow nodes={nodes} edges={edges} fitView>
                  <Background color="#1a2332" gap={16} />
                  <Controls />
                </ReactFlow>
              ) : (
                <div className="w-full h-full p-4 relative flex items-center justify-center">
                  <svg className="w-full h-full max-h-80" viewBox="0 0 800 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#161f30" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    <path d="M10,80 Q70,90 120,130 T200,280 L100,380 Z" fill="#111827" opacity="0.6" stroke="#1f2937" strokeWidth="1" />
                    <path d="M420,100 Q560,90 700,120 T780,300 L600,390 L400,380 Z" fill="#111827" opacity="0.6" stroke="#1f2937" strokeWidth="1" />
                    <path id="path-ocean" d="M140,240 Q280,180 440,260" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeDasharray="6 4" />
                    <path id="path-us-rail" d="M440,260 Q520,220 620,200" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="4 3" />
                    <path id="path-mexico-road" d="M510,340 Q570,300 620,200" fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="5 3" />
                    
                    {/* Animated Traversers */}
                    <circle r="5" fill="#60a5fa">
                      <animateMotion dur="8s" repeatCount="indefinite">
                        <mpath href="#path-ocean" />
                      </animateMotion>
                    </circle>
                    <polygon points="0,-3 4,3 -4,3" fill="#34d399">
                      <animateMotion dur="4s" repeatCount="indefinite">
                        <mpath href="#path-mexico-road" />
                      </animateMotion>
                    </polygon>
                    <circle r="4" fill="#f87171">
                      <animateMotion dur="5s" repeatCount="indefinite">
                        <mpath href="#path-us-rail" />
                      </animateMotion>
                    </circle>
                    
                    {/* Visual Ports & Factories */}
                    <g transform="translate(140, 240)">
                      <circle r="6" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="2" />
                      <circle r="12" fill="#3b82f6" opacity="0.2" className="animate-ping" />
                      <text x="10" y="4" fill="#faf9f8" fontSize="10" fontWeight="bold">Shanghai (S01)</text>
                    </g>
                    <g transform="translate(440, 260)">
                      <circle r="5" fill="#111827" stroke="#9ca3af" strokeWidth="2" />
                      <text x="8" y="4" fill="#9ca3af" fontSize="9">LA Gateway</text>
                    </g>
                    <g transform="translate(510, 340)">
                      <circle r="6" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
                      <circle r="12" fill="#10b981" opacity="0.2" className="animate-ping" />
                      <text x="10" y="4" fill="#faf9f8" fontSize="10" fontWeight="bold">Monterrey (S02)</text>
                    </g>
                    <g transform="translate(620, 200)">
                      <circle r="7" fill="#7f1d1d" stroke="#f87171" strokeWidth="2" />
                      <circle r="14" fill="#ef4444" opacity="0.2" className="animate-ping" />
                      <text x="12" y="4" fill="#faf9f8" fontSize="10" fontWeight="bold">Ohio Plant (P01)</text>
                    </g>
                  </svg>
                  
                  {/* Floating Map Legend */}
                  <div className="absolute bottom-4 left-4 p-2 bg-navy-900/90 rounded border border-navy-800 flex gap-4 text-[9px] text-offwhite-300">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-blue-500 block rounded-full"></span>
                      <span>Ocean Freight (China to USA)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-500 block rounded-full"></span>
                      <span>USMCA Road (Mexico to USA)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-red-500 block rounded-full"></span>
                      <span>Rail Inland Bottleneck</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Automated Alerts, News Feed, Active Logs & Sources */}
        <div className="space-y-8">
          {/* News Feed & Automated Alerts */}
          <div className="panel-card p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4 border-b border-navy-850 pb-2">
              <h3 className="text-sm font-bold flex items-center gap-2 text-amber-500">
                <Activity className="w-5 h-5 animate-pulse" />
                <span>Auto-Detected Trade Alerts</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-offwhite-300 font-mono bg-navy-950 px-2 py-0.5 rounded border border-navy-850">
                  Next: {formatTimer(refreshTimer)}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await loadDashboard();
                    setRefreshTimer(30 * 60);
                  }}
                  disabled={isRefreshing}
                  className="p-1 hover:bg-navy-800 rounded text-offwhite-300 hover:text-offwhite-50 transition-all border border-navy-800 hover:border-navy-700 disabled:opacity-50"
                  title="Manual Refresh Feed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-amber-500" : ""}`} />
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {(() => {
                const clean = (c: string) => c ? c.replace(/\./g, "").trim() : "";
                const filtered = [
                  {
                    id: "news-1",
                    headline: "US Customs issues Section 301 tariff hike warning on Lithium Battery Cells (8507.60.00.00).",
                    time: "10 mins ago",
                    hs_code: "8507.60.00.00",
                    product_description: "Lithium-Ion Battery Cells",
                    origin_country: "China",
                    destination_country: "USA",
                    old_rate: 0.034,
                    new_rate: 0.284,
                    source: "USITC"
                  },
                  {
                    id: "news-2",
                    headline: "Automotive ECU assemblies (8537.10.91.70) flagged for anti-dumping rate evaluation.",
                    time: "1 hour ago",
                    hs_code: "8537.10.91.70",
                    product_description: "Automotive ECU",
                    origin_country: "China",
                    destination_country: "USA",
                    old_rate: 0.05,
                    new_rate: 0.30,
                    source: "USITC"
                  },
                  {
                    id: "news-3",
                    headline: "Aluminum Casting tariff escalation of 10% scheduled on raw ingots (7601.10.60.00).",
                    time: "3 hours ago",
                    hs_code: "7601.10.60.00",
                    product_description: "Aluminum Casting Block",
                    origin_country: "China",
                    destination_country: "USA",
                    old_rate: 0.02,
                    new_rate: 0.12,
                    source: "USITC"
                  }
                ].filter(news => !recentEvents.some(evt => {
                  const c1 = clean(evt.hs_code);
                  const c2 = clean(news.hs_code);
                  return c1 && c2 && (c1.startsWith(c2) || c2.startsWith(c1));
                }));

                if (filtered.length === 0) {
                  return (
                    <p className="text-xs text-offwhite-300">All auto-detected alerts have been analyzed and resolved.</p>
                  );
                }

                return filtered.map((news) => (
                  <div key={news.id} className="p-3 bg-navy-950 rounded border border-navy-850 space-y-2 text-xs text-left">
                    <div className="flex justify-between items-center text-[10px] text-offwhite-300">
                      <span className="font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">ALERT DETECTED</span>
                      <span>{news.time}</span>
                    </div>
                    <h4 className="font-bold text-offwhite-50 leading-relaxed">{news.headline}</h4>
                    <div className="flex justify-between items-center pt-2 border-t border-navy-900">
                      <span className="text-[10px] text-offwhite-300">HTS: {news.hs_code}</span>
                      <button
                        onClick={() => handleAnalyze(news)}
                        disabled={analyzingId !== null}
                        className="bg-amber-600 hover:bg-amber-500 text-offwhite-50 px-3 py-1 rounded text-[10px] font-bold transition-all disabled:opacity-50"
                      >
                        {analyzingId === news.id ? "Analyzing..." : "Run Analysis"}
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Active Disruption Logs */}
          <div className="panel-card p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-500">
              <AlertCircle className="w-5 h-5" />
              <span>Active Disruption Logs</span>
            </h3>
            
            <div className="space-y-4">
              {recentEvents.length === 0 ? (
                <p className="text-xs text-offwhite-300">No active disruptions monitored. Run an HTS search or click a trade alert to trigger.</p>
              ) : (
                recentEvents.map((evt) => (
                  <div
                    key={evt.event_id}
                    onClick={() => navigate(`/disruption/${evt.event_id}`)}
                    className="p-4 bg-navy-850 rounded border border-navy-700 hover:border-navy-600 cursor-pointer transition-all space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-amber-500">{evt.hs_code}</span>
                      <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20 uppercase tracking-widest">ACTIVE</span>
                    </div>
                    <h4 className="text-xs font-bold text-offwhite-50 line-clamp-1 text-left">{evt.product_description}</h4>
                    <div className="flex justify-between items-center text-[10px] text-offwhite-300 pt-2 border-t border-navy-800">
                      <span>Source: {evt.source}</span>
                      <span>Change: +{evt.rate_change * 100}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Connected Data Sources */}
          <div className="panel-card p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-500" />
              <span>Live Registry Connections</span>
            </h3>

            <div className="space-y-3">
              {sources.map((source, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 bg-navy-950 rounded border border-navy-850 text-xs">
                  <div className="text-left">
                    <h4 className="font-bold text-offwhite-50">{source.source}</h4>
                    <p className="text-[9px] text-offwhite-300 mt-0.5">{source.coverage}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                    source.status === "connected"
                      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                      : "text-navy-600 bg-navy-700/10 border-navy-700/20"
                  }`}>
                    {source.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
