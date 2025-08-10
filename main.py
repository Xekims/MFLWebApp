# file: main.py

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
import pandas as pd
from typing import Dict, List, Any, Optional

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
COUNTRY_CODES = { "SAUDI_ARABIA": "sa", "ENGLAND": "gb-eng", "BRAZIL": "br", "ARGENTINA": "ar", "FRANCE": "fr", "GERMANY": "de", "SPAIN": "es", "PORTUGAL": "pt", "NETHERLANDS": "nl", "ITALY": "it" }
ROLE_DESCRIPTIONS = { "STRIKER": "A lethal finisher, focused on scoring goals.", "WINGER": "A pacey player who attacks from the flanks.", "MIDFIELDER": "A versatile player who controls the tempo.", "DEFENDER": "A solid player focused on stopping attacks.", "GOALKEEPER": "The last line of defense." }

# --- Data Loading ---
def load_roles():
    with open(ROLES_PATH, "r", encoding="utf-8") as f: return json.load(f)
def load_formations():
    with open(FORMATIONS_PATH, "r", encoding="utf-8") as f: return json.load(f)
def load_squads():
    try:
        with open(SQUADS_PATH, "r", encoding="utf-8") as f: return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError): return {}

def save_squads(squads_data):
    with open(SQUADS_PATH, "w", encoding="utf-8") as f:
        json.dump(squads_data, f, indent=4)
ROLES_DATA = load_roles()
FORMATION_MAPS = load_formations()
SAVED_SQUADS = load_squads()
ROLE_LOOKUP = {(r.get("Role") or r.get("RoleType") or "").strip().upper(): r for r in ROLES_DATA}
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Pydantic Models ---
class Club(BaseModel):
    club_name: str
    tier: str = "Iron"
    roster: List[int] = []
class PlayerAssignmentRequest(BaseModel):
    player_id: int
    old_club_name: str
    new_club_name: str

class SimulationRequest(BaseModel):
    player_ids: List[int]
    role_map: Dict[str, str]
    tier: str

# --- Data Fetch & Scoring ---
def fetch_player_listing(player_id: int) -> Dict:
    try:
        r = requests.get(f"{MARKETPLACE_API}?playerId={player_id}", timeout=10)
        r.raise_for_status()
        listings = r.json()
        return listings[0] if listings else None
    except requests.exceptions.RequestException:
        return None

def fetch_single_player(player_id: int, as_series=False):
    try:
        r = requests.get(f"{PLAYERS_API_BASE}/{player_id}", timeout=30)
        r.raise_for_status()
        data = r.json()
        player_data = data.get("player")
        if not player_data: return None
        if as_series:
            m = player_data.get("metadata", {})
            positions_raw = m.get("positions", [])
            positions_norm = [(pos or "").strip().upper() for pos in positions_raw]
            player_dict = { "id": player_data.get("id"), "firstName": m.get("firstName", ""), "lastName": m.get("lastName", ""),"age": m.get("age", 0), "positions": positions_norm, "overall": m.get("overall", 0), "pace": m.get("pace", 0), "shooting": m.get("shooting", 0), "passing": m.get("passing", 0), "dribbling": m.get("dribbling", 0), "defense": m.get("defense", 0), "physical": m.get("physical", 0), "goalkeeping": m.get("goalkeeping", 0) }
            return pd.Series(player_dict)
        return player_data
    except requests.exceptions.RequestException:
        return None

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

