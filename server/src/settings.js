import { db } from "./db.js";

const DEFAULTS = { companyName: "", currencySymbol: "TSh", forecastMethod: "linear", seasonLength: 4 };

function shape(row) {
  if (!row) return { ...DEFAULTS };
  return {
    companyName: row.company_name,
    currencySymbol: row.currency_symbol,
    forecastMethod: row.forecast_method,
    seasonLength: row.season_length,
  };
}

export function getSettings() {
  const row = db.prepare("SELECT * FROM settings WHERE id = 1").get();
  return shape(row);
}

export function updateSettings(partial) {
  const merged = { ...getSettings(), ...Object.fromEntries(Object.entries(partial).filter(([, v]) => v !== undefined)) };
  db.prepare(`
    INSERT INTO settings (id, company_name, currency_symbol, forecast_method, season_length, updated_at)
    VALUES (1, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      company_name = excluded.company_name,
      currency_symbol = excluded.currency_symbol,
      forecast_method = excluded.forecast_method,
      season_length = excluded.season_length,
      updated_at = excluded.updated_at
  `).run(merged.companyName, merged.currencySymbol, merged.forecastMethod, merged.seasonLength);
  return merged;
}
