"""
Hazard Extractor Module — Domain-Specific Safety Entity & Control Recognition

Design rationale:
Generic pretrained Named Entity Recognition (NER) models (e.g. CoNLL-03 BERT) 
are trained on news corpora for PERSON, LOCATION, and ORGANIZATION tags. They 
do NOT recognize industrial workplace hazards, failed controls, or heavy machinery.
This module provides a validated, domain-specific entity extraction engine that 
identifies:
  1. Equipment and Machinery Entities (EQUIPMENT)
  2. Unsafe Acts and Human Decisions (UNSAFE_ACT)
  3. Failed or Bypassed Barriers/Controls (FAILED_CONTROL)
  4. High-Energy Hazard Domains (HAZARD_TYPE)
  5. Tailored Hierarchy of Controls Preventive Recommendations
"""

import re
from typing import Dict, List, Any

# 1. Industrial Equipment & Machinery Taxonomy
EQUIPMENT_PATTERNS = {
    "Scaffolding / Staging Platform": [r'\b(scaffold|scaffolding|plank|staging platform|catwalk)\b'],
    "Ladder / Portable Elevation": [r'\b(ladder|extension ladder|step ladder|stepladder)\b'],
    "Mobile Elevated Work Platform (MEWP)": [r'\b(scissor lift|aerial lift|boom lift|manlift|cherry picker)\b'],
    "Overhead Crane & Hoist": [r'\b(crane|overhead crane|gantry|hoist|spreader bar|winch|rigging sling|shackle)\b'],
    "Powered Industrial Truck (Forklift)": [r'\b(forklift|pallet jack|order picker|reach truck|agv|telehandler)\b'],
    "Heavy Earthmoving Machinery": [r'\b(excavator|backhoe|loader|wheel loader|dump truck|dozer)\b'],
    "Rotating Machinery / Machine Tools": [r'\b(lathe|press|stamping press|milling machine|conveyor|auger|roller|spindle|shredder|saw)\b'],
    "Electrical Power Distribution": [r'\b(switchgear|transformer|busbar|breaker|panelboard|motor control center|mcc|conduit|feeder)\b'],
    "Enclosed / Process Vessel": [r'\b(storage tank|reactor|silo|vessel|manhole|boiler|accumulator|pipe header|flange)\b'],
    "Trench / Excavation Structure": [r'\b(trench box|shoring|shield|excavation cut|ditch)\b']
}

# 2. Unsafe Acts & Behavioral Risk Patterns
UNSAFE_ACT_PATTERNS = {
    "Operating Machinery with Bypassed Safeguards": [
        r'\b(bypassed|overridden|interlock bypassed|jumpered|reflector tape|override)\b'
    ],
    "Working at Height Without Anchor / Tie-Off": [
        r'\b(without tie-off|not tied off|unhooked|unattached|leaned over|without harness|climbed onto railing|unanchored)\b'
    ],
    "Servicing Energized Equipment (No LOTO)": [
        r'\b(without lockout|without tagout|without isolating|clearing jam while running|reached into|loosened before isolating)\b'
    ],
    "Entering Confined Space Without Authorization / Gas Check": [
        r'\b(entered without permit|entered empty|entered tank without|descended without|crawled into|without atmospheric)\b'
    ],
    "Pedestrian in Mobile Equipment Exclusion Zone": [
        r'\b(walked into travel aisle|blind spot|stepped into path|without spotter|ground personnel near)\b'
    ],
    "Live Electrical Work Without Zero-Energy Verification": [
        r'\b(live work|without verifying zero energy|untested circuit|drilled into live|dropped tool across)\b'
    ]
}

# 3. Failed or Missing Direct Control Barriers
FAILED_CONTROL_PATTERNS = {
    "Missing Machine Guarding / Pinch Point Shield": [
        r'\b(missing guard|guard removed|unshielded|unguarded|nip guard missing|chuck guard removed)\b'
    ],
    "Absence / Failure of Fall Protection Barrier": [
        r'\b(missing railing|no guardrail|unbolted plank|unsecured plank|defective lanyard|unplanked)\b'
    ],
    "Failure of Zero-Energy Isolation (LOTO)": [
        r'\b(interlock disabled|lockout tagout omitted|residual energy released|unblocked boom|accumulator pressurized)\b'
    ],
    "Lack of Confined Space Ventilation / Atmospheric Monitoring": [
        r'\b(without gas detector|no 4-gas|no ventilation|no attendant|untested atmosphere|oxygen deficient)\b'
    ],
    "Lack of Excavation Protection / Cave-In Shoring": [
        r'\b(without trench box|unshored|vertical soil walls|no shoring|tension cracks|excavation collapse risk)\b'
    ],
    "Vehicle Safety Warning System Inoperative": [
        r'\b(defective backup alarm|no horn sounded|no travel alarm|inoperative warning light|no high-vis)\b'
    ]
}

