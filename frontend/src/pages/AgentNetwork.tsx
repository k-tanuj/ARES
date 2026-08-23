import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import ReactFlow, { Background, Controls, Position } from "reactflow";
import type { Node, Edge } from "reactflow";
import "reactflow/dist/style.css";
import { Clock } from "lucide-react";
import { api } from "../services/api";

export const AgentNetwork: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);

  const loadAgentStatus = async () => {
    if (!eventId) return;
    try {
      const data = await api.getAgentStatus(eventId);
      setLogs(data);
      if (data.length > 0 && !selectedAgent) {
        setSelectedAgent(data[0]);
      }
    } catch (err) {
      console.error("Failed to load agent statuses:", err);
    }
  };

  useEffect(() => {
    loadAgentStatus();
    // Poll every 3 seconds during analysis workflows
    const interval = setInterval(loadAgentStatus, 3000);
    return () => clearInterval(interval);
  }, [eventId]);

  const getAgentLog = (name: string) => {
    return logs.find((l) => l.agent_name.toLowerCase() === name.toLowerCase()) || {
      agent_name: name,
      status: "IDLE",
      duration_ms: 0,
      reasoning: "Waiting for trigger event in state graph...",
      evidence: "N/A",
      input_data: "{}",
      output_data: "{}"
    };
  };

  // Define React Flow nodes dynamically based on active status
  const getGraphNodes = (): Node[] => {
    const agentsList = [
      { name: "Tariff Intelligence", x: 50, y: 150 },
      { name: "Supplier Intelligence", x: 250, y: 50 },
      { name: "Manufacturer Impact", x: 250, y: 250 },
      { name: "Inventory Intelligence", x: 450, y: 50 },
      { name: "Logistics Intelligence", x: 450, y: 250 },
      { name: "Finance Intelligence", x: 650, y: 150 },
      { name: "Compliance Intelligence", x: 850, y: 50 },
      { name: "Scenario Analysis", x: 850, y: 250 },
      { name: "Decision Recommendation", x: 1050, y: 150 }
    ];

    return agentsList.map((agent, idx) => {
      const log = getAgentLog(agent.name);
      let bg = "#0b0f19";
      let border = "1px solid #26354a";
      let text = "#faf9f8";

      if (log.status === "PROCESSING") {
        bg = "#78350f";
        border = "1px solid #d97706";
        text = "#fde68a";
      } else if (log.status === "COMPLETED") {
        bg = "#065f46";
        border = "1px solid #059669";
        text = "#a7f3d0";
      } else if (log.status === "FAILED") {
        bg = "#7f1d1d";
        border = "1px solid #ef4444";
        text = "#fca5a5";
      }

      return {
        id: `agent-${idx}`,
        data: { label: agent.name },
        position: { x: agent.x, y: agent.y },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        style: { background: bg, color: text, border: border, fontSize: "11px", fontWeight: "bold" }
      };
    });
  };

  const getGraphEdges = (): Edge[] => {
    return [
      { id: "e1-2", source: "agent-0", target: "agent-1", animated: true },
      { id: "e1-3", source: "agent-0", target: "agent-2", animated: true },
      { id: "e2-4", source: "agent-1", target: "agent-3" },
      { id: "e3-5", source: "agent-2", target: "agent-4" },
      { id: "e4-6", source: "agent-3", target: "agent-5" },
      { id: "e5-6", source: "agent-4", target: "agent-5" },
      { id: "e6-7", source: "agent-5", target: "agent-6", animated: true },
      { id: "e6-8", source: "agent-5", target: "agent-7", animated: true },
      { id: "e7-9", source: "agent-6", target: "agent-8" },
      { id: "e8-9", source: "agent-7", target: "agent-8" }
    ];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold tracking-widest text-navy-600 uppercase">LANGGRAPH MULTI-AGENT STATE MONITOR</span>
        <h1 className="text-2xl font-extrabold text-offwhite-50 mt-1">Agent Network Status</h1>
        <p className="text-xs text-offwhite-300 mt-0.5">Audit live node transitions, runtime execution payloads, and decision weights.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Flow Graph */}
        <div className="lg:col-span-2 panel-card rounded-lg overflow-hidden h-[500px] flex flex-col">
          <div className="p-4 border-b border-navy-800 bg-navy-900/50 flex justify-between items-center">
            <span className="text-sm font-bold text-offwhite-50">Active LangGraph Topology</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded font-black uppercase tracking-widest">Active state graph</span>
          </div>
          <div className="flex-1 bg-navy-950">
            <ReactFlow
              nodes={getGraphNodes()}
              edges={getGraphEdges()}
              onNodeClick={(_, node) => {
                const name = node.data.label;
                setSelectedAgent(getAgentLog(name));
              }}
              fitView
            >
              <Background color="#1a2332" gap={16} />
              <Controls />
            </ReactFlow>
          </div>
        </div>

        {/* Right 1 Column: Selected Agent Details */}
        <div className="panel-card p-6 rounded-lg space-y-6 flex flex-col justify-between h-[500px] overflow-y-auto">
          {selectedAgent ? (
            <div className="space-y-4 text-xs">
              <div className="border-b border-navy-800 pb-3">
                <span className="text-[10px] font-bold text-navy-600 uppercase tracking-widest">SELECTED NODE</span>
                <h3 className="text-lg font-black text-offwhite-50 mt-1">{selectedAgent.agent_name}</h3>
                
                <div className="flex gap-4 mt-2">
                  <span className={`status-badge ${
                    selectedAgent.status === "COMPLETED"
                      ? "badge-safe"
                      : selectedAgent.status === "PROCESSING"
                      ? "badge-watch"
                      : selectedAgent.status === "FAILED"
                      ? "badge-risk"
                      : "bg-navy-800 text-offwhite-300"
                  }`}>
                    {selectedAgent.status}
                  </span>
                  
                  <span className="flex items-center gap-1 text-offwhite-300">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{selectedAgent.duration_ms || 0}ms</span>
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-semibold text-offwhite-300 block">Agent Cognitive Reasoning</span>
                <div className="p-3 bg-navy-950 rounded border border-navy-850 text-offwhite-300 leading-relaxed max-h-36 overflow-y-auto">
                  {selectedAgent.reasoning || "Waiting for node processing..."}
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-offwhite-300 block">Citations & Evidence Reference</span>
                <p className="p-2 bg-navy-950 rounded border border-navy-850 text-[10px] text-offwhite-300 italic">
                  {selectedAgent.evidence || "No citations logged."}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-navy-850">
                <span className="font-semibold text-offwhite-300 block">Payload Details</span>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="p-2 bg-navy-950 rounded border border-navy-850">
                    <span className="text-offwhite-300 block font-semibold mb-1 uppercase tracking-wider">Input Payload</span>
                    <pre className="overflow-x-auto text-offwhite-300 max-h-20">{selectedAgent.input_data ? JSON.stringify(JSON.parse(selectedAgent.input_data), null, 2) : "{}"}</pre>
                  </div>
                  <div className="p-2 bg-navy-950 rounded border border-navy-850">
                    <span className="text-offwhite-300 block font-semibold mb-1 uppercase tracking-wider">Output Payload</span>
                    <pre className="overflow-x-auto text-offwhite-300 max-h-20">{selectedAgent.output_data ? JSON.stringify(JSON.parse(selectedAgent.output_data), null, 2) : "{}"}</pre>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-xs text-offwhite-300 my-auto">
              Select an agent node on the flow topology to inspect inputs and logs.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
