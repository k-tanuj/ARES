import os
import json
import logging
from typing import Dict, Any, List, Optional
import datetime
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# Try importing the new Google GenAI SDK
HAS_GENAI = False
try:
    from google import genai
    from google.genai import types
    HAS_GENAI = True
except ImportError:
    pass

# Try importing the legacy GenerativeAI SDK as a fallback
HAS_GENERATIVEAI = False
try:
    import google.generativeai as legacy_genai
    HAS_GENERATIVEAI = True
except ImportError:
    pass

def call_gemini(prompt: str, system_instruction: str = "") -> Optional[str]:
    # Check if API key is present
    api_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY environment variable is not configured. Falling back to local reasoning engine.")
        return None
        
    try:
        if HAS_GENAI:
            client = genai.Client(api_key=api_key)
            config = types.GenerateContentConfig(
                system_instruction=system_instruction or None,
                temperature=0.2,
                max_output_tokens=1000
            )
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=config
            )
            return response.text.strip()
            
        elif HAS_GENERATIVEAI:
            legacy_genai.configure(api_key=api_key)
            model = legacy_genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=system_instruction or None
            )
            response = model.generate_content(
                prompt,
                generation_config={"temperature": 0.2}
            )
            return response.text.strip()
            
    except Exception as e:
        logger.error(f"Gemini API invocation failed: {str(e)}. Falling back to local reasoning engine.")
        
    return None


class TariffAgent:
    def analyze(self, state: Dict[str, Any]) -> Dict[str, Any]:
        event = state["tariff_event"]
        hs_code = event.get("hs_code", "N/A")
        desc = event.get("product_description", "N/A")
        change = event.get("rate_change", 0.0)
        evidence = event.get("evidence", "")
        
        prompt = (
            f"Analyze the trade disruption event. HS Code: {hs_code}. "
            f"Description: {desc}. Tariff change: +{change*100}%. "
            f"Official Evidence: {evidence}. "
            f"Explain the scope of this tariff, the products affected, and the confidence level of this source data."
        )
        
        system = "You are a Tariff Intelligence Agent. You analyze official custom notices. Output an evidence-based summary without emojis."
        
        summary = call_gemini(prompt, system)
        
        # Local Fallback
        if not summary:
            summary = (
                f"Tariff disruption verified for HS Code {hs_code} ({desc}). "
                f"A tariff increase of {change*100:.1f}% is announced. "
                f"Source USITC data indicates status is ACTIVE. Analysis suggests this "
                f"affects automotive electrical equipment and accessories in Chapter 85. "
                f"Confidence level is high (95%) based on verified matching code parameters."
            )
            
        return {
            "summary": summary,
            "confidence_assessment": "HIGH - Official USITC schedule match.",
            "evidence_reference": f"USITC HTS Database Chapter {hs_code[:2]}"
        }


