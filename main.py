from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import requests
import json
import pandas as pd
import os

# ----------------------------
# Config / constants
# ----------------------------
ROLES_PATH = "roles.json"
FORMATIONS_PATH = "formations.json"
SQUADS_PATH = "squads.json"

OWNER_WALLET = "0x5d4143c95673cba6"

PLAYERS_API_BASE = "https://z519wdyajg.execute-api.us-east-1.amazonaws.com/prod/players"
PLAYERS_API_OWNED = f"{PLAYERS_API_BASE}?limit=1500&ownerWalletAddress={OWNER_WALLET}"

MARKETPLACE_API = "https://z519wdyajg.execute-api.us-east-1.amazonaws.com/prod/listings"
EVENTS_API_BASE = "https://z519wdyajg.execute-api.us-east-1.amazonaws.com/prod/events"

TIER_THRESH = {
    'Diamond':[97,93,90,87],
    'Platinum':[93,90,87,84],
    'Gold':[90,87,84,80],
    'Silver':[87,84,80,77],
    'Bronze':[84,80,77,74],
    'Iron':[80,77,74,70],
    'Stone':[77,74,70,66],
    'Ice':[74,70,66,61],
    'Spark':[70,66,61,57],
    'Flint':[66,61,57,52]
}
ATTRIBUTE_WEIGHTS = [4, 3, 2, 1]
ATTR_MAP = {
    "PAC": "pace", "SHO": "shooting", "PAS": "passing", "DRI": "dribbling",
    "DEF": "defense", "PHY": "physical", "GK": "goalkeeping"
}
COUNTRY_CODES = {
    "SAUDI_ARABIA": "sa", "ENGLAND": "gb-eng", "BRAZIL": "br", "ARGENTINA": "ar",
    "FRANCE": "fr", "GERMANY": "de", "SPAIN": "es", "PORTUGAL": "pt",
    "NETHERLANDS": "nl", "ITALY": "it"
}
ROLE_DESCRIPTIONS = {
    "STRIKER": "A lethal finisher, focused on scoring goals.",
    "WINGER": "A pacey player who attacks from the flanks.",
    "MIDFIELDER": "A versatile player who controls the tempo.",
    "DEFENDER": "A solid player focused on stopping attacks.",
    "GOALKEEPER": "The last line of defense."
}

# ----------------------------
# File helpers
# ----------------------------
def load_json(path, default):
    try:
        if not os.path.exists(path):
            return default
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return default

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def load_roles() -> List[Dict[str, Any]]:
    return load_json(ROLES_PATH, [])

def load_formations() -> Dict[str, Any]:
    return load_json(FORMATIONS_PATH, {})

def load_squads() -> Dict[str, Any]:
    return load_json(SQUADS_PATH, {})

def save_roles(roles_data: List[Dict[str, Any]]):
    save_json(ROLES_PATH, roles_data)
    global ROLES_DATA, ROLE_LOOKUP
    ROLES_DATA = roles_data
    ROLE_LOOKUP = {
        (r.get("Role") or r.get("RoleType") or "").strip().upper(): r
        for r in ROLES_DATA
    }

def save_formations(formation_maps: Dict[str, Any]):
    save_json(FORMATIONS_PATH, formation_maps)
    global FORMATION_MAPS
    FORMATION_MAPS = formation_maps

def save_squads(squads_data: Dict[str, Any]):
    save_json(SQUADS_PATH, squads_data)

# ----------------------------
# App init / globals
# ----------------------------
ROLES_DATA: List[Dict[str, Any]] = load_roles()
FORMATION_MAPS: Dict[str, Any] = load_formations()
SAVED_SQUADS: Dict[str, Any] = load_squads()
ROLE_LOOKUP: Dict[str, Dict[str, Any]] = {
    (r.get("Role") or r.get("RoleType") or "").strip().upper(): r
    for r in ROLES_DATA
}

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"]
)

# ----------------------------
# Models
# ----------------------------
class Club(BaseModel):
    club_name: str
    tier: str = "Iron"
    roster: List[int] = []

class PlayerIds(BaseModel):
    player_ids: List[int]

class PlayerAssignmentRequest(BaseModel):
    player_id: int
    old_club_name: str
    new_club_name: str

