// frontend/src/api.js
const API_URL = "http://localhost:8000";
const EXTERNAL_API_URL = "https://z519wdyajg.execute-api.us-east-1.amazonaws.com/prod";

// ---------- Helpers ----------
async function jsonOrThrow(res, defaultMsg) {
  if (!res.ok) {
    let msg = defaultMsg;
    try {
      const err = await res.json();
      msg = err.detail || err.message || defaultMsg;
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

// ---------- Config / reference data ----------
export async function fetchRoles() {
  const res = await fetch(`${API_URL}/roles`);
  return jsonOrThrow(res, "Failed to fetch roles");
}

export async function fetchAttributes() {
  const res = await fetch(`${API_URL}/attributes`);
  return jsonOrThrow(res, "Failed to fetch attributes");
}

export async function fetchTiers() {
  const res = await fetch(`${API_URL}/tiers`);
  return jsonOrThrow(res, "Failed to fetch tiers");
}

// Return { formations: ["4-3-3", ...] }
export async function fetchFormations() {
  const res = await fetch(`${API_URL}/formations`);
  const data = await jsonOrThrow(res, "Failed to fetch formations");
  if (Array.isArray(data)) {
    return { formations: data };
  }
  if (data && typeof data === "object") {
    return { formations: Object.keys(data) };
  }
  return { formations: [] };
}

export async function fetchFormationMap(formationName) {
  const res = await fetch(`${API_URL}/formation/${encodeURIComponent(formationName)}`);
  return jsonOrThrow(res, "Failed to fetch formation map");
}

// ---------- Marketplace ----------
export async function searchMarketplace(params) {
  const { role_name, auth_token, tier, sortBy, sortOrder, ...filters } = params;

  // Backend proxy when role_name + auth_token present (used by SquadPicker path)
  if (role_name && auth_token) {
    const res = await fetch(`${API_URL}/market/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role_name,
        tier: tier || "Iron",
        auth_token,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...filters, // <-- fixed spread
      }),
    });
    return jsonOrThrow(res, "Marketplace search via backend failed");
  }

  // Direct external search (Marketplace page)
  const queryParams = {
    limit: 50,
    type: "PLAYER",
    status: "AVAILABLE",
    view: "full",
  };
  if (sortBy) queryParams.sorts = sortBy;
  if (sortOrder) queryParams.sortsOrders = sortOrder;

  if (filters.positions && filters.positions.length > 0) {
    queryParams.positions = Array.isArray(filters.positions)
      ? filters.positions.join(",")
      : filters.positions;
  }

  // attribute minimums
  [
    "paceMin",
    "shootingMin",
    "passingMin",
    "dribblingMin",
    "defenseMin",
    "physicalMin",
    "goalkeepingMin",
  ].forEach((k) => {
    if (filters[k] !== undefined) queryParams[k] = filters[k];
  });

  const qs = new URLSearchParams(queryParams).toString();
  const res = await fetch(`${EXTERNAL_API_URL}/listings?${qs}`);
  return jsonOrThrow(res, "Failed to fetch marketplace listings");
}

// ---------- Player analysis ----------
export async function fetchPlayerCardAnalysis(playerId) {
  const res = await fetch(`${API_URL}/player/${playerId}/card-analysis`);
  return jsonOrThrow(res, "Failed to fetch player card analysis");
}

export async function fetchPlayerRoleAnalysis(playerId) {
  const res = await fetch(`${API_URL}/player/${playerId}/role-analysis`);
  return jsonOrThrow(res, "Failed to fetch player role analysis");
}

// ---------- Agency / clubs ----------
export async function fetchOwnedPlayers() {
  const res = await fetch(`${API_URL}/players/owned`);
  return jsonOrThrow(res, "Failed to fetch owned players");
}

export async function fetchPlayersByIds(playerIds) {
  const res = await fetch(`${API_URL}/players/by_ids`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_ids: playerIds }),
  });
  return jsonOrThrow(res, "Failed to fetch players by IDs");
}

export async function updatePlayerAssignment(payload) {
  const res = await fetch(`${API_URL}/players/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow(res, "Failed to update player assignment");
}

export async function fetchClubs() {
  const res = await fetch(`${API_URL}/clubs`);
  return jsonOrThrow(res, "Failed to fetch clubs");
}

export async function createClub(clubName, tier) {
  const res = await fetch(`${API_URL}/clubs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ club_name: clubName, tier: tier || "Iron", roster: [] }),
  });
  return jsonOrThrow(res, "Failed to create club");
}

export async function deleteClub(clubName) {
  const res = await fetch(`${API_URL}/clubs/${encodeURIComponent(clubName)}`, {
    method: "DELETE",
  });
  return jsonOrThrow(res, "Failed to delete club");
}

export async function fetchClubByName(clubName) {
  const res = await fetch(`${API_URL}/clubs/${encodeURIComponent(clubName)}`);
  return jsonOrThrow(res, "Failed to fetch club");
}

export async function updateClubRoster(clubName, roster) {
  const res = await fetch(`${API_URL}/clubs/${encodeURIComponent(clubName)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(roster),
  });
  return jsonOrThrow(res, "Failed to update club roster");
}
