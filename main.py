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
SQUADS_PATH = "squads.json"
OWNER_WALLET = "0x5d4143c95673cba6"
PLAYERS_API_BASE = "https://z519wdyajg.execute-api.us-east-1.amazonaws.com/prod/players"
PLAYERS_API_OWNED = (f"{PLAYERS_API_BASE}?limit=1500&ownerWalletAddress={OWNER_WALLET}")
MARKETPLACE_API = "https://z519wdyajg.execute-api.us-east-1.amazonaws.com/prod/listings"
EVENTS_API_BASE = "https://z519wdyajg.execute-api.us-east-1.amazonaws.com/prod/events"
TIER_THRESH = {'Diamond':[97,93,90,87], 'Platinum':[93,90,87,84], 'Gold':[90,87,84,80], 'Silver':[87,84,80,77], 'Bronze':[84,80,77,74], 'Iron':[80,77,74,70], 'Stone':[77,74,70,66], 'Ice':[74,70,66,61], 'Spark':[70,66,61,57], 'Flint':[66,61,57,52]}
ATTRIBUTE_WEIGHTS = [4, 3, 2, 1]
ATTR_MAP = {"PAC": "pace", "SHO": "shooting", "PAS": "passing", "DRI": "dribbling", "DEF": "defense", "PHY": "physical", "GK": "goalkeeping"}

# --- Data Loading ---
def load_roles():
    with open(ROLES_PATH, "r", encoding="utf-8") as f: return json.load(f)
def load_formations():
    with open(FORMATIONS_PATH, "r", encoding="utf-8") as f: return json.load(f)
def load_squads():
    try:
        with open(SQUADS_PATH, "r", encoding="utf-8") as f: return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError): return {}
ROLES_DATA = load_roles()
FORMATION_MAPS = load_formations()
SAVED_SQUADS = load_squads()
ROLE_LOOKUP = {(r.get("Role") or r.get("RoleType") or "").strip().upper(): r for r in ROLES_DATA}
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Helper functions to save data ---
def save_roles(data: List[Dict]):
    global ROLES_DATA, ROLE_LOOKUP
    with open(ROLES_PATH, "w", encoding="utf-8") as f: json.dump(data, f, indent=2)
    ROLES_DATA, ROLE_LOOKUP = data, {(r.get("Role") or r.get("RoleType") or "").strip().upper(): r for r in ROLES_DATA}
def save_formations(data: Dict):
    global FORMATION_MAPS
    with open(FORMATIONS_PATH, "w", encoding="utf-8") as f: json.dump(data, f, indent=4)
    FORMATION_MAPS = data
def save_squads(data: Dict):
    global SAVED_SQUADS
    with open(SQUADS_PATH, "w", encoding="utf-8") as f: json.dump(data, f, indent=4)
    SAVED_SQUADS = data

# --- Pydantic Models ---
class Role(BaseModel): Role: str; Attribute1: str; Attribute2: str; Attribute3: str; Attribute4: str; Position: str
class AssignSquadRequest(BaseModel): formation_name: str; role_map: Dict[str, str]; tier: str = "Iron"
class MarketSearchRequest(BaseModel): role_name: str; auth_token: str; tier: str = "Iron"
class PlayerIdsRequest(BaseModel): player_ids: List[int]
class SimulationRequest(BaseModel): player_ids: List[int]; role_map: Dict[str, str]; tier: str
class Club(BaseModel):
    club_name: str
    tier: str = "Iron"
    roster: List[int] = []
class PlayerAssignmentRequest(BaseModel):
    player_id: int
    old_club_name: str
    new_club_name: str

# --- Data Fetch & Scoring ---
def fetch_players_by_ids(player_ids: List[int]) -> pd.DataFrame:
    players = []
    for player_id in player_ids:
        series = fetch_single_player(player_id)
        if series is not None: players.append(series.to_dict())
    return pd.DataFrame(players)
def fetch_players() -> pd.DataFrame:
    r = requests.get(PLAYERS_API_OWNED, timeout=30)
    players = []
    if r.ok:
        data = r.json()
        data_list = data if isinstance(data, list) else data.get("players", [])
        for p in data_list:
            player_id = p.get("id")
            if player_id is None: continue
            m = p.get("metadata", {})
            positions_raw = m.get("positions", [])
            positions_norm = [(pos or "").strip().upper() for pos in positions_raw]
            players.append({ "id": int(player_id), "firstName": m.get("firstName", ""), "lastName": m.get("lastName", ""),"age": m.get("age", 0), "positions": positions_norm, "overall": m.get("overall", 0), "pace": m.get("pace", 0), "shooting": m.get("shooting", 0), "passing": m.get("passing", 0), "dribbling": m.get("dribbling", 0), "defense": m.get("defense", 0), "physical": m.get("physical", 0), "goalkeeping": m.get("goalkeeping", 0) })
    return pd.DataFrame(players)