class PlayerSearchRequest(BaseModel):
    role_name: str
    auth_token: str
    tier: str
    # optional filters from UI
    positions: Optional[List[str]] = None
    paceMin: Optional[int] = None
    shootingMin: Optional[int] = None
    passingMin: Optional[int] = None
    dribblingMin: Optional[int] = None
    defenseMin: Optional[int] = None
    physicalMin: Optional[int] = None
    goalkeepingMin: Optional[int] = None
    sort_by: Optional[str] = None         # e.g., 'listing.price'
    sort_order: Optional[str] = None      # 'ASC' or 'DESC'

class SimulationRequest(BaseModel):
    player_ids: List[int]
    role_map: Dict[str, str]
    tier: str

# ----------------------------
# External fetch helpers
# ----------------------------
def fetch_player_listing(player_id: int) -> Optional[Dict[str, Any]]:
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
        if not player_data:
            return None
        if as_series:
            m = player_data.get("metadata", {})
            positions_raw = m.get("positions", [])
            positions_norm = [(pos or "").strip().upper() for pos in positions_raw]
            player_dict = {
                "id": player_data.get("id"),
                "firstName": m.get("firstName", ""),
                "lastName": m.get("lastName", ""),
                "age": m.get("age", 0),
                "positions": positions_norm,
                "overall": m.get("overall", 0),
                "pace": m.get("pace", 0),
                "shooting": m.get("shooting", 0),
                "passing": m.get("passing", 0),
                "dribbling": m.get("dribbling", 0),
                "defense": m.get("defense", 0),
                "physical": m.get("physical", 0),
                "goalkeeping": m.get("goalkeeping", 0),
            }
            return pd.Series(player_dict)
        return player_data
    except requests.exceptions.RequestException:
        return None

def fetch_players() -> pd.DataFrame:
    try:
        r = requests.get(PLAYERS_API_OWNED, timeout=30)
        r.raise_for_status()
        data = r.json()
        data_list = data if isinstance(data, list) else data.get("players", [])
    except requests.exceptions.RequestException:
        data_list = []

    players = []
    for p in data_list:
        player_id = p.get("id")
        if player_id is None:
            continue
        m = p.get("metadata", {})
        positions_raw = m.get("positions", [])
        positions_norm = [(pos or "").strip().upper() for pos in positions_raw]
        players.append({
            "id": int(player_id),
            "firstName": m.get("firstName", ""),
            "lastName": m.get("lastName", ""),
            "age": m.get("age", 0),
            "positions": positions_norm,
            "overall": m.get("overall", 0),
            "pace": m.get("pace", 0),
            "shooting": m.get("shooting", 0),
            "passing": m.get("passing", 0),
            "dribbling": m.get("dribbling", 0),
            "defense": m.get("defense", 0),
            "physical": m.get("physical", 0),
            "goalkeeping": m.get("goalkeeping", 0),
        })
    return pd.DataFrame(players)

# ----------------------------
# Fit / scoring
# ----------------------------
def calc_fit(player: pd.Series, role_name: str, tier: str):
    role_key = (role_name or "").strip().upper()
    role = ROLE_LOOKUP.get(role_key)
    if not role:
        return -999, "Unknown", ""
    thresholds = TIER_THRESH.get(tier, TIER_THRESH["Iron"])
    need_pos = (role.get("Position", "") or "").strip().upper()
    player_pos = {(p or "").strip().upper() for p in (player.get("positions") or [])}
    if need_pos and need_pos not in player_pos:
        return -999, "Unusable", ""
    score = 0
    for i, attr_field in enumerate(["Attribute1", "Attribute2", "Attribute3", "Attribute4"]):
        code = (role.get(attr_field) or "").strip().upper()
        if not code:
            continue
        player_attr_col = ATTR_MAP.get(code)
        if not player_attr_col:
            continue
        val = player.get(player_attr_col, 0) or 0
        score += (val - thresholds[i]) * ATTRIBUTE_WEIGHTS[i]
    label = ("Elite" if score >= 50 else
             "Strong" if score >= 20 else
             "Natural" if score >= 0 else
             "Weak" if score >= -20 else
             "Unusable")
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
            if not role_name:
                continue

            role_info = ROLE_LOOKUP.get(role_name)
            if not role_info:
                continue

            required_pos = (role_info.get("Position", "") or "").strip().upper()
            if required_pos and required_pos not in player_pos:
                continue

            score, _, _ = calc_fit(player_series, role_name, tier)

            if score > max_score_for_tier:
                max_score_for_tier = score
                best_role_for_tier = role_name

        if max_score_for_tier >= 0:
            return pd.Series([tier, best_role_for_tier], index=['bestTier', 'bestRole'])

    return pd.Series(["Unrated", "N/A"], index=['bestTier', 'bestRole'])

