# file: main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
import pandas as pd
from typing import Dict, List

# -----------------------------
# Config
# -----------------------------
ROLES_PATH = "roles.json"
OWNER_WALLET = "0x5d4143c95673cba6"
PLAYERS_API = (
    f"https://z519wdyajg.execute-api.us-east-1.amazonaws.com/prod/players"
    f"?limit=1500&ownerWalletAddress={OWNER_WALLET}"
)
MARKETPLACE_API = "https://z519wdyajg.execute-api.us-east-1.amazonaws.com/prod/listings"

TIER_THRESH = {
    'Diamond':[97,93,90,87], 'Platinum':[93,90,87,84], 'Gold':[90,87,84,80],
    'Silver':[87,84,80,77], 'Bronze':[84,80,77,74], 'Iron':[80,77,74,70],
    'Stone':[77,74,70,66], 'Ice':[74,70,66,61], 'Spark':[70,66,61,57], 'Flint':[66,61,57,52]
}
ATTRIBUTE_WEIGHTS = [4, 3, 2, 1]

ATTR_MAP = {
    "PAC": "pace", "SHO": "shooting", "PAS": "passing", "DRI": "dribbling",
    "DEF": "defense", "PHY": "physical", "GK": "goalkeeping",
}

FORMATION_MAPS = {
    "4-2-3-1": { "GK": "GK-Sweeper", "LB": "LB-Overlapper", "RB": "RB-Recovery", "CB1": "CB-Mobile", "CB2": "CB-Destroyer", "CDM1": "CDM-Holding", "CDM2": "CDM-Volante", "LM": "LM-Creative", "RM": "RM-Direct", "CAM": "CAM-Playmaker", "ST": "ST-Complete" },
    "3-5-2": { "GK": "GK-Sweeper", "CB1": "CB-Wide", "CB2": "CB-Central", "CB3": "CB-Wide", "CDM": "CDM-Anchor", "CM1": "CM-Creator", "CM2": "CM-Carrier", "LM": "LM-Wingbacks", "RM": "RM-Wingbacks", "ST1": "ST-Deep", "ST2": "ST-Advanced" },
}

# -----------------------------
# Utilities / Normalization
# -----------------------------
POS_ALIAS = { "LWB": "LB", "RWB": "RB", "LW": "LM", "RW": "RM", "CB-L": "CB", "CB-R": "CB", "CBL": "CB", "CBR": "CB" }

def norm_pos(s: str) -> str:
    s = (s or "").strip().upper()
    return POS_ALIAS.get(s, s)

def get_role_name_key(r: dict) -> str:
    return (r.get("Role") or r.get("RoleType") or "").strip().upper()

# -----------------------------
# Load roles & Init App
# -----------------------------
with open(ROLES_PATH, "r", encoding="utf-8") as f:
    ROLES_DATA: List[dict] = json.load(f)

ROLE_LOOKUP = {get_role_name_key(r): r for r in ROLES_DATA}

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# -----------------------------
# Pydantic Models
# -----------------------------
class AssignSquadRequest(BaseModel):
    formation_name: str
    role_map: Dict[str, str]
    tier: str = "Iron"

class MarketSearchRequest(BaseModel):
    role_name: str
    auth_token: str

# -----------------------------
# Data Fetch & Scoring
# -----------------------------
def fetch_players() -> pd.DataFrame:
    r = requests.get(PLAYERS_API, timeout=30)
    players = []
    if r.ok:
        data = r.json()
        data_list = data if isinstance(data, list) else data.get("players", [])
        for p in data_list:
            m = p.get("metadata", {})
            positions_raw = m.get("positions", [])
            positions_norm = [norm_pos(pos) for pos in positions_raw]
            players.append({ "id": p.get("id"), "firstName": m.get("firstName", ""), "lastName": m.get("lastName", ""), "positions": positions_norm, "overall": m.get("overall", 0), "pace": m.get("pace", 0), "shooting": m.get("shooting", 0), "passing": m.get("passing", 0), "dribbling": m.get("dribbling", 0), "defense": m.get("defense", 0), "physical": m.get("physical", 0), "goalkeeping": m.get("goalkeeping", 0) })
    return pd.DataFrame(players)