def fetch_single_player(player_id: int) -> pd.Series:
    try:
        r = requests.get(f"{EVENTS_API_BASE}?playerId={player_id}&limit=1", timeout=30)
        r.raise_for_status()
        data = r.json()
        player_data_from_api = data.get("resources", {}).get("players", {}).get(str(player_id))
        if not player_data_from_api: return None
        m = player_data_from_api.get("metadata", {})
        positions_raw = m.get("positions", [])
        positions_norm = [(pos or "").strip().upper() for pos in positions_raw]
        player_data = { "id": player_data_from_api.get("id"), "firstName": m.get("firstName", ""), "lastName": m.get("lastName", ""),"age": m.get("age", 0), "positions": positions_norm, "overall": m.get("overall", 0), "pace": m.get("pace", 0), "shooting": m.get("shooting", 0), "passing": m.get("passing", 0), "dribbling": m.get("dribbling", 0), "defense": m.get("defense", 0), "physical": m.get("physical", 0), "goalkeeping": m.get("goalkeeping", 0) }
        return pd.Series(player_data)
    except requests.exceptions.RequestException: return None
def calc_fit(player: pd.Series, role_name: str, tier: str):
    role_key = (role_name or "").strip().upper()
    role = ROLE_LOOKUP.get(role_key)
    if not role: return -999, "Unknown"
    thresholds = TIER_THRESH.get(tier, TIER_THRESH["Iron"])
    need_pos = (role.get("Position", "") or "").strip().upper()
    player_pos = {(p or "").strip().upper() for p in (player.get("positions") or [])}
    if need_pos and need_pos not in player_pos: return -999, "Unusable"
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
    position_map = FORMATION_MAPS.get(formation_name)
    if not position_map: raise HTTPException(status_code=404, detail="Formation not found")
    roles_by_position = {}
    for role in ROLES_DATA:
        pos = role.get("Position")
        if pos not in roles_by_position: roles_by_position[pos] = []
        roles_by_position[pos].append(role.get("Role") or role.get("RoleType"))
    dynamic_role_map = {}
    for slot, position in position_map.items():
        default_role = "N/A"
        if position in roles_by_position and roles_by_position[position]:
            default_role = roles_by_position[position][0]
        dynamic_role_map[slot] = { "position": position, "role": default_role }
    return dynamic_role_map
@app.get("/roles")
def get_roles(): return ROLES_DATA
@app.get("/attributes")
def get_attributes(): return {"attributes": list(ATTR_MAP.keys())}
@app.get("/tiers")
def get_tiers():
    return {"tiers": list(TIER_THRESH.keys())}
@app.get("/tier_thresholds")
def get_tier_thresholds():
    return TIER_THRESH
@app.get("/player/{player_id}/analysis")
def get_player_analysis(player_id: int):
    player_series = fetch_single_player(player_id)
    if player_series is None or player_series.empty: raise HTTPException(status_code=404, detail="Player not found")

    all_positive_roles_by_tier = {}
    overall_best_role = None
    overall_best_score = -float('inf')

    # Iterate through all tiers to calculate roles for each
    for tier_name in TIER_THRESH.keys():
        all_role_scores_for_tier = []
        for role_data in ROLES_DATA:
            role_name = (role_data.get("Role") or role_data.get("RoleType") or "").strip().upper()
            score, label = calc_fit(player_series, role_name, tier_name) # Calculate for current tier_name
            if label != "Unusable":
                all_role_scores_for_tier.append({
                    "role": role_name,
                    "score": score,
                    "label": label,
                    "position": role_data.get("Position", ""),
                    "tier": tier_name # Add tier to the role data
                })
        
        all_role_scores_for_tier.sort(key=lambda x: x["score"], reverse=True)
        positive_roles_for_tier = [r for r in all_role_scores_for_tier if r["score"] >= 0]
        
        if positive_roles_for_tier:
            all_positive_roles_by_tier[tier_name] = positive_roles_for_tier
            # Check if the best role for this tier is the overall best
            if positive_roles_for_tier[0]["score"] > overall_best_score:
                overall_best_score = positive_roles_for_tier[0]["score"]
                overall_best_role = positive_roles_for_tier[0]

    return {
        "player_attributes": player_series.to_dict(),
        "overall_best_role": overall_best_role,
        "all_positive_roles_by_tier": all_positive_roles_by_tier
    }
