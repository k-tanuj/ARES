import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { LandingPage } from "./pages/LandingPage";
import { Dashboard } from "./pages/Dashboard";
import { DisruptionDetail } from "./pages/DisruptionDetail";
import { Scenarios } from "./pages/Scenarios";
import { Decisions } from "./pages/Decisions";
import { AgentNetwork } from "./pages/AgentNetwork";
import { SupplierPortal } from "./pages/SupplierPortal";
import { AuditTrail } from "./pages/AuditTrail";
import { DisruptionHistory } from "./pages/DisruptionHistory";
import { CopilotWidget } from "./components/CopilotWidget";

// Layout wrapper that injects Navbar dynamically based on current path
const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const showNav = location.pathname !== "/";
  
  // Extract eventId from URL if exists to link navigation items
  const match = location.pathname.match(/\/(?:disruption|scenarios|decisions|agents|audit)\/([^\/]+)/);
  const activeEventId = match ? match[1] : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-navy-950 text-offwhite-50">
      {showNav && <Navbar activeEventId={activeEventId} />}
      <main className="flex-1">
        {children}
      </main>
      {showNav && <CopilotWidget />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <LayoutWrapper>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/history" element={<DisruptionHistory />} />
          <Route path="/disruption/:eventId" element={<DisruptionDetail />} />
          <Route path="/scenarios/:eventId" element={<Scenarios />} />
          <Route path="/decisions/:eventId" element={<Decisions />} />
          <Route path="/agents/:eventId" element={<AgentNetwork />} />
          <Route path="/supplier" element={<SupplierPortal />} />
          <Route path="/audit/:eventId" element={<AuditTrail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </LayoutWrapper>
    </BrowserRouter>
  );
};

export default App;