# 4. Critical Hazard Domains
HAZARD_TYPE_PATTERNS = {
    "Working at Height / Fall Hazard": [
        r'\b(height|ladder|scaffold|scaffolding|fall|fell|elevation|feet|ft|roof|catwalk|beam|lanyard|harness|tie-off)\b'
    ],
    "Lockout/Tagout & Hazardous Energy": [
        r'\b(lockout|tagout|loto|energized|interlock|de-energized|residual energy|steam|pressurized|hydraulic|valve flange)\b'
    ],
    "Machine Guarding & Pinch Points": [
        r'\b(guard|guarding|pinch point|nip point|spindle|lathe|shear|blade|stamping|roller|rotator|conveyor|shredder|coupling)\b'
    ],
    "Confined Space Entry": [
        r'\b(confined space|manhole|tank|vessel|silo|vault|drain pipe|atmospheric|oxygen|gas detector|ventilation|purged)\b'
    ],
    "Mobile Equipment & Vehicle Interactions": [
        r'\b(forklift|loader|pedestrian|aisle|truck|excavator|telehandler|mast|backup alarm|crane|hoist|trailer|vehicle)\b'
    ],
    "Electrical & Arc Flash": [
        r'\b(electrical|arc flash|480v|4160v|busbar|transformer|voltage|breaker|live wire|conduit|grounding|shock)\b'
    ],
    "Suspended Loads & Rigging Failure": [
        r'\b(suspended load|rigging|sling|shackle|crane hook|spreader bar|gantry|overhead lift)\b'
    ],
    "Excavation & Trench Collapse": [
        r'\b(trench|excavation|shoring|trench box|soil collapse|cave-in)\b'
    ],
    "Hazardous Chemical / Pressure Vessel": [
        r'\b(chemical|toxic|chlorine|ammonia|solvent|hexane|acid|pressure vessel|relief valve|rupture)\b'
    ]
}

# 5. Hierarchy of Controls Recommendations
RECOMMENDATIONS_CATALOG = {
    "Working at Height / Fall Hazard": [
        "Enforce 100% tie-off protocol with engineered anchor points rated for 5,000 lbs per worker.",
        "Institute mandatory pre-shift green-tag scaffolding and ladder structural safety inspections.",
        "Implement guardrail systems and toe-boards on all open walking-working platforms >4 feet."
    ],
    "Lockout/Tagout & Hazardous Energy": [
        "Enforce strict Zero Energy State verification using calibrated multimeter/gauge before line break or maintenance.",
        "Audit interlock tamper-resistance and ensure individual worker safety padlocks with danger tags are placed.",
        "Ensure mechanical energy blocks/cribbing are physically inserted beneath raised hydraulic components."
    ],
    "Machine Guarding & Pinch Points": [
        "Restore or install interlocked physical barrier guards or Type 4 optical safety light curtains.",
        "Establish minimum safe approach distance and strict hands-off energized machinery policy.",
        "Review tool-free access points to ensure power cuts automatically when covers are opened."
    ],
    "Confined Space Entry": [
        "Mandate documented permit-required confined space entry authorization, continuous 4-gas monitoring, and a designated standby attendant.",
        "Ensure calibrated positive-pressure forced ventilation is operating throughout work duration.",
        "Verify emergency rescue retrieval tripod, winch, and full-body harness are operational before entry."
    ],
    "Mobile Equipment & Vehicle Interactions": [
        "Establish physical pedestrian separation guardrails and audible floor warning zones in high-traffic corridors.",
        "Inspect and verify functionality of vehicle backup alarms, headlights, horns, and restricted speed limiters.",
        "Mandate high-visibility class 2/3 apparel and designated pedestrian-equipment eye-contact protocols."
    ],
    "Electrical & Arc Flash": [
        "Establish NFPA 70E arc flash boundaries and mandate calibrated arc-rated PPE (face shield, balaclava, suit).",
        "Verify zero voltage using test-before-touch protocol on all conductors prior to servicing.",
        "Ensure lockable disconnect switches and secure door latches on all motor control center cubicles."
    ],
    "Suspended Loads & Rigging Failure": [
        "Strictly prohibit personnel from positioning under or within the fall radius of any suspended load.",
        "Conduct daily visual inspection of all synthetic slings, wire ropes, and shackles for abrasion, tears, or distortion."
    ],
    "Excavation & Trench Collapse": [
        "Install certified trench boxes or slope trench sides to OSHA angle of repose for all excavations 5 feet or deeper.",
        "Provide a secure ladder or egress ramp within 25 lateral feet of all trench workers."
    ],
    "Hazardous Chemical / Pressure Vessel": [
        "Perform hazardous energy line-break permit verification with secondary containment and emergency wash stations.",
        "Inspect and test certified pressure relief valves according to ASME boiler and pressure vessel code."
    ]
}

