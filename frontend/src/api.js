// file: frontend/src/api.js

const API_URL = "http://localhost:8000";
const EXTERNAL_API_URL = "https://z519wdyajg.execute-api.us-east-1.amazonaws.com/prod";

// --- Core Fetch Functions ---

export async function fetchFormations() {
  const res = await fetch(`${API_URL}/formations`);
  if (!res.ok) throw new Error('Failed to fetch formations');
  return res.json();
}

export async function fetchFormationMap(formationName) {
  const res = await fetch(`${API_URL}/formation/${encodeURIComponent(formationName)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch formation map: ${res.status}`);
  }
  return res.json();
}

export async function fetchRoles() {
  const res = await fetch(`${API_URL}/roles`);
  if (!res.ok) throw new Error('Failed to fetch roles');
  return res.json();
}

export async function assignSquad(payload) {
  const res = await fetch(`${API_URL}/squad/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to assign squad');
  return res.json();
}

export async function saveSquad(squadName, squadData) {
  const res = await fetch(`${API_URL}/squads/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ squad_name: squadName, squad_data: squadData }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || 'Failed to save squad');
  }
  return res.json();
}

export async function searchMarketplace(params) {
  // Destructure to separate known keys
  const { role_name, auth_token, tier, ...filters } = params;
  
  // **Case 1: Role-specific search with auth_token (called from SquadPicker)**
  if (role_name && auth_token) {
    try {
      const res = await fetch(`${API_URL}/market/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_name: role_name,
          tier: tier || "Iron",        // default to Iron if tier not provided
          auth_token,
          ...filters,
        })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.detail || errorData.message || 'Marketplace search via backend failed');
      }
      return await res.json();
    } catch (err) {
      // Log and rethrow to be caught in the UI
      console.error("Error in backend marketplace search:", err);
      throw err;
    }
  }
  
  // **Case 2: Direct search query to external API (from Marketplace page)**
  // Build query parameters, excluding 'tier'
  const queryParams = {
    limit: 50,
    type: 'PLAYER',
    status: 'AVAILABLE',
    view: 'full'
  };
  // Include positions filter if available
  if (filters.positions && filters.positions.length > 0) {
    // If positions is an array, join it; if it's already a string, use it directly
    queryParams.positions = Array.isArray(filters.positions)
      ? filters.positions.join(',')
      : filters.positions;
  }
  // Include attribute minimums if provided (even 0 values)
  if (filters.paceMin !== undefined)       queryParams.paceMin = filters.paceMin;
  if (filters.shootingMin !== undefined)   queryParams.shootingMin = filters.shootingMin;
  if (filters.passingMin !== undefined)    queryParams.passingMin = filters.passingMin;
  if (filters.dribblingMin !== undefined)  queryParams.dribblingMin = filters.dribblingMin;
  if (filters.defenseMin !== undefined)    queryParams.defenseMin = filters.defenseMin;
  if (filters.physicalMin !== undefined)   queryParams.physicalMin = filters.physicalMin;
  if (filters.goalkeepingMin !== undefined) queryParams.goalkeepingMin = filters.goalkeepingMin;
  // (Note: 'tier' is intentionally omitted here)
  
  const queryString = new URLSearchParams(queryParams).toString();
  const res = await fetch(`${EXTERNAL_API_URL}/listings?${queryString}`);
  if (!res.ok) {
    // Parse error response if possible
    const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
    // The external API might return an error message in { message } or { detail }
    const errMsg = errorData.detail || errorData.message || 'Failed to fetch marketplace listings';
    throw new Error(errMsg);
  }
  return await res.json();
}


export async function fetchPlayerAnalysis(playerId, tier) {
  // Assuming an endpoint for player analysis exists on the external API
  // This is a placeholder and might need adjustment based on actual API capabilities
  const res = await fetch(`${EXTERNAL_API_URL}/player/${playerId}/analysis?tier=${tier}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || 'Failed to fetch player analysis');
  }
  return res.json();
}

export async function fetchPlayerCardAnalysis(playerId) {
  const res = await fetch(`${API_URL}/player/${playerId}/card-analysis`);
  if (!res.ok) {
    throw new Error(`Failed to fetch player card analysis: ${res.status}`);
  }
  return res.json();
}

export async function fetchPlayerRoleAnalysis(playerId) {
  const res = await fetch(`${API_URL}/player/${playerId}/role-analysis`);
  if (!res.ok) {
    throw new Error(`Failed to fetch player role analysis: ${res.status}`);
  }
  return res.json();
}

// --- Agency/Club Functions ---

export async function fetchOwnedPlayers() {
  const res = await fetch(`${API_URL}/players/owned`);
  if (!res.ok) throw new Error('Failed to fetch owned players');
  return res.json();
}

export async function fetchPlayersByIds(playerIds) {
  const res = await fetch(`${API_URL}/players/by_ids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player_ids: playerIds }),
  });
  if (!res.ok) throw new Error('Failed to fetch players by IDs');
  return res.json();
}

export async function runSimulation(payload) {
  const res = await fetch(`${API_URL}/squads/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to run simulation');
  return res.json();
}

export async function fetchClubs() {
  const res = await fetch(`${API_URL}/clubs`);
  if (!res.ok) throw new Error('Failed to fetch clubs');
  return res.json();
}

export async function createClub(clubName, tier) {
  const res = await fetch(`${API_URL}/clubs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ club_name: clubName, tier: tier, roster: [] }),
  });
  if (!res.ok) throw new Error('Failed to create club');
  return res.json();
}

export async function updateClubRoster(clubName, roster) {
  const res = await fetch(`${API_URL}/clubs/${encodeURIComponent(clubName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(roster),
  });
  if (!res.ok) throw new Error('Failed to update roster');
  return res.json();
}


// --- CRUD for Roles & Formations ---

export async function createRole(role) {
  const res = await fetch(`${API_URL}/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(role),
  });
  if (!res.ok) throw new Error('Failed to create role');
  return res.json();
}

export async function updateRole(originalRoleName, role) {
  const res = await fetch(`${API_URL}/roles/${encodeURIComponent(originalRoleName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(role),
  });
  if (!res.ok) throw new Error('Failed to update role');
  return res.json();
}

export async function deleteRole(roleName) {
  const res = await fetch(`${API_URL}/roles/${encodeURIComponent(roleName)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete role');
  return res;
}

export async function fetchAttributes() {
  const res = await fetch(`${API_URL}/attributes`);
  return res.json();
}

export async function createFormation(formationName, roles) {
  const res = await fetch(`${API_URL}/formations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [formationName]: roles }),
  });
  if (!res.ok) throw new Error('Failed to create formation');
  return res.json();
}

export async function updateFormation(formationName, roles) {
  const res = await fetch(`${API_URL}/formations/${encodeURIComponent(formationName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(roles),
  });
  if (!res.ok) throw new Error('Failed to update formation');
  return res.json();
}

export async function deleteFormation(formationName) {
  const res = await fetch(`${API_URL}/formations/${encodeURIComponent(formationName)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete formation');
  return res;
}

export async function fetchTiers() {
  const res = await fetch(`${API_URL}/tiers`);
  if (!res.ok) throw new Error('Failed to fetch tiers');
  return res.json();
}

export async function fetchClubByName(clubName) {
    const response = await fetch(`${API_URL}/clubs/${encodeURIComponent(clubName)}`);
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch club ${clubName}`);
    }
    return response.json();
}

export async function deleteClub(clubName) {
  const response = await fetch(`${API_URL}/clubs/${encodeURIComponent(clubName)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to delete club.' }));
    throw new Error(errorData.detail);
  }
  return response.json();
}
export async function updatePlayerAssignment(assignmentData) {
  const response = await fetch(`${API_URL}/players/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assignmentData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(errorData.detail || 'Failed to assign player');
  }
  return await response.json();
}
