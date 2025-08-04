# file: main.py

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
import pandas as pd
from typing import Dict, List, Any

# --- Config ---
ROLES_PATH = "roles.json"
FORMATIONS_PATH = "formations.json"
OWNER_WALLET = "0x5d4143c95673cba6"
# --- UPDATED: Defined a base URL for the players API ---
PLAYERS_API_BASE = "https://z519wdyajg.execute-api.us-east-1.amazonaws.com/prod/players"
PLAYERS_API_OWNED = (f"{PLAYERS_API_BASE}?limit=1500&ownerWalletAddress={OWNER_WALLET}")
MARKETPLACE_API = "https://z519wdyajg.execute-api.us-east-1.amazonaws.com/prod/listings"
TIER_THRESH = {'Diamond':[97,93,90,87], 'Platinum':[93,90,87,84], 'Gold':[90,87,84,80], 'Silver':[87,84,80,77], 'Bronze':[84,80,77,74], 'Iron':[80,77,74,70], 'Stone':[77,74,70,66], 'Ice':[74,70,66,61], 'Spark':[70,66,61,57], 'Flint':[66,61,57,52]}
ATTRIBUTE_WEIGHTS = [4, 3, 2, 1]
ATTR_MAP = {"PAC": "pace", "SHO": "shooting", "PAS": "passing", "DRI": "dribbling", "DEF": "defense", "PHY": "physical", "GK": "goalkeeping"}

# --- Data Loading & App Init (no changes) ---
def load_roles():
    with open(ROLES_PATH, "r", encoding="utf-8") as f: return json.load(f)
def load_formations():
    with open(FORMATIONS_PATH, "r", encoding="utf-8") as f: return json.load(f)
ROLES_DATA = load_roles()
FORMATION_MAPS = load_formations()
ROLE_LOOKUP = {(r.get("Role") or r.get("RoleType") or "").strip().upper(): r for r in ROLES_DATA}
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Helper functions to save data (no changes) ---
def save_roles(data: List[Dict]):
    global ROLES_DATA, ROLE_LOOKUP
    with open(ROLES_PATH, "w", encoding="utf-8") as f: json.dump(data, f, indent=2)
    ROLES_DATA, ROLE_LOOKUP = data, {(r.get("Role") or r.get("RoleType") or "").strip().upper(): r for r in ROLES_DATA}
def save_formations(data: Dict):
    global FORMATION_MAPS
    with open(FORMATIONS_PATH, "w", encoding="utf-8") as f: json.dump(data, f, indent=4)
    FORMATION_MAPS = data

# --- Pydantic Models (no changes) ---
class Role(BaseModel): Role: str; Attribute1: str; Attribute2: str; Attribute3: str; Attribute4: str; Position: str
class AssignSquadRequest(BaseModel): formation_name: str; role_map: Dict[str, str]; tier: str = "Iron"
class MarketSearchRequest(BaseModel): role_name: str; auth_token: str; tier: str = "Iron"

# --- Data Fetch & Scoring ---
def fetch_players() -> pd.DataFrame:
    r = requests.get(PLAYERS_API_OWNED, timeout=30)
    players = []
    if r.ok:
        data = r.json()
        data_list = data if isinstance(data, list) else data.get("players", [])
        for p in data_list:
            m = p.get("metadata", {})
            positions_raw = m.get("positions", [])
            positions_norm = [(pos or "").strip().upper() for pos in positions_raw]
            players.append({ "id": p.get("id"), "firstName": m.get("firstName", ""), "lastName": m.get("lastName", ""), "positions": positions_norm, "overall": m.get("overall", 0), "pace": m.get("pace", 0), "shooting": m.get("shooting", 0), "passing": m.get("passing", 0), "dribbling": m.get("dribbling", 0), "defense": m.get("defense", 0), "physical": m.get("physical", 0), "goalkeeping": m.get("goalkeeping", 0) })
    return pd.DataFrame(players)

# --- NEW: Function to fetch a single player by their ID ---
def fetch_single_player(player_id: int) -> pd.Series:
    try:
        # Construct the URL to fetch a single player
        r = requests.get(f"{PLAYERS_API_BASE}/{player_id}", timeout=30)
        r.raise_for_status()  # This will raise an exception for 4xx or 5xx errors
        p = r.json()
        
        # The response for a single player is different, data is directly in 'metadata'
        m = p.get("metadata", {})
        positions_raw = m.get("positions", [])
        positions_norm = [(pos or "").strip().upper() for pos in positions_raw]
        player_data = {
            "id": p.get("id"), "firstName": m.get("firstName", ""), "lastName": m.get("lastName", ""),
            "positions": positions_norm, "overall": m.get("overall", 0), "pace": m.get("pace", 0),
            "shooting": m.get("shooting", 0), "passing": m.get("passing", 0), "dribbling": m.get("dribbling", 0),
            "defense": m.get("defense", 0), "physical": m.get("physical", 0), "goalkeeping": m.get("goalkeeping", 0)
        }
        return pd.Series(player_data)
    except requests.exceptions.RequestException:
        # If the request fails for any reason (including 404), return None
        return None

def calc_fit(player: pd.Series, role_name: str, tier: str):
    # (No changes to this function)
    role_key = (role_name or "").strip().upper()
    role = ROLE_LOOKUP.get(role_key)
    if not role: return -999, "Unknown"
    thresholds = TIER_THRESH.get(tier, TIER_THRESH["Iron"])
    need_pos = (role.get("Position", "") or "").strip().upper()
    player_pos = {(p or "").strip().upper() for p in (player.get("positions") or [])}
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

