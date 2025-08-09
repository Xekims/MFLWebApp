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

# --- Pydantic Models ---
class Club(BaseModel):
    club_name: str
    tier: str = "Iron"
    roster: List[int] = []
class PlayerAssignmentRequest(BaseModel):
    player_id: int
    old_club_name: str
    new_club_name: str

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
@app.get("/tiers")
def get_tiers():
    return {"tiers": list(TIER_THRESH.keys())}

@app.get("/player/{player_id}/card-analysis")
def get_player_card_analysis(player_id: int):
    player_data = fetch_single_player(player_id, as_series=False)
    if not player_data:
        raise HTTPException(status_code=404, detail="Player not found")

    listing_data = fetch_player_listing(player_id)

    response = {
        "id": player_data.get("id"),
        "metadata": player_data.get("metadata", {}),
        "activeContract": player_data.get("activeContract", {}),
        "listing": listing_data
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
            score, label = calc_fit(player_series, role_name, tier_name)
            if label != "Unusable":
                all_role_scores_for_tier.append({
                    "role": role_name,
                    "score": score,
                    "label": label,
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