@app.post("/squad/assign")
def assign_squad(req: AssignSquadRequest):
    players_df = fetch_players()
    if not players_df.empty: players_df['id'] = players_df['id'].astype(int)
    saved_squads = load_squads()

    used_player_ids = set()
    for club_name, club_data in saved_squads.items():
        # Handle both old format (list) and new format (dict)
        roster_ids = club_data.get("roster", []) if isinstance(club_data, dict) else club_data
        if not isinstance(roster_ids, list): continue # Skip malformed entries
        for player_id in roster_ids:
            used_player_ids.add(int(player_id))
    available_players_df = players_df[~players_df['id'].isin(used_player_ids)]
    all_options = []
    for slot, role_name in req.role_map.items():
        for _, pl in available_players_df.iterrows():
            score, label = calc_fit(pl, role_name, req.tier)
            if label == "Unusable": continue
            all_options.append({ "score": score, "label": label, "player": pl.to_dict(), "slot": slot, "role_name": role_name })
    all_options.sort(key=lambda x: x["score"], reverse=True)
    assigned_in_this_run = set()
    final_assignments = {}
    for option in all_options:
        player_id = option["player"]["id"]
        slot = option["slot"]
        if slot in final_assignments or player_id in assigned_in_this_run: continue
        final_assignments[slot] = { "slot": slot, "position": ROLE_LOOKUP.get((option["role_name"] or "").strip().upper(), {}).get("Position", ""), "assigned_role": option["role_name"], "player_name": f"{option['player'].get('firstName', '')} {option['player'].get('lastName', '')}".strip(), "player_id": player_id, "fit_score": option["score"], "fit_label": option["label"] }
        assigned_in_this_run.add(player_id)
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
    if required_position := role.get("Position"):
        params["positions"] = required_position
    thresholds = TIER_THRESH.get(req.tier, TIER_THRESH["Iron"])
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
@app.get("/players/owned")
def get_owned_players_with_club_assignment():
    players_df = fetch_players()
    if players_df.empty:
        return []

    # --- Calculate Best Tier and Best Role for each player ---
    # This is computationally intensive and is best performed on the backend.
    sorted_tiers = list(TIER_THRESH.keys()) # Tiers are already ordered from highest to lowest

    def find_best_fit(player_series):
        player_pos = {(p or "").strip().upper() for p in (player_series.get("positions") or [])}
        for tier in sorted_tiers:
            best_role_for_tier = None
            max_score_for_tier = -1

            for role_data in ROLES_DATA:
                role_name = (role_data.get("Role") or role_data.get("RoleType") or "").strip().upper()
                if not role_name: continue

                role_info = ROLE_LOOKUP.get(role_name)
                if not role_info:
                    continue
                
                required_pos = (role_info.get("Position", "") or "").strip().upper()
                if required_pos and required_pos not in player_pos:
                    continue
                
                score, label = calc_fit(player_series, role_name, tier)
                
                if score > max_score_for_tier:
                    max_score_for_tier = score
                    best_role_for_tier = role_name
            
            if max_score_for_tier >= 0:
                return pd.Series([tier, best_role_for_tier], index=['bestTier', 'bestRole'])

        return pd.Series(["Unrated", "N/A"], index=['bestTier', 'bestRole'])

    best_fit_df = players_df.apply(find_best_fit, axis=1)
    players_df = pd.concat([players_df, best_fit_df], axis=1)

    squads = load_squads()
    player_to_club_map = {}
    for club_name, club_data in squads.items():
        # Handle both old format (list) and new format (dict) for backward compatibility
        roster_ids = club_data.get("roster", []) if isinstance(club_data, dict) else club_data
        for player_id in roster_ids:
            player_to_club_map[int(player_id)] = club_name
    players_df['assigned_club'] = players_df['id'].map(player_to_club_map).fillna("Unassigned")
    return json.loads(players_df.to_json(orient="records"))
@app.post("/players/by_ids")
def get_players_by_ids(req: PlayerIdsRequest):
    players_df = fetch_players_by_ids(req.player_ids)
    if players_df.empty:
        return []
    return json.loads(players_df.to_json(orient="records"))
@app.post("/players/assign")
def assign_player_club(req: PlayerAssignmentRequest):
    squads = load_squads()

    def get_roster(club_name):
        if club_name not in squads: return None
        club_data = squads[club_name]
        if isinstance(club_data, dict): return club_data.get("roster", [])
        elif isinstance(club_data, list): return club_data
        return None

    def update_roster(club_name, new_roster):
        if club_name not in squads: return
        club_data = squads[club_name]
        if isinstance(club_data, dict): club_data["roster"] = new_roster
        elif isinstance(club_data, list): squads[club_name] = new_roster

    # Remove from old club
    if req.old_club_name != "Unassigned":
        old_roster = get_roster(req.old_club_name)
        if old_roster is not None and req.player_id in old_roster:
            old_roster.remove(req.player_id)
            update_roster(req.old_club_name, old_roster)

    # Add to new club
    if req.new_club_name != "Unassigned":
        new_roster = get_roster(req.new_club_name)
        if new_roster is not None and req.player_id not in new_roster:
            new_roster.append(req.player_id)
            update_roster(req.new_club_name, new_roster)

    save_squads(squads)
    return {"message": f"Player {req.player_id} assignment updated."}