def calc_fit(player: pd.Series, role_name: str, tier: str):
    role_key = (role_name or "").strip().upper()
    role = ROLE_LOOKUP.get(role_key)
    if not role: return -999, "Unknown"
    thresholds = TIER_THRESH.get(tier, TIER_THRESH["Iron"])
    need_pos = norm_pos(role.get("Position", ""))
    player_pos = {norm_pos(p) for p in (player.get("positions") or [])}
    if need_pos not in player_pos: return -999, "Unusable"
    score = 0
    for i, attr_field in enumerate(["Attribute1", "Attribute2", "Attribute3", "Attribute4"]):
        code = (role.get(attr_field) or "").strip().upper()
        if not code: continue
        player_attr_col = ATTR_MAP.get(code)
        if not player_attr_col: continue
        val = player.get(player_attr_col, 0) or 0
        score += (val - thresholds[i]) * ATTRIBUTE_WEIGHTS[i]
    label = ( "Elite" if score >= 50 else "Strong" if score >= 20 else "Natural" if score >= 0  else "Weak" if score >= -20 else "Unusable" )
    return int(score), label

# -----------------------------
# Endpoints
# -----------------------------
@app.get("/formations")
def get_formations():
    return {"formations": list(FORMATION_MAPS.keys())}

@app.get("/formation/{formation_name}")
def get_formation(formation_name: str):
    fm = FORMATION_MAPS.get(formation_name)
    if not fm:
        raise HTTPException(status_code=404, detail="Formation not found")
    return fm

@app.get("/roles")
def get_roles():
    return ROLES_DATA

@app.post("/squad/assign")
def assign_squad(req: AssignSquadRequest):
    players_df = fetch_players()
    all_options = []
    for slot, role_name in req.role_map.items():
        for _, pl in players_df.iterrows():
            score, label = calc_fit(pl, role_name, req.tier)
            if label == "Unusable": continue
            all_options.append({ "score": score, "label": label, "player": pl.to_dict(), "slot": slot, "role_name": role_name })
    all_options.sort(key=lambda x: x["score"], reverse=True)
    used_player_ids, filled_slots, final_assignments = set(), set(), {}
    for option in all_options:
        player_id = option["player"]["id"]
        slot = option["slot"]
        if slot in filled_slots or player_id in used_player_ids: continue
        final_assignments[slot] = { "slot": slot, "position": ROLE_LOOKUP.get((option["role_name"] or "").strip().upper(), {}).get("Position", ""), "assigned_role": option["role_name"], "player_name": f"{option['player'].get('firstName', '')} {option['player'].get('lastName', '')}".strip(), "player_id": player_id, "fit_score": option["score"], "fit_label": option["label"] }
        used_player_ids.add(player_id)
        filled_slots.add(slot)
    squad_rows = []
    for slot, role_name in req.role_map.items():
        if slot in final_assignments:
            squad_rows.append(final_assignments[slot])
        else:
            squad_rows.append({ "slot": slot, "position": ROLE_LOOKUP.get((role_name or "").strip().upper(), {}).get("Position", ""), "assigned_role": role_name, "player_name": "", "player_id": "", "fit_score": "", "fit_label": "Unfilled" })
    return {"squad": squad_rows}

@app.post("/market/search")
def search_market(req: MarketSearchRequest):
    role_key = (req.role_name or "").strip().upper()
    role = ROLE_LOOKUP.get(role_key)

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # --- THIS IS THE UPDATED SECTION ---
    thresholds = TIER_THRESH["Iron"]
    
    # Base parameters for the marketplace API
    params = {
        "limit": 25,
        "type": "PLAYER",
        "status": "AVAILABLE",
        "view": "full"
    }

    # Get the position required by the role
    required_position = role.get("Position")
    if required_position:
        params["positions"] = required_position # Add position to the search parameters

    # Add minimum attribute values based on the role's attributes
    for i, attr_field in enumerate(["Attribute1", "Attribute2", "Attribute3", "Attribute4"]):
        code = (role.get(attr_field) or "").strip().upper()
        if not code: continue
        
        player_attr_col = ATTR_MAP.get(code)
        if not player_attr_col: continue
        
        params[f"{player_attr_col}Min"] = thresholds[i]
    
    headers = { "Authorization": f"Bearer {req.auth_token}" }

    try:
        r = requests.get(MARKETPLACE_API, headers=headers, params=params, timeout=30)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.HTTPError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.json())
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to contact marketplace API: {e}")