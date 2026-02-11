import SiteSettings from "../models/SiteSettings.model.js";

let cachedSettings = null;
let cacheExpiresAt = 0;

// simple in-memory cache 60 seconds
export async function getEmailSettings() {
  const now = Date.now();
  if (cachedSettings && now < cacheExpiresAt) {
    return cachedSettings;
  }

  try {
    const settings = await SiteSettings.getSingleton();
    cachedSettings = {
      contactEmail: settings.contactEmail || null,
      supportEmail: settings.supportEmail || null,
    };
    cacheExpiresAt = now + 60 * 1000;
  } catch {
    cachedSettings = {
      contactEmail: null,
      supportEmail: null,
    };
    cacheExpiresAt = now + 30 * 1000;
  }

  return cachedSettings;
}
