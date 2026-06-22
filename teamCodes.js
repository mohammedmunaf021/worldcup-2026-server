// Maps openfootball's team name strings (as used in worldcup.json) to the
// 3-letter codes used throughout this project's frontend (src/data/teams.js).
// This is the single source of truth for that mapping — if openfootball
// renames a team, fix it here only.

export const NAME_TO_CODE = {
  Mexico: "MEX",
  "South Korea": "KOR",
  "Czech Republic": "CZE",
  "South Africa": "RSA",
  Canada: "CAN",
  Switzerland: "CHE",
  "Bosnia & Herzegovina": "BIH",
  Qatar: "QAT",
  Brazil: "BRA",
  Morocco: "MAR",
  Scotland: "SCO",
  Haiti: "HAI",
  USA: "USA",
  Australia: "AUS",
  Paraguay: "PRY",
  Turkey: "TUR",
  Germany: "DEU",
  "Ivory Coast": "CIV",
  Ecuador: "ECU",
  Curaçao: "CUW",
  Netherlands: "NLD",
  Japan: "JPN",
  Sweden: "SWE",
  Tunisia: "TUN",
  Belgium: "BEL",
  Egypt: "EGY",
  Iran: "IRN",
  "New Zealand": "NZL",
  Spain: "ESP",
  Uruguay: "URY",
  "Saudi Arabia": "SAU",
  "Cape Verde": "CPV",
  France: "FRA",
  Norway: "NOR",
  Senegal: "SEN",
  Iraq: "IRQ",
  Argentina: "ARG",
  Austria: "AUT",
  Algeria: "ALG",
  Jordan: "JOR",
  Portugal: "PRT",
  Colombia: "COL",
  Uzbekistan: "UZB",
  "DR Congo": "COD",
  England: "ENG",
  Croatia: "HRV",
  Ghana: "GHA",
  Panama: "PAN",
};

export const CODE_TO_NAME = Object.fromEntries(
  Object.entries(NAME_TO_CODE).map(([name, code]) => [code, name])
);

export function toCode(name) {
  return NAME_TO_CODE[name] || null;
}

export function toName(code) {
  return CODE_TO_NAME[code] || null;
}

// Returns true if a team string is a real team (not a bracket placeholder
// like "1A", "W73", "L101" used for knockout slots not yet decided).
export function isRealTeam(name) {
  return Boolean(NAME_TO_CODE[name]);
}