# --- Endpoints ---
@app.get("/formations")
def get_formations(): return {"formations": list(FORMATION_MAPS.keys())}
@app.get("/formation/{formation_name}")
def get_formation(formation_name: str):
    fm = FORMATION_MAPS.get(formation_name)
    if not fm: raise HTTPException(status_code=404, detail="Formation not found")
    return fm
@app.get("/roles")
def get_roles(): return ROLES_DATA
@app.get("/attributes")
def get_attributes(): return {"attributes": list(ATTR_MAP.keys())}

# --- THIS ENDPOINT IS NOW CORRECTED TO USE THE NEW FUNCTION ---
@app.get("/player/{player_id}/analysis")
def get_player_analysis(player_id: int, tier: str = "Iron"):
    player_series = fetch_single_player(player_id) # Use the new robust function
    if player_series is None or player_series.empty:
        raise HTTPException(status_code=404, detail="Player not found")
    all_role_scores = []
    for role_data in ROLES_DATA:
        role_name = (role_data.get("Role") or role_data.get("RoleType") or "").strip().upper()
        score, label = calc_fit(player_series, role_name, tier)
        if label != "Unusable":
            all_role_scores.append({ "role": role_name, "score": score, "label": label })
    all_role_scores.sort(key=lambda x: x["score"], reverse=True)
    positive_roles = [r for r in all_role_scores if r["score"] >= 0]
    best_role = all_role_scores[0] if all_role_scores else None
    return { "player_attributes": player_series.to_dict(), "best_role": best_role, "positive_roles": positive_roles }

# ... (All other endpoints: assign_squad, search_market, and all CRUD endpoints remain the same) ...
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
        if slot in final_assignments: squad_rows.append(final_assignments[slot])
        else: squad_rows.append({ "slot": slot, "position": ROLE_LOOKUP.get((role_name or "").strip().upper(), {}).get("Position", ""), "assigned_role": role_name, "player_name": "", "player_id": "", "fit_score": "", "fit_label": "Unfilled" })
    return {"squad": squad_rows}
@app.post("/market/search")
def search_market(req: MarketSearchRequest):
    role_key = (req.role_name or "").strip().upper()
    role = ROLE_LOOKUP.get(role_key)
    if not role: raise HTTPException(status_code=404, detail="Role not found")
    params = {"limit": 25, "type": "PLAYER", "status": "AVAILABLE", "view": "full"}
    required_position = role.get("Position")
    if required_position: params["positions"] = required_position
    thresholds = TIER_THRESH["Iron"]
    for i, attr_field in enumerate(["Attribute1", "Attribute2", "Attribute3", "Attribute4"]):
        code = (role.get(attr_field) or "").strip().upper()
        if not code: continue
        player_attr_col = ATTR_MAP.get(code)
        if not player_attr_col: continue
        params[f"{player_attr_col}Min"] = thresholds[i]
    headers = {"Authorization": f"Bearer {req.auth_token}"}
    try:
        r = requests.get(MARKETPLACE_API, headers=headers, params=params, timeout=30)
        r.raise_for_status()
        listings = r.json()
        for listing in listings:
            player_data = listing.get("player", {}).get("metadata", {})
            player_series = pd.Series(player_data)
            score, label = calc_fit(player_series, req.role_name, req.tier)
            listing["player"]["metadata"]["fit_score"] = score
            listing["player"]["metadata"]["fit_label"] = label
        return listings
    except requests.exceptions.HTTPError as e: raise HTTPException(status_code=e.response.status_code, detail=e.response.json())
    except requests.exceptions.RequestException as e: raise HTTPException(status_code=500, detail=f"Failed to contact marketplace API: {e}")
@app.post("/roles", status_code=201)
def create_role(role: Role):
    roles = load_roles()
    if any((r.get("Role") or r.get("RoleType")).strip().upper() == role.Role.strip().upper() for r in roles):
        raise HTTPException(status_code=400, detail="Role with this name already exists")
    roles.append(role.dict())
    save_roles(roles)
    return role
@app.put("/roles/{role_name}")
def update_role(role_name: str, updated_role: Role):
    roles = load_roles()
    role_found = False
    for i, role in enumerate(roles):
        if (role.get("Role") or role.get("RoleType")).strip().upper() == role_name.strip().upper():
            roles[i] = updated_role.dict()
            role_found = True
            break
    if not role_found: raise HTTPException(status_code=404, detail="Role not found")
    save_roles(roles)
    return updated_role
@app.delete("/roles/{role_name}", status_code=204)
def delete_role(role_name: str):
    roles = load_roles()
    initial_len = len(roles)
    roles = [r for r in roles if (r.get("Role") or r.get("RoleType")).strip().upper() != role_name.strip().upper()]
    if len(roles) == initial_len: raise HTTPException(status_code=404, detail="Role not found")
    save_roles(roles)
    return {"message": "Role deleted"}
@app.post("/formations", status_code=201)
def create_formation(formation: Dict[str, Any] = Body(...)):
    name = list(formation.keys())[0]
    data = list(formation.values())[0]
    formations = load_formations()
    if name in formations: raise HTTPException(status_code=400, detail="Formation with this name already exists")
    formations[name] = data
    save_formations(formations)
    return formation
@app.put("/formations/{formation_name}")
def update_formation(formation_name: str, roles: Dict[str, str] = Body(...)):
    formations = load_formations()
    if formation_name not in formations: raise HTTPException(status_code=404, detail="Formation not found")
    formations[formation_name] = roles
    save_formations(formations)
    return {formation_name: roles}
@app.delete("/formations/{formation_name}", status_code=204)
def delete_formation(formation_name: str):
    formations = load_formations()
    if formation_name not in formations: raise HTTPException(status_code=404, detail="Formation not found")
    del formations[formation_name]
    save_formations(formations)
    return {"message": "Formation deleted"}