def calc_fit(player: pd.Series, role_name: str, tier: str):
    role_key = (role_name or "").strip().upper()
    role = ROLE_LOOKUP.get(role_key)
    if not role: return -999, "Unknown", ""
    thresholds = TIER_THRESH.get(tier, TIER_THRESH["Iron"])
    need_pos = (role.get("Position", "") or "").strip().upper()
    player_pos = {(p or "").strip().upper() for p in (player.get("positions") or [])}
    if need_pos and need_pos not in player_pos: return -999, "Unusable", ""
    score = 0
    for i, attr_field in enumerate(["Attribute1", "Attribute2", "Attribute3", "Attribute4"]):
        code = (role.get(attr_field) or "").strip().upper()
        if not code: continue
        player_attr_col = ATTR_MAP.get(code)
        if not player_attr_col: continue
        val = player.get(player_attr_col, 0) or 0
        score += (val - thresholds[i]) * ATTRIBUTE_WEIGHTS[i]
    label = ( "Elite" if score >= 50 else "Strong" if score >= 20 else "Natural" if score >= 0  else "Weak" if score >= -20 else "Unusable" )
    description = ROLE_DESCRIPTIONS.get(role_key, "No description available.")
    return int(score), label, description

def calculate_best_role_for_player(player_series: pd.Series) -> pd.Series:
    sorted_tiers = list(TIER_THRESH.keys())
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
            
            score, label, _ = calc_fit(player_series, role_name, tier)
            
            if score > max_score_for_tier:
                max_score_for_tier = score
                best_role_for_tier = role_name
        
        if max_score_for_tier >= 0:
            return pd.Series([tier, best_role_for_tier], index=['bestTier', 'bestRole'])

    return pd.Series(["Unrated", "N/A"], index=['bestTier', 'bestRole'])

# --- Endpoints ---
@app.get("/roles")
def get_roles():
    return ROLES_DATA

@app.get("/formations")
def get_formations():
    return FORMATION_MAPS

@app.get("/formation/{formation_name}")
def get_formation_map(formation_name: str):
    if formation_name in FORMATION_MAPS:
        return FORMATION_MAPS[formation_name]
    raise HTTPException(status_code=404, detail="Formation not found")

@app.get("/clubs/{club_name}")
def get_club_by_name(club_name: str):
    squads_data = load_squads()
    if club_name in squads_data:
        club_data = squads_data[club_name]
        if isinstance(club_data, dict):
            return club_data
        elif isinstance(club_data, list):
            return {
                "club_name": club_name,
                "tier": "Iron",
                "roster": club_data
            }
    raise HTTPException(status_code=404, detail="Club not found")

@app.put("/clubs/{club_name}")
def update_club_roster(club_name: str, roster: List[int] = Body(...)):
    squads_data = load_squads()
    if club_name in squads_data:
        if isinstance(squads_data[club_name], dict):
            squads_data[club_name]["roster"] = roster
        elif isinstance(squads_data[club_name], list):
            squads_data[club_name] = roster
        save_squads(squads_data)
        return {"message": f"Roster for {club_name} updated successfully."}
    raise HTTPException(status_code=404, detail="Club not found")

@app.delete("/clubs/{club_name}")
def delete_club(club_name: str):
    squads_data = load_squads()
    if club_name in squads_data:
        del squads_data[club_name]
        save_squads(squads_data)
        return {"message": f"Club {club_name} deleted successfully."}
    raise HTTPException(status_code=404, detail="Club not found")
@app.get("/tiers")
def get_tiers():
    return {"tiers": TIER_THRESH}

@app.get("/player/{player_id}/card-analysis")
def get_player_card_analysis(player_id: int):
    player_data = fetch_single_player(player_id, as_series=False)
    if not player_data:
        raise HTTPException(status_code=404, detail="Player not found")

    listing_data = fetch_player_listing(player_id)
    nationality = player_data.get("metadata", {}).get("nationalities", [None])[0]
    country_code = COUNTRY_CODES.get(nationality, "")

    response = {
        "id": player_data.get("id"),
        "metadata": player_data.get("metadata", {}),
        "activeContract": player_data.get("activeContract", {}),
        "listing": listing_data,
        "country_code": country_code
    }
    return response