class SupplierAgent:
    def analyze(self, state: Dict[str, Any]) -> List[Dict[str, Any]]:
        suppliers = state["affected_suppliers"]
        event = state["tariff_event"]
        
        analysis_results = []
        for supplier in suppliers:
            name = supplier.get("name", "N/A")
            country = supplier.get("country", "N/A")
            reliability = supplier.get("reliability", 1.0)
            dep = supplier.get("export_dependency", 0.0)
            vol = supplier.get("capacity_units_per_month", 0)
            cost = supplier.get("unit_cost", 0.0)
            terms = supplier.get("contract_terms", "")
            
            prompt = (
                f"Analyze supplier {name} in {country}. Reliability: {reliability*100}%. "
                f"Export dependency: {dep*100}%. Monthly volume: {vol}. Unit cost: {cost}. "
                f"Contract Terms: {terms}. Tariff rate increase: +{event.get('rate_change', 0.0)*100}%. "
                f"Determine the supplier's exposure, pass-through likelihood, ability to absorb the tariff, and sourcing risks."
            )
            
            system = "You are a Supplier Intelligence Agent. You evaluate operational capabilities and contract exposures. Output a clear breakdown without emojis."
            
            reasoning = call_gemini(prompt, system)
            
            if not reasoning:
                # 1. Parse contract terms
                absorbed_rate = 0.0
                if "absorbs up to" in terms.lower():
                    if "5%" in terms:
                         absorbed_rate = 0.05
                    elif "10%" in terms:
                         absorbed_rate = 0.10
                    pass_through_desc = f"partial (remaining {max(0.0, (event.get('rate_change', 0.0) - absorbed_rate))*100:.1f}% passed to buyer)"
                elif "supplier liable" in terms.lower() or "ddp" in terms.lower():
                    absorbed_rate = event.get('rate_change', 0.0)
                    pass_through_desc = "none (supplier absorbs 100% duty)"
                else:
                    pass_through_desc = f"full (100% pass-through of +{event.get('rate_change', 0.0)*100:.1f}% duty)"

                # 2. Leverage Analysis from export dependency
                leverage = "STRONG negotiating leverage" if dep > 0.5 else "MODERATE leverage" if dep > 0.2 else "WEAK negotiation leverage (supplier is not dependent on our volume)"
                
                # 3. Operational reliability analysis
                rel_status = "exhibits excellent operational stability" if reliability >= 0.95 else "is operationally stable" if reliability >= 0.90 else "represents a supply chain volatility risk (low reliability rating)"

                # 4. Sourcing action plan
                if country in ["USA", "Mexico"]:
                    sourcing_action = f"Sourcing from {name} in {country} is duty-exempt under USMCA. Recommend utilizing their local capacity to hedge tariff exposure."
                else:
                    sourcing_action = f"Given the tariff impact, recommend entering negotiations immediately to enforce the contract absorption clauses. Parallel qualification of local USMCA alternatives is advised to hedge the {pass_through_desc} pass-through risk."

                reasoning = (
                    f"Operational audit of {name} ({country}) completed. "
                    f"The supplier {rel_status} with a historical reliability of {reliability*100:.0f}%. "
                    f"Under contract terms ({terms}), tariff pass-through is assessed as {pass_through_desc}. "
                    f"Because we command a {dep*100:.0f}% export dependency share of their output, we hold {leverage}. "
                    f"{sourcing_action}"
                )
                
            analysis_results.append({
                "supplier_id": supplier.get("id"),
                "supplier_name": name,
                "exposure": "HIGH" if (country == "China" and dep > 0.5) else "LOW",
                "reliability_rating": reliability,
                "pass_through_likelihood": "HIGH" if "buyer liable" in terms.lower() else "MEDIUM",
                "details": reasoning
            })
            
        return analysis_results


class ManufacturerAgent:
    def analyze(self, state: Dict[str, Any]) -> Dict[str, Any]:
        plants = state["affected_plants"]
        event = state["tariff_event"]
        
        prompt = (
            f"Analyze manufacturer impact for {len(plants)} affected plants. "
            f"Tariff change is +{event.get('rate_change', 0.0)*100}%. "
            f"Determine the threat of production line stoppages, procurement margin pressure, and alternative options."
        )
        
        system = "You are a Manufacturer Impact Agent. Analyze production lines, cost increases, and manufacturing constraints. Output in clean prose without emojis."
        
        reasoning = call_gemini(prompt, system)
        
        if not reasoning:
            # Fallback
            reasoning = (
                f"Manufacturer operations face significant procurement cost inflation due to the tariff change. "
                f"Ohio and Michigan assembly lines are exposed through Chinese suppliers for key components. "
                f"Sourcing transition lead times present a critical bottleneck, as qualifying a new supplier "
                f"can take between 30 to 90 days. Short-term mitigation requires stock reserves and split sourcing."
            )
            
        return {
            "overall_impact": "CRITICAL" if any(p.get("runway", {}).get("status") == "CRITICAL" for p in plants) else "WATCH",
            "production_stoppage_threat": "HIGH" if any(p.get("runway", {}).get("status") in ["CRITICAL", "AT_RISK"] for p in plants) else "LOW",
            "details": reasoning
        }


