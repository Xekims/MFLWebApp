// utils/flags.js (or paste above your component)
export const NATIONALITY_TO_FLAG = {
  // Home nations (use GB subdivisions so you get the right flags)
  ENGLAND: 'gb-eng',
  SCOTLAND: 'gb-sct',
  WALES: 'gb-wls',
  NORTHERN_IRELAND: 'gb-nir',
  UNITED_KINGDOM: 'gb',
  GREAT_BRITAIN: 'gb',

  // Americas
  UNITED_STATES: 'us', USA: 'us', CANADA: 'ca', MEXICO: 'mx',
  COSTA_RICA: 'cr', JAMAICA: 'jm', TRINIDAD_AND_TOBAGO: 'tt',
  ARGENTINA: 'ar', BRAZIL: 'br', CHILE: 'cl', COLOMBIA: 'co',
  ECUADOR: 'ec', PARAGUAY: 'py', PERU: 'pe', URUGUAY: 'uy',

  // Europe (sample of common ones in your data)
  FRANCE: 'fr', GERMANY: 'de', ITALY: 'it', SPAIN: 'es',
  PORTUGAL: 'pt', NETHERLANDS: 'nl', BELGIUM: 'be', SWITZERLAND: 'ch',
  AUSTRIA: 'at', NORWAY: 'no', SWEDEN: 'se', DENMARK: 'dk', FINLAND: 'fi',
  POLAND: 'pl', CZECH_REPUBLIC: 'cz', HUNGARY: 'hu', ROMANIA: 'ro',
  SLOVAKIA: 'sk', SLOVENIA: 'si', CROATIA: 'hr', SERBIA: 'rs',
  BOSNIA_AND_HERZEGOVINA: 'ba', NORTH_MACEDONIA: 'mk', GREECE: 'gr',
  IRELAND: 'ie', REPUBLIC_OF_IRELAND: 'ie', UKRAINE: 'ua', RUSSIA: 'ru',

  // Africa / Middle East
  MOROCCO: 'ma', ALGERIA: 'dz', TUNISIA: 'tn', EGYPT: 'eg',
  IVORY_COAST: 'ci', COTE_D_IVOIRE: 'ci', SENEGAL: 'sn', GHANA: 'gh',
  NIGERIA: 'ng', CAMEROON: 'cm', SOUTH_AFRICA: 'za',
  SAUDI_ARABIA: 'sa', UNITED_ARAB_EMIRATES: 'ae', QATAR: 'qa',
  IRAN: 'ir', IRAQ: 'iq', ISRAEL: 'il',

  // Asia / Oceania
  JAPAN: 'jp', CHINA: 'cn',
  KOREA_REPUBLIC: 'kr', SOUTH_KOREA: 'kr',
  KOREA_DPR: 'kp', NORTH_KOREA: 'kp',
  THAILAND: 'th', VIETNAM: 'vn', INDONESIA: 'id', MALAYSIA: 'my',
  PHILIPPINES: 'ph', INDIA: 'in', PAKISTAN: 'pk', BANGLADESH: 'bd',
  AUSTRALIA: 'au', NEW_ZEALAND: 'nz',
};

export function countryToFlagCode(input) {
  if (!input) return null;
  const key = String(input).toUpperCase().trim().replace(/\s+/g, '_');

  // direct hit first
  if (NATIONALITY_TO_FLAG[key]) return NATIONALITY_TO_FLAG[key];

  // try to strip common prefixes found in datasets
  const cleaned = key
    .replace(/^REPUBLIC_OF_/, '')
    .replace(/^DEMOCRATIC_REPUBLIC_OF_THE_/, '')
    .replace(/^ISLAMIC_REPUBLIC_OF_/, '');
  if (NATIONALITY_TO_FLAG[cleaned]) return NATIONALITY_TO_FLAG[cleaned];

  return null;
}

export function getFlagUrlFromPlayer(playerOrWrapper) {
  // Accept either {player: {...}} or the player object itself
  const p = playerOrWrapper?.player ?? playerOrWrapper;
  const m = p?.metadata ?? {};
  const clubCountry = p?.activeContract?.club?.country;

  const source =
    m.country_code ||
    (Array.isArray(m.nationalities) && m.nationalities[0]) ||
    clubCountry ||
    '';

  const code = countryToFlagCode(source);
  return code ? `https://flagcdn.com/w40/${code.toLowerCase()}.png` : '';
}
