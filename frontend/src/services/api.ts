const BASE_URL = import.meta.env.VITE_API_URL || "/api";

async function request(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP ${response.status}`);
  }
  return response.json();
}

export const api = {
  // Dashboard
  getDashboard: () => request("/dashboard"),
  
  // Tariffs Search & Custom Run
  searchTariffs: (query: string) => request(`/tariffs/search?query=${encodeURIComponent(query)}`),
  runTariffAnalysis: (data: {
    hs_code: string;
    origin_country: string;
    destination_country: string;
    old_rate: number;
    new_rate: number;
    product_description?: string;
    source?: string;
  }) => request("/tariffs/analyze", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  
  // Scenarios Workspace
  getScenarios: (eventId: string) => request(`/scenarios/${eventId}`),
  
  // Agent Status Logs
  getAgentStatus: (eventId: string) => request(`/agents/status/${eventId}`),
  
  // Decision Center
  getDecision: (eventId: string) => request(`/decisions/${eventId}`),
  approveDecision: (eventId: string) => request(`/decisions/${eventId}/approve`, { method: "POST" }),
  rejectDecision: (eventId: string) => request(`/decisions/${eventId}/reject`, { method: "POST" }),
  
  // Audit Trail
  getAuditTrail: (eventId: string) => request(`/audit/${eventId}`),
  
  // Supplier Portal
  getSuppliers: () => request("/suppliers"),
  getSupplierPortalView: (supplierId: string) => request(`/suppliers/${supplierId}`),
  updateSupplierPortal: (data: {
    supplier_id: string;
    component_id: string;
    capacity_units_per_month: number;
    lead_time_days: number;
    origin_country: string;
  }) => request("/suppliers/update", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  
  // Copilot Chat
  chatCopilot: (message: string, history: Array<{ role: string; content: string }> = []) => request("/copilot/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  }),
};