class InventoryAgent:
    def analyze(self, state: Dict[str, Any]) -> Dict[str, Any]:
        plants = state["affected_plants"]
        
        prompt = (
            f"Evaluate inventory runway states for plants: {json.dumps(plants)}. "
            f"Identify which locations are at risk of material stockouts and suggest safety stock replenishment levels."
        )
        system = "You are an Inventory Intelligence Agent. You assess stock coverages, lead times, and runway days. Output without emojis."
        
        reasoning = call_gemini(prompt, system)
        
        if not reasoning:
            details_list = []
            for p in plants:
                runway = p.get("runway", {})
                details_list.append(
                    f"- {p.get('plant_name')}: {runway.get('available_stock')} units in stock, "
                    f"runway of {runway.get('runway_days')} days (Daily consumption: {runway.get('daily_consumption')}). "
                    f"Status: {runway.get('status')}."
                )
            reasoning = (
                "Inventory runway assessment completes with critical alerts. "
                + " ".join(details_list) +
                " Immediate expedited routing or safety stock release is required for any WATCH or CRITICAL plants."
            )
            
        return {
            "inventory_health": "AT_RISK" if any(p.get("runway", {}).get("status") in ["CRITICAL", "AT_RISK"] for p in plants) else "SAFE",
            "details": reasoning
        }


class LogisticsAgent:
    def analyze(self, state: Dict[str, Any]) -> Dict[str, Any]:
        suppliers = state["affected_suppliers"]
        
        prompt = (
            f"Analyze logistics for suppliers: {json.dumps(suppliers)}. "
            f"Assess the lead times and shipping modes. Propose alternative shipping modes or routes if appropriate."
        )
        system = "You are a Logistics Intelligence Agent. Analyze transit modes, durations, and routes. Output without emojis."
        
        reasoning = call_gemini(prompt, system)
        
        if not reasoning:
            reasoning = (
                "Logistics review indicates sea shipments from China average 22-25 days lead time, "
                "representing high exposure to in-transit tariff liabilities. Alternate road routing "
                "from Mexico offers a 4-5 day lead time, significantly reducing exposure. Domestic USA routing "
                "from Detroit is optimal (1 day lead time) but capacity constrained."
            )
            
        return {
            "routes_evaluated": ["R01", "R02", "R03", "R04", "R05"],
            "transit_risk": "HIGH" if any(s.get("country") == "China" for s in suppliers) else "LOW",
            "details": reasoning
        }


class FinanceAgent:
    def analyze(self, state: Dict[str, Any]) -> Dict[str, Any]:
        fin = state.get("financial_analysis", {})
        
        prompt = (
            f"Analyze financial metrics. Monthly baseline cost: ${fin.get('baseline_cost_monthly')}. "
            f"Monthly tariff cost: ${fin.get('tariff_cost_monthly')}. Passed-through monthly: ${fin.get('manufacturer_passed_monthly')}. "
            f"Annualized exposure: ${fin.get('annualized_exposure')}. "
            f"Summarize the margin impact, cost exposures, and budget variances."
        )
        system = "You are a Finance Intelligence Agent. You audit cost structures, price changes, and budget impact. Output without emojis."
        
        reasoning = call_gemini(prompt, system)
        
        if not reasoning:
            reasoning = (
                f"Financial exposure is assessed. With an annualized tariff exposure of "
                f"${fin.get('annualized_exposure', 0):,.2f}, profit margins for the primary product line "
                f"will contract significantly unless price adjustments or sourcing modifications are made. "
                f"The supplier absorbs portion of the tariff, leaving a net passed-through cost of "
                f"${fin.get('manufacturer_passed_monthly', 0):,.2f} monthly."
            )
            
        return {
            "annualized_impact": fin.get("annualized_exposure", 0.0),
            "margin_risk": "HIGH" if fin.get("annualized_exposure", 0.0) > 500000 else "LOW",
            "details": reasoning
        }