# ----------------------------
# Read-only endpoints
# ----------------------------
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

@app.get("/tiers")
def get_tiers():
    return {"tiers": TIER_THRESH}

# ----------------------------
# Player analysis endpoints
# ----------------------------
@app.get("/player/{player_id}/card-analysis")
def get_player_card_analysis(player_id: int):
    player_data = fetch_single_player(player_id, as_series=False)
    if not player_data:
        raise HTTPException(status_code=404, detail="Player not found")

    listing_data = fetch_player_listing(player_id)
    nationality = player_data.get("metadata", {}).get("nationalities", [None])[0]
    country_code = COUNTRY_CODES.get(nationality, "")

    return {
        "id": player_data.get("id"),
        "metadata": player_data.get("metadata", {}),
        "activeContract": player_data.get("activeContract", {}),
        "listing": listing_data,
        "country_code": country_code
    }

@app.get("/player/{player_id}/role-analysis")
def get_player_role_analysis(player_id: int):
    player_series = fetch_single_player(player_id, as_series=True)
    if player_series is None or player_series.empty:
        raise HTTPException(status_code=404, detail="Player not found")

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

# ----------------------------
# Agency / clubs
# ----------------------------
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
                if not role_name:
                    continue
                role_info = ROLE_LOOKUP.get(role_name)
                if not role_info:
                    continue
                required_pos = (role_info.get("Position", "") or "").strip().upper()
                if required_pos and required_pos not in player_pos:
                    continue
                score, _, _ = calc_fit(player_series, role_name, tier)
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
        for pid in roster_ids:
            player_to_club_map[int(pid)] = club_name
    players_df['assigned_club'] = players_df['id'].map(player_to_club_map).fillna("Unassigned")
    return json.loads(players_df.to_json(orient="records"))

@app.post("/players/by_ids")
def get_players_by_ids(player_ids_model: PlayerIds):
    player_ids = player_ids_model.player_ids
    players_df = fetch_players()
    if players_df.empty:
        return []
    roster_players = players_df[players_df['id'].isin(player_ids)].copy()
    best_fit_df = roster_players.apply(calculate_best_role_for_player, axis=1)
    roster_players = pd.concat([roster_players, best_fit_df], axis=1)
    return json.loads(roster_players.to_json(orient="records"))

@app.get("/clubs")
def get_clubs() -> List[Club]:
    squads_data = load_squads()
    club_list = []
    for club_name, club_data in squads_data.items():
        if isinstance(club_data, dict) and "club_name" in club_data:
            club_list.append(club_data)
        elif isinstance(club_data, list):
            club_list.append({"club_name": club_name, "tier": "Iron", "roster": club_data})
    return club_list

@app.get("/clubs/{club_name}")
def get_club_by_name(club_name: str):
    squads_data = load_squads()
    if club_name in squads_data:
        club_data = squads_data[club_name]
        if isinstance(club_data, dict):
            return club_data
        elif isinstance(club_data, list):
            return {"club_name": club_name, "tier": "Iron", "roster": club_data}
    raise HTTPException(status_code=404, detail="Club not found")

@app.post("/clubs")
def create_club(club: Club):
    squads_data = load_squads()
    if club.club_name in squads_data:
        raise HTTPException(status_code=400, detail="Club with this name already exists")
    squads_data[club.club_name] = club.dict()
    save_squads(squads_data)
    return club

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

@app.post("/players/assign")
def update_player_assignment(req: PlayerAssignmentRequest):
    squads = load_squads()

    # remove from old
    if req.old_club_name and req.old_club_name != "Unassigned":
        old_obj = squads.get(req.old_club_name)
        if isinstance(old_obj, dict):
            old_obj["roster"] = [pid for pid in old_obj.get("roster", []) if int(pid) != int(req.player_id)]
        elif isinstance(old_obj, list):
            squads[req.old_club_name] = [pid for pid in old_obj if int(pid) != int(req.player_id)]

    # add to new
    if req.new_club_name and req.new_club_name != "Unassigned":
        new_obj = squads.get(req.new_club_name)
        if new_obj is None:
            squads[req.new_club_name] = {"club_name": req.new_club_name, "tier": "Iron", "roster": [req.player_id]}
        elif isinstance(new_obj, dict):
            roster = set(int(x) for x in new_obj.get("roster", []))
            roster.add(int(req.player_id))
            new_obj["roster"] = list(sorted(roster))
        else:
            roster = set(int(x) for x in new_obj)
            roster.add(int(req.player_id))
            squads[req.new_club_name] = list(sorted(roster))

    save_squads(squads)
    return {"ok": True}

