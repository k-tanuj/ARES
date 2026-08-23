import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Compass, Shield, Users } from "lucide-react";

export const LandingPage: React.FC = () => {
  return (
    <div className="bg-navy-950 text-offwhite-50 min-h-screen">
      {/* Navigation Header */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between border-b border-navy-800">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-2xl tracking-wider text-offwhite-50">ARES</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-navy-800 text-offwhite-300 tracking-widest uppercase">RESILIENCE</span>
        </div>
        <Link
          to="/dashboard"
          className="flex items-center gap-2 bg-offwhite-100 hover:bg-offwhite-200 text-navy-950 font-bold px-5 py-2.5 rounded-md text-sm transition-all"
        >
          <span>Launch Mission Control</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 border-b border-navy-800">
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6">
            ARES — Autonomous Resilience & Enterprise Supply Chain
          </h1>
          <p className="text-lg sm:text-xl text-offwhite-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Monitor international trade remedies. Predict supply chain vulnerabilities. Simulate dual-sided impact. Empower human operators with auditable decision models.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-offwhite-100 hover:bg-offwhite-200 text-navy-950 font-extrabold px-8 py-4 rounded-md transition-all"
            >
              <span>Launch Mission Control</span>
              <Compass className="w-5 h-5" />
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto flex items-center justify-center gap-2 border border-navy-700 bg-navy-900/50 hover:bg-navy-800/50 text-offwhite-100 px-8 py-4 rounded-md transition-all font-bold"
            >
              <span>See How ARES Works</span>
            </a>
          </div>
        </div>
        
        {/* Subtle Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      </section>

      {/* Problem propagation */}
      <section className="py-20 border-b border-navy-800 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" id="how-it-works">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-widest text-navy-600 uppercase">THE DISRUPTION CHAIN</span>
          <h2 className="text-3xl font-extrabold mt-2">Tariff shocks propagate in cascades</h2>
          <p className="text-offwhite-300 mt-4 max-w-xl mx-auto">
            A single border tariff does not stop at price increases. It triggers a cascade across the entire operational network.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { step: "01", title: "Supplier Level", desc: "Tariffs stress exporter margins, utilization capacity, and lead times in the origin country." },
            { step: "02", title: "Inventory Level", desc: "Safety stock runways contract at domestic plants, introducing shortage risk and line stoppage hazards." },
            { step: "03", title: "Logistics Level", desc: "Ocean freight lead times bind capital, prompting shifts to alternate routes or nearshore USMCA corridors." },
            { step: "04", title: "Financial Level", desc: "Procurement cost increases passed downstream compress margins, shifting price weights on standard components." }
          ].map((item, idx) => (
            <div key={idx} className="panel-card p-8 rounded-lg relative overflow-hidden">
              <span className="text-4xl font-extrabold text-navy-800 absolute top-4 right-4">{item.step}</span>
              <h3 className="text-xl font-bold text-offwhite-50 mt-4 mb-2">{item.title}</h3>
              <p className="text-sm text-offwhite-300 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Solution & Agent Grid */}
      <section className="py-20 bg-navy-900/50 border-b border-navy-800 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-widest text-navy-600 uppercase">THE COOPERATIVE SOLUTION</span>
          <h2 className="text-3xl font-extrabold mt-2">Specialized Agentic AI Orchestration</h2>
          <p className="text-offwhite-300 mt-4 max-w-xl mx-auto">
            ARES coordinates specialized AI agents over a shared LangGraph state to evaluate every aspect of resilience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { name: "Tariff Intelligence", desc: "Queries live USITC customs schedules, decodes regulatory footnotes, and calculates rates change." },
            { name: "Supplier Intelligence", desc: "Monitors exporter export dependencies, contract liabilities, and capacity thresholds." },
            { name: "Inventory Intelligence", desc: "Calculates stock runways, daily consumptions, and categorizes shortage risks dynamically." },
            { name: "Logistics Intelligence", desc: "Evaluates transit durations, freight lanes, and proposes road vs. ocean alternatives." },
            { name: "Finance Intelligence", desc: "Calculates monthly passed-through duties and models margins compression using Python math." },
            { name: "Compliance & Scenarios", desc: "Verifies trade treaty rules (USMCA), lists absorb/switch/split scenarios, and recommends scores." }
          ].map((agent, idx) => (
            <div key={idx} className="panel-card p-6 rounded-lg flex gap-4">
              <div className="w-10 h-10 rounded bg-navy-800 flex items-center justify-center text-offwhite-300 shrink-0 font-bold">
                {idx + 1}
              </div>
              <div>
                <h4 className="font-bold text-offwhite-50 mb-1">{agent.name}</h4>
                <p className="text-xs text-offwhite-300 leading-relaxed">{agent.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dual Perspective */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-widest text-navy-600 uppercase">TWO-SIDED MODELLING</span>
          <h2 className="text-3xl font-extrabold mt-2">Manufacturer vs. Supplier Resilience</h2>
          <p className="text-offwhite-300 mt-4 max-w-xl mx-auto">
            Resilience requires understanding both sides. ARES models metrics for both buyer and seller perspectives.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Manufacturer View */}
          <div className="panel-card p-8 rounded-lg border-l-4 border-l-blue-500">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-500" />
              <span>Manufacturer Metrics</span>
            </h3>
            <ul className="space-y-3 text-sm text-offwhite-300">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span>Procurement Unit Cost & Marginal Impact</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span>Safety Stock Runway Days & Stoppage Risk</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span>Alternative Sourcing Integration Lead Times</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span>Logistics Re-routing Cost Margins</span>
              </li>
            </ul>
          </div>

          {/* Supplier View */}
          <div className="panel-card p-8 rounded-lg border-l-4 border-l-amber-500">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-amber-500" />
              <span>Supplier Metrics</span>
            </h3>
            <ul className="space-y-3 text-sm text-offwhite-300">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Export Dependency & Exposure Ratios</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Capacity Utilizations & Available Spares</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Contractual Pass-Through Likelihoods</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Alternate Markets & Relocation Options</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-20 border-t border-navy-800 text-center bg-navy-950">
        <h2 className="text-3xl sm:text-4xl font-extrabold mb-6">Turn disruption into an evidence-backed decision</h2>
        <p className="text-offwhite-300 max-w-md mx-auto mb-8 text-sm sm:text-base">
          Connect live trade monitors, coordinate specialized AI agents, and run scenarios inside ARES Mission Control.
        </p>
        <Link
          to="/dashboard"
          className="bg-offwhite-100 hover:bg-offwhite-200 text-navy-950 font-extrabold px-8 py-4 rounded-md inline-flex items-center gap-2 transition-all"
        >
          <span>Launch Mission Control</span>
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
    </div>
  );
};