@app.get("/player/{player_id}/role-analysis")
def get_player_role_analysis(player_id: int):
    player_series = fetch_single_player(player_id, as_series=True)
    if player_series is None or player_series.empty: raise HTTPException(status_code=404, detail="Player not found")

    all_positive_roles_by_tier = {}
    overall_best_role = None

    for tier_name in TIER_THRESH.keys():
        all_role_scores_for_tier = []
        for role_data in ROLES_DATA:
            role_name = (role_data.get("Role") or role_data.get("RoleType") or "").strip().upper()
            score, label, description = calc_fit(player_series, role_name, tier_name)
            if label != "Unusable":
                all_role_scores_for_tier.append({
                    "role": role_name,
                    "score": score,
                    "label": label,
                    "description": description,
                    "position": role_data.get("Position", ""),
                    "tier": tier_name
                })
        
        all_role_scores_for_tier.sort(key=lambda x: x["score"], reverse=True)
        positive_roles_for_tier = [r for r in all_role_scores_for_tier if r["score"] >= 0]
        
        if positive_roles_for_tier:
            all_positive_roles_by_tier[tier_name] = positive_roles_for_tier
            if overall_best_role is None:
                overall_best_role = positive_roles_for_tier[0]

    return {
        "player_attributes": player_series.to_dict(),
        "overall_best_role": overall_best_role,
        "all_positive_roles_by_tier": all_positive_roles_by_tier
    }

@app.get("/players/owned")
def get_owned_players_with_club_assignment():
    players_df = fetch_players()
    if players_df.empty:
        return []

    sorted_tiers = list(TIER_THRESH.keys())

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
                
                score, label, _ = calc_fit(player_series, role_name, tier)
                
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
        roster_ids = club_data.get("roster", []) if isinstance(club_data, dict) else club_data
        for player_id in roster_ids:
            player_to_club_map[int(player_id)] = club_name
    players_df['assigned_club'] = players_df['id'].map(player_to_club_map).fillna("Unassigned")
    return json.loads(players_df.to_json(orient="records"))

@app.get("/clubs")
def get_clubs() -> List[Club]:
    squads_data = load_squads()
    club_list = []
    for club_name, club_data in squads_data.items():
        if isinstance(club_data, dict) and "club_name" in club_data:
            club_list.append(club_data)
        elif isinstance(club_data, list):
            club_list.append({
                "club_name": club_name,
                "tier": "Iron",
                "roster": club_data
            })
    return club_list

@app.post("/clubs")
def create_club(club: Club):
    squads_data = load_squads()
    if club.club_name in squads_data:
        raise HTTPException(status_code=400, detail="Club with this name already exists")
    squads_data[club.club_name] = club.dict()
    save_squads(squads_data)
    return club

class PlayerIds(BaseModel):
    player_ids: List[int]

@app.post("/players/by_ids")
def get_players_by_ids(player_ids_model: PlayerIds):
    player_ids = player_ids_model.player_ids
    players_df = fetch_players()
    if players_df.empty:
        return []
    
    roster_players = players_df[players_df['id'].isin(player_ids)].copy()
    
    # Calculate best role for each player in the roster
    best_fit_df = roster_players.apply(calculate_best_role_for_player, axis=1)
    roster_players = pd.concat([roster_players, best_fit_df], axis=1)

    return json.loads(roster_players.to_json(orient="records"))

class PlayerSearchRequest(BaseModel):
    role_name: str
    auth_token: str
    tier: str
    positions: Optional[List[str]] = None
    paceMin: Optional[int] = None
    shootingMin: Optional[int] = None
    passingMin: Optional[int] = None
    dribblingMin: Optional[int] = None
    defenseMin: Optional[int] = None
    physicalMin: Optional[int] = None
    goalkeepingMin: Optional[int] = None