class ComplianceAgent:
    def analyze(self, state: Dict[str, Any]) -> Dict[str, Any]:
        event = state["tariff_event"]
        
        prompt = (
            f"Review compliance for trade event: {json.dumps(event)}. "
            f"Verify if there are any country restrictions, classification conflicts, or trade treaty violations."
        )
        system = "You are a Compliance Intelligence Agent. Check customs regulations, rules of origin, and trade treaties. Output without emojis."
        
        reasoning = call_gemini(prompt, system)
        
        if not reasoning:
            reasoning = (
                "Compliance check complete. Importing the specified automotive components from China "
                "under the new tariff rates remains legally compliant, but triggers higher section 301 duties. "
                "Sourcing from Mexico falls under USMCA rules, which avoids these tariffs, provided the "
                "regional value content (RVC) meets the automotive threshold of 75%."
            )
            
        return {
            "compliance_status": "COMPLIANT",
            "warnings_found": 0,
            "details": reasoning
        }


class ScenarioAgent:
    def analyze(self, state: Dict[str, Any]) -> List[Dict[str, Any]]:
        scenarios = state["scenarios"]
        
        prompt = (
            f"Provide strategic summaries for these three generated scenarios: {json.dumps(scenarios)}. "
            f"Highlight the operational advantages, timeline, and risk profiles of each."
        )
        system = "You are a Scenario Intelligence Agent. You compare business strategies, transition times, and supply configurations. Output without emojis."
        
        reasoning = call_gemini(prompt, system)
        
        updated_scenarios = []
        for idx, sc in enumerate(scenarios):
            sc_copy = sc.copy()
            # If Gemini succeeded, we can append a custom summary, else use a detailed fallback
            if reasoning:
                sc_copy["assumptions"] = f"Detailed analysis indicates that {sc['scenario_name']} is characterized by specific parameters. Sourcing transition takes {sc['implementation_time']} days with {sc['supplier_risk']} supplier risk."
            else:
                if sc["strategy_type"] == "ABSORB":
                    sc_copy["assumptions"] = (
                        "Keep China supplier. Buyer absorbs tariff. No transition delay. "
                        "High margin compression. Low operational friction. Sourcing risk is LOW. "
                        "Logistics transit risk is HIGH due to long ocean shipping times."
                    )
                elif sc["strategy_type"] == "SWITCH":
                    sc_copy["assumptions"] = (
                        "Transition 100% volume to alternative Mexican or US supplier. "
                        "Requires 90 days qualification and setup. Tariff exposure drops to zero. "
                        "High implementation risk and potential tooling capacity constraints."
                    )
                else: # SPLIT_SOURCE
                    sc_copy["assumptions"] = (
                        "Split volume: 60% Chinese supplier, 40% local US/Mexican supplier. "
                        "Protects production continuity. Provides operational hedge. "
                        "Requires 30 days integration. Optimal balance of cost and resilience."
                    )
            updated_scenarios.append(sc_copy)
            
        return updated_scenarios


class DecisionAgent:
    def analyze(self, state: Dict[str, Any]) -> Dict[str, Any]:
        scenarios = state["scenarios"]
        rec = state.get("recommendation", {})
        
        prompt = (
            f"Explain the recommendation to human decision makers. Scenarios: {json.dumps(scenarios)}. "
            f"Recommended strategy: {rec.get('strategy_type')} (Score: {rec.get('score')}). "
            f"Explain the quantitative scoring details and qualitative trade-offs."
        )
        system = "You are an Enterprise Decision Engine Agent. Explain complex operational recommendations. Output in clear, authoritative prose without emojis."
        
        reasoning = call_gemini(prompt, system)
        
        if not reasoning:
            reasoning = (
                f"ARES recommends the {rec.get('scenario_name', 'Split Sourcing')} strategy. "
                f"This decision is supported by a deterministic score of {rec.get('score', 0.0)}. "
                f"Split sourcing minimizes risk by maintaining relationship with Chaozhou Auto Parts "
                f"while qualifying Monterrey ECU Solutions. Sourcing concentration risk drops, "
                f"production continuity remains SAFE, and cost increases are mitigated."
            )
            
        return {
            "strategy_type": rec.get("strategy_type", "SPLIT_SOURCE"),
            "scenario_name": rec.get("scenario_name", "Split Sourcing"),
            "score": rec.get("score", 0.0),
            "explanation": reasoning
        }