# ----------------------------
# Marketplace search proxy (role-aware)
# ----------------------------
@app.post("/market/search")
def market_search(req: PlayerSearchRequest):
    params = {
        "limit": 50,
        "type": "PLAYER",
        "status": "AVAILABLE",
        "view": "full"
    }
    if req.positions:
        params["positions"] = ",".join(req.positions)
    if req.paceMin is not None: params["paceMin"] = req.paceMin
    if req.shootingMin is not None: params["shootingMin"] = req.shootingMin
    if req.passingMin is not None: params["passingMin"] = req.passingMin
    if req.dribblingMin is not None: params["dribblingMin"] = req.dribblingMin
    if req.defenseMin is not None: params["defenseMin"] = req.defenseMin
    if req.physicalMin is not None: params["physicalMin"] = req.physicalMin
    if req.goalkeepingMin is not None: params["goalkeepingMin"] = req.goalkeepingMin
    if req.sort_by: params["sorts"] = req.sort_by
    if req.sort_order: params["sortsOrders"] = req.sort_order

    try:
        r = requests.get(MARKETPLACE_API, params=params, timeout=30)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"External marketplace error: {e}")

# ----------------------------
# Config CRUD + attributes
# ----------------------------
@app.get("/attributes")
def get_attributes():
    """Return list of attribute codes used by roles."""
    return {"attributes": list(ATTR_MAP.keys())}

@app.post("/roles")
def create_role(role: Dict[str, Any]):
    roles = load_roles()
    name = (role.get("Role") or role.get("RoleType") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Role name required")
    name_up = name.upper()
    if any(((r.get("Role") or r.get("RoleType") or "").strip().upper() == name_up) for r in roles):
        raise HTTPException(status_code=409, detail="Role already exists")
    roles.append(role)
    save_roles(roles)
    return {"ok": True, "role": role}

@app.put("/roles/{original_name}")
def update_role(original_name: str, role: Dict[str, Any]):
    roles = load_roles()
    target_up = original_name.strip().upper()
    idx = next(
        (i for i, r in enumerate(roles)
         if (r.get("Role") or r.get("RoleType") or "").strip().upper() == target_up),
        None
    )
    if idx is None:
        raise HTTPException(status_code=404, detail="Role not found")
    roles[idx] = role
    save_roles(roles)
    return {"ok": True, "role": role}

@app.delete("/roles/{role_name}")
def delete_role(role_name: str):
    roles = load_roles()
    target_up = role_name.strip().upper()
    new_roles = [
        r for r in roles
        if (r.get("Role") or r.get("RoleType") or "").strip().upper() != target_up
    ]
    if len(new_roles) == len(roles):
        raise HTTPException(status_code=404, detail="Role not found")
    save_roles(new_roles)
    return {"ok": True}

@app.post("/formations")
def create_formation(payload: Dict[str, Any]):
    formation_name = (payload.get("formationName") or payload.get("name") or "").strip()
    roles_map = payload.get("roles") or payload.get("mapping") or payload.get("positions")
    if not formation_name or roles_map is None:
        raise HTTPException(status_code=400, detail="formationName and roles are required")
    formations = load_formations()
    if formation_name in formations:
        raise HTTPException(status_code=409, detail="Formation already exists")
    formations[formation_name] = roles_map
    save_formations(formations)
    return {"ok": True, "formationName": formation_name, "roles": roles_map}

@app.put("/formations/{formation_name}")
def update_formation(formation_name: str, roles_map: Dict[str, Any] = Body(...)):
    formations = load_formations()
    if formation_name not in formations:
        raise HTTPException(status_code=404, detail="Formation not found")
    formations[formation_name] = roles_map
    save_formations(formations)
    return {"ok": True, "formationName": formation_name, "roles": roles_map}

@app.delete("/formations/{formation_name}")
def delete_formation(formation_name: str):
    formations = load_formations()
    if formation_name not in formations:
        raise HTTPException(status_code=404, detail="Formation not found")
    formations.pop(formation_name, None)
    save_formations(formations)
    return {"ok": True}