@app.post("/market/search")
def search_market(req: PlayerSearchRequest):
    headers = {"Authorization": f"Bearer {req.auth_token}"}
    
    # Build query parameters for the external API
    external_api_params = {
        "limit": 50,
        "type": "PLAYER",
        "status": "AVAILABLE",
        "view": "full"
    }

    if req.positions:
        external_api_params["positions"] = ",".join(req.positions)

    # Temporarily removed attribute minimums from external_api_params
    # if req.paceMin is not None:
    #     external_api_params["paceMin"] = req.paceMin
    # if req.shootingMin is not None:
    #     external_api_params["shootingMin"] = req.shootingMin
    # if req.passingMin is not None:
    #     external_api_params["passingMin"] = req.passingMin
    # if req.dribblingMin is not None:
    #     external_api_params["dribblingMin"] = req.dribblingMin
    # if req.defenseMin is not None:
    #     external_api_params["defenseMin"] = req.defenseMin
    # if req.physicalMin is not None:
    #     external_api_params["physicalMin"] = req.physicalMin
    # if req.goalkeepingMin is not None:
    #     external_api_params["goalkeepingMin"] = req.goalkeepingMin

    try:
        r = requests.get(MARKETPLACE_API, headers=headers, params=external_api_params, timeout=30)
        r.raise_for_status()
        listings = r.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch marketplace listings: {e}")

    # Fetch all players once
    all_players_df = fetch_players()
    if all_players_df.empty:
        return []

    results = []
    for listing in listings:
        player_id = listing.get("id")
        if player_id is None:
            continue
        
        # Get player data from the all_players_df
        player_row = all_players_df[all_players_df['id'] == player_id]
        if player_row.empty:
            continue # Skip if player data not found (shouldn't happen if external API is consistent)

        player_series = player_row.iloc[0] # Get the first (and only) row as a Series
        
        # Apply backend filtering based on role and tier fit
        score, label, _ = calc_fit(player_series, req.role_name, req.tier)
        
        # Only include players with a positive fit score
        if score >= 0:
            player_data = player_series.to_dict()
            player_data["fit_score"] = score
            player_data["fit_label"] = label
            
            results.append({
                "listingResourceId": listing.get("listingResourceId"),
                "price": listing.get("price"),
                "player": {
                    "id": player_id,
                    "metadata": player_data
                }
            })
    return results

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

    if req.old_club_name != "Unassigned":
        old_roster = get_roster(req.old_club_name)
        if old_roster is not None and req.player_id in old_roster:
            old_roster.remove(req.player_id)
            update_roster(req.old_club_name, old_roster)

    if req.new_club_name != "Unassigned":
        new_roster = get_roster(req.new_club_name)
        if new_roster is not None and req.player_id not in new_roster:
            new_roster.append(req.player_id)
            update_roster(req.new_club_name, new_roster)

    save_squads(squads)
    return {"message": f"Player {req.player_id} assignment updated."}

@app.post("/squads/simulate")
def simulate_squad(req: SimulationRequest):
    players_df = fetch_players()
    if players_df.empty:
        raise HTTPException(status_code=400, detail="No players available for simulation.")

    roster_players = players_df[players_df['id'].isin(req.player_ids)].copy()
    if roster_players.empty:
        raise HTTPException(status_code=400, detail="None of the selected players could be found.")

    squad = []
    for slot, role_name in req.role_map.items():
        best_player_for_slot = None
        highest_score = -1

        # Find the best player for the current slot
        for _, player in roster_players.iterrows():
            score, label, _ = calc_fit(player, role_name, req.tier)
            if score > highest_score:
                highest_score = score
                best_player_for_slot = player

        # Add the best player to the squad and remove them from the available roster
        if best_player_for_slot is not None:
            squad.append({
                "slot": slot,
                "assigned_role": role_name,
                "player_id": best_player_for_slot['id'],
                "player_name": f"{best_player_for_slot['firstName']} {best_player_for_slot['lastName']}",
                "fit_score": highest_score,
                "fit_label": "Elite" if highest_score >= 50 else "Strong" if highest_score >= 20 else "Natural" if highest_score >= 0 else "Weak" if highest_score >= -20 else "Unusable"
            })
            roster_players = roster_players[roster_players['id'] != best_player_for_slot['id']]
        else:
            squad.append({
                "slot": slot,
                "assigned_role": role_name,
                "player_id": None,
                "player_name": "—",
                "fit_score": None,
                "fit_label": "No suitable player"
            })
            
    return {"squad": squad}
