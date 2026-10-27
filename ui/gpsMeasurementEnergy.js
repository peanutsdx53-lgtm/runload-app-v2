/* Unmodified energy estimator from runload-app/main ui/mobileRunMeasurementEnergy.js.
 * Model adult-compendium-2024-running-speed-v1, RUN/JOG only; not the 12-region model.
 */
const MPH_PER_KMH = 0.621371192237334;
const MIN_BODY_MASS_KG = 25;
const MAX_BODY_MASS_KG = 180;
const MIN_VALID_DISTANCE_KM = 0.01;

export const RUN_ENERGY_MODEL_ID = "adult-compendium-2024-running-speed-v1";

// 2024 Adult Compendium of Physical Activities — Running table.
// Only level running/jogging speed rows are used here. Uphill/downhill,
// stroller, backpack, barefoot, stairs, track competition, and run/walk rows
// are intentionally excluded from this first model.
const RUNNING_MET_BANDS = Object.freeze([
  Object.freeze({ code: "12026", minMph: 2.6, maxMph: 3.7, met: 3.3 }),
  Object.freeze({ code: "12028", minMph: 4.0, maxMph: 4.2, met: 6.5 }),
  Object.freeze({ code: "12029", minMph: 4.3, maxMph: 4.8, met: 7.8 }),
  Object.freeze({ code: "12030", minMph: 5.0, maxMph: 5.2, met: 8.5 }),
  Object.freeze({ code: "12045", minMph: 5.5, maxMph: 5.8, met: 9.0 }),
  Object.freeze({ code: "12050", minMph: 6.0, maxMph: 6.3, met: 9.3 }),
  Object.freeze({ code: "12060", minMph: 6.7, maxMph: 6.7, met: 10.5 }),
  Object.freeze({ code: "12070", minMph: 7.0, maxMph: 7.0, met: 11.0 }),
  Object.freeze({ code: "12080", minMph: 7.5, maxMph: 7.5, met: 11.8 }),
  Object.freeze({ code: "12090", minMph: 8.0, maxMph: 8.0, met: 12.0 }),
  Object.freeze({ code: "12100", minMph: 8.6, maxMph: 8.6, met: 12.5 }),
  Object.freeze({ code: "12110", minMph: 9.0, maxMph: 9.0, met: 13.0 }),
  Object.freeze({ code: "12115", minMph: 9.3, maxMph: 9.6, met: 14.8 }),
  Object.freeze({ code: "12120", minMph: 10.0, maxMph: 10.0, met: 14.8 }),
  Object.freeze({ code: "12130", minMph: 11.0, maxMph: 11.0, met: 16.8 }),
  Object.freeze({ code: "12132", minMph: 12.0, maxMph: 12.0, met: 18.5 }),
  Object.freeze({ code: "12134", minMph: 13.0, maxMph: 13.0, met: 19.8 }),
  Object.freeze({ code: "12135", minMph: 14.0, maxMph: 14.0, met: 23.0 }),
]);

function round(value, digits = 1) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function distanceToBand(mph, band) {
  if (mph < band.minMph) return band.minMph - mph;
  if (mph > band.maxMph) return mph - band.maxMph;
  return 0;
}

export function selectRunningMetBySpeed(averageSpeedKmh) {
  const speedKmh = Number(averageSpeedKmh);
  if (!Number.isFinite(speedKmh) || speedKmh <= 0) return null;
  const speedMph = speedKmh * MPH_PER_KMH;
  const minimum = RUNNING_MET_BANDS[0].minMph;
  const maximum = RUNNING_MET_BANDS[RUNNING_MET_BANDS.length - 1].maxMph;
  if (speedMph < minimum || speedMph > maximum) return null;

  const exact = RUNNING_MET_BANDS.find((band) => speedMph >= band.minMph && speedMph <= band.maxMph);
  if (exact) {
    return Object.freeze({
      code: exact.code,
      met: exact.met,
      speedMph: round(speedMph, 2),
      speedKmh: round(speedKmh, 2),
      mapping: "official-range",
    });
  }

  // Some Compendium speed rows have small gaps. For a measured average speed
  // inside one of those gaps, use the nearest adjacent official speed band.
  // This deterministic bridge is the application's mapping rule, not a new MET value.
  let nearest = RUNNING_MET_BANDS[0];
  let nearestDistance = distanceToBand(speedMph, nearest);
  for (const band of RUNNING_MET_BANDS.slice(1)) {
    const distance = distanceToBand(speedMph, band);
    if (distance < nearestDistance) {
      nearest = band;
      nearestDistance = distance;
    }
  }
  return Object.freeze({
    code: nearest.code,
    met: nearest.met,
    speedMph: round(speedMph, 2),
    speedKmh: round(speedKmh, 2),
    mapping: "nearest-adjacent-range",
  });
}

export function estimateRunningEnergy({ bodyMassKg, distanceKm, durationMs } = {}) {
  const mass = Number(bodyMassKg);
  if (!Number.isFinite(mass) || mass < MIN_BODY_MASS_KG || mass > MAX_BODY_MASS_KG) {
    return Object.freeze({ ok: false, reason: "BODY_MASS_UNAVAILABLE" });
  }

  const distance = Number(distanceKm);
  if (!Number.isFinite(distance) || distance < MIN_VALID_DISTANCE_KM) {
    return Object.freeze({ ok: false, reason: "GPS_DISTANCE_INSUFFICIENT" });
  }

  const duration = Number(durationMs);
  if (!Number.isFinite(duration) || duration <= 0) {
    return Object.freeze({ ok: false, reason: "DURATION_UNAVAILABLE" });
  }

  const durationHours = duration / 3600000;
  const durationMinutes = duration / 60000;
  const averageSpeedKmh = distance / durationHours;
  const category = selectRunningMetBySpeed(averageSpeedKmh);
  if (!category) {
    return Object.freeze({
      ok: false,
      reason: "SPEED_OUT_OF_SUPPORTED_RANGE",
      averageSpeedKmh: round(averageSpeedKmh, 2),
    });
  }

  // Official Compendium conversion: MET × 3.5 × body mass (kg) ÷ 200 = kcal/min.
  const kcalPerMinute = category.met * 3.5 * mass / 200;
  const estimatedKcal = kcalPerMinute * durationMinutes;

  return Object.freeze({
    ok: true,
    modelId: RUN_ENERGY_MODEL_ID,
    estimatedKcal: round(estimatedKcal, 1),
    met: category.met,
    compendiumCode: category.code,
    mapping: category.mapping,
    bodyMassKg: round(mass, 1),
    averageSpeedKmh: category.speedKmh,
    durationMinutes: round(durationMinutes, 2),
  });
}
