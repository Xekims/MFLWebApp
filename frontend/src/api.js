// file: frontend/src/api.js

const API_URL = "http://localhost:8000";

export async function fetchFormations() {
  const res = await fetch(`${API_URL}/formations`);
  return res.json();
}

export async function fetchRoles() {
  const res = await fetch(`${API_URL}/roles`);
  return res.json();
}

export async function assignSquad(payload) {
  const res = await fetch(`${API_URL}/squad/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function searchMarketplace(payload) {
  // payload is { role_name, auth_token }
  const res = await fetch(`${API_URL}/market/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    const detail = data.detail?.message || data.detail || 'An unknown error occurred.';
    throw new Error(detail);
  }
  return data;
}

export async function fetchFormationMap(formationName) {
  const res = await fetch(`${API_URL}/formation/${encodeURIComponent(formationName)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch formation map: ${res.status}`);
  }
  return res.json();
}

export async function fetchPlayerAnalysis(playerId, tier) {
  const res = await fetch(`${API_URL}/player/${playerId}/analysis?tier=${tier}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch player analysis: ${res.status}`);
  }
  return res.json();
}