@app.post("/squads/simulate")
def simulate_squad(req: SimulationRequest):
    players_df = fetch_players_by_ids(req.player_ids)
    if players_df.empty:
        return {"squad": []}
    all_options = []
    for slot, role_name in req.role_map.items():
        for _, pl in players_df.iterrows():
            score, label = calc_fit(pl, role_name, req.tier)
            if label == "Unusable": continue
            all_options.append({ "score": score, "label": label, "player": pl.to_dict(), "slot": slot, "role_name": role_name })
    all_options.sort(key=lambda x: x["score"], reverse=True)
    used_player_ids, final_assignments = set(), {}
    for option in all_options:
        player_id, slot = option["player"]["id"], option["slot"]
        if slot in final_assignments or player_id in used_player_ids: continue
        final_assignments[slot] = { "slot": slot, "position": ROLE_LOOKUP.get((option["role_name"] or "").strip().upper(), {}).get("Position", ""), "assigned_role": option["role_name"], "player_name": f"{option['player'].get('firstName', '')} {option['player'].get('lastName', '')}".strip(), "player_id": player_id, "fit_score": option["score"], "fit_label": option["label"] }
        used_player_ids.add(player_id)
    squad_rows = []
    for slot, role_name in req.role_map.items():
        if slot in final_assignments: squad_rows.append(final_assignments[slot])
        else: squad_rows.append({ "slot": slot, "position": ROLE_LOOKUP.get((role_name or "").strip().upper(), {}).get("Position", ""), "assigned_role": role_name, "player_name": "", "player_id": "", "fit_score": "", "fit_label": "Unfilled" })
    return {"squad": squad_rows}
@app.get("/clubs")
def get_clubs() -> List[Club]:
    squads_data = load_squads()
    club_list = []
    for club_name, club_data in squads_data.items():
        # Handle new format: {"club_name": "...", "tier": "...", "roster": []}
        if isinstance(club_data, dict) and "club_name" in club_data:
            club_list.append(club_data)
        # Handle old format: [1, 2, 3] and convert it to the new format
        elif isinstance(club_data, list):
            club_list.append({
                "club_name": club_name,
                "tier": "Iron", # Default tier for old data
                "roster": club_data
            })
    return club_list
@app.get("/clubs/{club_name}")
def get_club_with_players(club_name: str):
    clubs = load_squads()
    club_data = clubs.get(club_name)
    if not club_data:
        raise HTTPException(status_code=404, detail="Club not found")

    # Standardize the club data into the new dictionary format
    if isinstance(club_data, list):
        club_dict = {"club_name": club_name, "tier": "Iron", "roster": club_data}
    elif isinstance(club_data, dict):
        club_dict = club_data
    else:
        raise HTTPException(status_code=500, detail="Malformed club data in squads.json")

    roster_ids = club_dict.get("roster", [])
    if roster_ids:
        players_df = fetch_players_by_ids(roster_ids)
        club_dict["roster"] = json.loads(players_df.to_json(orient="records")) if not players_df.empty else []
    
    return club_dict
@app.post("/clubs")
def create_club(club: Club):
    clubs = load_squads()
    if club.club_name in clubs:
        raise HTTPException(status_code=400, detail="A club with this name already exists.")
    # Use the data from the request body, including the tier,
    # instead of a hardcoded value.
    clubs[club.club_name] = club.dict()
    save_squads(clubs)
    return club
@app.put("/clubs/{club_name}")
def update_club_roster(club_name: str, roster: List[int] = Body(...)):
    clubs = load_squads()
    if club_name not in clubs:
        raise HTTPException(status_code=404, detail="Club not found.")
    club_data = clubs[club_name]
    # If data is in the old list format, upgrade it to the new dict format on update.
    if isinstance(club_data, list):
        clubs[club_name] = {"club_name": club_name, "tier": "Iron", "roster": roster}
    # Otherwise, just update the roster in the existing dict.
    elif isinstance(club_data, dict):
        clubs[club_name]["roster"] = roster
    save_squads(clubs)
    return clubs[club_name]
@app.delete("/clubs/{club_name}")
def delete_club(club_name: str):
    clubs = load_squads()
    if club_name not in clubs:
        raise HTTPException(status_code=404, detail="Club not found.")
    del clubs[club_name]
    save_squads(clubs)
    return {"message": "Club deleted."}
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