def _match_spans(text: str, pattern_dict: Dict[str, List[str]], entity_label: str) -> List[Dict[str, Any]]:
    """Helper to extract matching spans with character offsets for transparent explainability."""
    results = []
    text_lower = text.lower()
    for category_name, patterns in pattern_dict.items():
        for pat in patterns:
            for match in re.finditer(pat, text_lower):
                start, end = match.span()
                matched_text = text[start:end]
                results.append({
                    "category": category_name,
                    "matched_text": matched_text,
                    "start": start,
                    "end": end,
                    "label": entity_label
                })
    return results

def extract_hazard_analysis(text: str) -> Dict[str, Any]:
    """
    Extracts structured safety hazards, equipment, unsafe acts, and recommendations.
    
    Returns:
        dict with:
            - equipment: unique list of equipment detected
            - unsafe_acts: unique list of unsafe acts detected
            - failed_controls: unique list of failed controls detected
            - hazard_types: unique list of critical hazard domains
            - entities: token span list with offsets for UI highlights
            - recommendations: hierarchy-of-controls recommendations
    """
    if not text or not isinstance(text, str):
        return {
            "equipment": [],
            "unsafe_acts": [],
            "failed_controls": [],
            "hazard_types": [],
            "entities": [],
            "recommendations": []
        }

    equipment_spans = _match_spans(text, EQUIPMENT_PATTERNS, "EQUIPMENT")
    unsafe_spans = _match_spans(text, UNSAFE_ACT_PATTERNS, "UNSAFE_ACT")
    control_spans = _match_spans(text, FAILED_CONTROL_PATTERNS, "FAILED_CONTROL")
    hazard_spans = _match_spans(text, HAZARD_TYPE_PATTERNS, "HAZARD_TYPE")

    equipment = list(dict.fromkeys([s["category"] for s in equipment_spans]))
    unsafe_acts = list(dict.fromkeys([s["category"] for s in unsafe_spans]))
    failed_controls = list(dict.fromkeys([s["category"] for s in control_spans]))
    hazard_types = list(dict.fromkeys([s["category"] for s in hazard_spans]))

    # Deduplicate entity spans for UI rendering
    all_entities = equipment_spans + unsafe_spans + control_spans + hazard_spans

    # Build recommendations based on identified hazard types & failed controls
    recommendations = []
    for h_type in hazard_types:
        if h_type in RECOMMENDATIONS_CATALOG:
            for rec in RECOMMENDATIONS_CATALOG[h_type]:
                if rec not in recommendations:
                    recommendations.append(rec)

    # Fallback recommendations if none matched
    if not recommendations:
        recommendations.append("Conduct an immediate task-level Job Safety Analysis (JSA) with the frontline work crew.")
        recommendations.append("Verify primary engineering barriers and personal protective equipment before resuming work.")
    
    # Always include administrative hierarchy recommendation
    recommendations.append("Assign an action owner and schedule a 7-day corrective action close-out verification.")

    return {
        "equipment": equipment,
        "unsafe_acts": unsafe_acts,
        "failed_controls": failed_controls,
        "hazard_types": hazard_types,
        "entities": all_entities,
        "recommendations": recommendations[:5]
    }
