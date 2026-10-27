/**
 * RunLoad mobile-only WALK / JOGGING speed model.
 *
 * Scientific authority: Mobile Walk/Jog Numeric Freeze V1.3 (2026-09-30).
 * Isolation rule: this module is not imported by the existing RUNNING_CURRENT engine.
 * Region values are independent constructs; there is no whole-body/common multiplier.
 */

export const MOBILE_WALK_JOG_MODEL_VERSION = "2026-09-30.v1.3";

export const MOBILE_GAIT_IDS = Object.freeze({
  WALK: "WALK",
  JOGGING: "JOGGING",
});

export const REGION_IDS = Object.freeze(
  Array.from({ length: 12 }, (_, index) => `R${String(index + 1).padStart(2, "0")}`),
);

export const STRICT_ALL12_BANDS = Object.freeze({
  WALK: Object.freeze({ minMps: 85 / 60, maxMps: 1.75 }),
  JOGGING: Object.freeze({ minMps: 2.1, maxMps: 2.5 }),
  RUNNING_CURRENT_POINTER: Object.freeze({ minMps: 2.25, maxMps: 3.33 }),
});

export const TRANSITION_POLICY = Object.freeze({
  strictGap: Object.freeze({ minExclusiveMps: 1.75, maxExclusiveMps: 2.1 }),
  walkP1: Object.freeze({ minExclusiveMps: 1.75, maxInclusiveMps: 2.0 }),
  jogP1: Object.freeze({ minInclusiveMps: 2.0, maxExclusiveMps: 2.1 }),
});

const EPS = 1e-9;

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function near(a, b, tolerance = 1e-8) {
  return Math.abs(a - b) <= tolerance;
}

function freezeAnchors(rows) {
  return Object.freeze(rows.map(([x, y]) => Object.freeze([x, y])));
}

function findSegment(x, anchors, { allowExtrapolateLow = false, allowExtrapolateHigh = false } = {}) {
  if (x < anchors[0][0] - EPS) {
    return allowExtrapolateLow ? [anchors[0], anchors[1]] : null;
  }
  const last = anchors.length - 1;
  if (x > anchors[last][0] + EPS) {
    return allowExtrapolateHigh ? [anchors[last - 1], anchors[last]] : null;
  }
  for (let index = 0; index < last; index += 1) {
    if (x >= anchors[index][0] - EPS && x <= anchors[index + 1][0] + EPS) {
      return [anchors[index], anchors[index + 1]];
    }
  }
  return null;
}

function interpolate(x, anchors, options) {
  const segment = findSegment(x, anchors, options);
  if (!segment) return null;
  const [[x0, y0], [x1, y1]] = segment;
  if (near(x0, x1)) return y0;
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

function exactAnchor(x, anchors) {
  return anchors.some(([anchor]) => near(x, anchor));
}

function normalizeToReference(raw, referenceRaw) {
  if (!(Number.isFinite(raw) && Number.isFinite(referenceRaw) && Math.abs(referenceRaw) > EPS)) return null;
  return (raw / referenceRaw) * 100;
}

function polarityComposite({ speedMps, positive, negative, referenceSpeedMps, allowExtrapolateHigh = false }) {
  const options = { allowExtrapolateHigh };
  const pos = interpolate(speedMps, positive, options);
  const neg = interpolate(speedMps, negative, options);
  const refPos = interpolate(referenceSpeedMps, positive);
  const refNeg = interpolate(referenceSpeedMps, negative);
  if ([pos, neg, refPos, refNeg].some((value) => value == null)) return null;
  return ((pos / refPos) + (neg / refNeg)) * 50;
}

function componentComposite({ speedMps, components, referenceSpeedMps, allowExtrapolateHigh = false }) {
  const values = components.map((anchors) => {
    const raw = interpolate(speedMps, anchors, { allowExtrapolateHigh });
    const ref = interpolate(referenceSpeedMps, anchors);
    return raw == null || ref == null ? null : normalizeToReference(raw, ref);
  });
  if (values.some((value) => value == null)) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function routeResult(route, speedMps, index, evidenceTier, outputStatus = "OK") {
  return Object.freeze({
    gaitId: route.gaitId,
    regionId: route.regionId,
    constructId: route.constructId,
    sourceId: route.sourceId,
    sourceDomain: Object.freeze({ ...route.sourceDomain }),
    inputSpeedMps: speedMps,
    referenceSpeedMps: route.referenceSpeedMps,
    index,
    evidenceTier,
    interpolationRule: route.interpolationRule,
    usedConditions: Object.freeze(["speed"]),
    ignoredConditions: Object.freeze(["surface", "estimated_steps"]),
    outputStatus,
    comparabilityNote: route.comparabilityNote,
  });
}

function noOutput(route, speedMps, reason) {
  return Object.freeze({
    gaitId: route.gaitId,
    regionId: route.regionId,
    constructId: route.constructId,
    sourceId: route.sourceId,
    sourceDomain: Object.freeze({ ...route.sourceDomain }),
    inputSpeedMps: speedMps,
    referenceSpeedMps: route.referenceSpeedMps,
    index: null,
    evidenceTier: "NO_OUTPUT",
    interpolationRule: route.interpolationRule,
    usedConditions: Object.freeze([]),
    ignoredConditions: Object.freeze(["surface", "estimated_steps"]),
    outputStatus: "NO_OUTPUT",
    reason,
    comparabilityNote: route.comparabilityNote,
  });
}

const JIN_WALK_SPEEDS = [0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0];
const JIN_WALK_HIP_POS = freezeAnchors(JIN_WALK_SPEEDS.map((x, i) => [x, [0.09, 0.13, 0.09, 0.12, 0.13, 0.16, 0.18][i]]));
const JIN_WALK_HIP_NEG = freezeAnchors(JIN_WALK_SPEEDS.map((x, i) => [x, [0.07, 0.11, 0.23, 0.13, 0.32, 0.36, 0.22][i]]));
const JIN_WALK_ANKLE_POS = freezeAnchors(JIN_WALK_SPEEDS.map((x, i) => [x, [0.13, 0.18, 0.18, 0.25, 0.27, 0.31, 0.34][i]]));
const JIN_WALK_ANKLE_NEG = freezeAnchors(JIN_WALK_SPEEDS.map((x, i) => [x, [0.24, 0.22, 0.16, 0.18, 0.13, 0.13, 0.11][i]]));

const HOF_WALK = Object.freeze({
  R02: freezeAnchors([[0.75, 47.9960729339], [1.00, 55.0916494571], [1.25, 70.9027849534], [1.50, 100], [1.75, 124.1513073162]]),
  R03: freezeAnchors([[0.75, 44.6849610517], [1.00, 59.5101402613], [1.25, 85.8371181631], [1.50, 100], [1.75, 127.1766295674]]),
  R04: freezeAnchors([[0.75, 61.6286250837], [1.00, 72.4556287557], [1.25, 81.3616973433], [1.50, 100], [1.75, 132.7496793894]]),
  R07: freezeAnchors([[0.75, 68.4442584842], [1.00, 77.4374408089], [1.25, 80.8581185135], [1.50, 100], [1.75, 118.5832430080]]),
});

const WARD_WALK_PFJ = freezeAnchors([[85 / 60, 2.37], [2.0, 3.12]]);
const KEULER_WALK_AT = freezeAnchors([[1.0, 40.7], [1.25, 43.0], [1.5, 44.9], [1.75, 46.8], [2.0, 47.9]]);
const LEYH_REARFOOT = freezeAnchors([[0.79, 23.7], [1.25, 22.4], [1.86, 23.9]]);
const LEYH_MIDFOOT = freezeAnchors([[0.79, 3.6], [1.25, 3.3], [1.86, 2.2]]);
const LEYH_FOREFOOT = freezeAnchors([[0.79, 21.5], [1.25, 23.6], [1.86, 23.0]]);

const JIN_RUN_SPEEDS = [1.8, 2.2, 2.6, 3.0, 3.4, 3.8];
const JIN_RUN_HIP_POS = freezeAnchors(JIN_RUN_SPEEDS.map((x, i) => [x, [0.04, 0.05, 0.13, 0.14, 0.21, 0.21][i]]));
const JIN_RUN_HIP_NEG = freezeAnchors(JIN_RUN_SPEEDS.map((x, i) => [x, [0.11, 0.12, 0.13, 0.18, 0.20, 0.22][i]]));
const JIN_RUN_ANKLE_POS = freezeAnchors(JIN_RUN_SPEEDS.map((x, i) => [x, [0.46, 0.51, 0.46, 0.50, 0.52, 0.70][i]]));
const JIN_RUN_ANKLE_NEG = freezeAnchors(JIN_RUN_SPEEDS.map((x, i) => [x, [0.30, 0.31, 0.31, 0.35, 0.33, 0.44][i]]));

const HAMNER_AUC = Object.freeze({
  R02: Object.freeze({ muscles: Object.freeze([
    freezeAnchors([[2.0, 0.1140], [3.0, 0.1529], [4.0, 0.1710]]),
    freezeAnchors([[2.0, 0.1278], [3.0, 0.1057], [4.0, 0.1984]]),
  ]) }),
  R03: Object.freeze({ muscles: Object.freeze([
    freezeAnchors([[2.0, 0.1127], [3.0, 0.1173], [4.0, 0.1443]]),
    freezeAnchors([[2.0, 0.1118], [3.0, 0.1247], [4.0, 0.1490]]),
    freezeAnchors([[2.0, 0.0932], [3.0, 0.1192], [4.0, 0.1895]]),
  ]) }),
  R04: Object.freeze({ muscles: Object.freeze([freezeAnchors([[2.0, 0.1377], [3.0, 0.1833], [4.0, 0.2231]])]) }),
  R07: Object.freeze({ muscles: Object.freeze([
    freezeAnchors([[2.0, 0.1543], [3.0, 0.1416], [4.0, 0.1669]]),
    freezeAnchors([[2.0, 0.1707], [3.0, 0.1596], [4.0, 0.2012]]),
    freezeAnchors([[2.0, 0.1391], [3.0, 0.1441], [4.0, 0.1855]]),
  ]) }),
});

const HO2021_PFJ = freezeAnchors([[2.1, 10.9], [2.5, 12.3], [3.0, 12.6]]);
const ARAMPATZIS_AT_FORCE = freezeAnchors([[2.0, 2471], [2.5, 2441], [3.5, 2690]]);
const HO2010_HEEL = freezeAnchors([[1.5, 143.6], [2.0, 170.7], [2.5, 191.3]]);
const HO2010_MM = freezeAnchors([[1.5, 154.1], [2.0, 172.9], [2.5, 178.2]]);
const HO2010_LM = freezeAnchors([[1.5, 130.3], [2.0, 149.5], [2.5, 162.3]]);
const HO2010_MF = freezeAnchors([[1.5, 339.8], [2.0, 360.7], [2.5, 377.8]]);
const HO2010_CF = freezeAnchors([[1.5, 223.8], [2.0, 244.5], [2.5, 266.5]]);
const HO2010_LF = freezeAnchors([[1.5, 172.7], [2.0, 189.0], [2.5, 203.9]]);

const ROUTES = Object.freeze({
  WALK: Object.freeze({
    R01: Object.freeze({ gaitId: "WALK", regionId: "R01", constructId: "WALK_HIP_WORK_JIN", sourceId: "JIN_2018_UO", sourceDomain: { minMps: 0.8, maxMps: 2.0 }, referenceSpeedMps: 1.5, interpolationRule: "positive/negative stance work separately interpolated, normalized, then 50:50", comparabilityNote: "Walking-specific hip work route." }),
    R02: Object.freeze({ gaitId: "WALK", regionId: "R02", constructId: "WALK_EMG_GLUTEAL_HOF", sourceId: "HOF_2002_CGA", sourceDomain: { minMps: 0.75, maxMps: 1.75 }, referenceSpeedMps: 1.5, interpolationRule: "CGA profile integration anchors + adjacent interpolation", comparabilityNote: "Walking EMG construct; not interchangeable with Current running EMG." }),
    R03: Object.freeze({ gaitId: "WALK", regionId: "R03", constructId: "WALK_EMG_ANTERIOR_THIGH_HOF", sourceId: "HOF_2002_CGA", sourceDomain: { minMps: 0.75, maxMps: 1.75 }, referenceSpeedMps: 1.5, interpolationRule: "CGA profile integration anchors + adjacent interpolation", comparabilityNote: "Walking EMG construct." }),
    R04: Object.freeze({ gaitId: "WALK", regionId: "R04", constructId: "WALK_EMG_POSTERIOR_THIGH_HOF", sourceId: "HOF_2002_CGA", sourceDomain: { minMps: 0.75, maxMps: 1.75 }, referenceSpeedMps: 1.5, interpolationRule: "CGA profile integration anchors + adjacent interpolation", comparabilityNote: "Walking EMG construct." }),
    R05: Object.freeze({ gaitId: "WALK", regionId: "R05", constructId: "WALK_PFJ_PEAK_STRESS", sourceId: "WARD_2004", sourceDomain: { minMps: 85 / 60, maxMps: 2.0 }, referenceSpeedMps: 1.5, interpolationRule: "bounded linear interpolation between normal/fast control anchors", comparabilityNote: "Peak PFJ stress; distinct from Current running stress-impulse route." }),
    R06: Object.freeze({ gaitId: "WALK", regionId: "R06", constructId: "WALK_PROX_TIBIAL_PEAK_ACCEL", sourceId: "VOLOSHIN_2000", sourceDomain: { minMps: 0.894, maxMps: 1.788 }, referenceSpeedMps: 1.5, interpolationRule: "source-authored regression A=3.82V-1.199", comparabilityNote: "Tibial acceleration; distinct from Current tibial stress-impulse route." }),
    R07: Object.freeze({ gaitId: "WALK", regionId: "R07", constructId: "WALK_EMG_POSTERIOR_SHANK_HOF", sourceId: "HOF_2002_CGA", sourceDomain: { minMps: 0.75, maxMps: 1.75 }, referenceSpeedMps: 1.5, interpolationRule: "CGA profile integration anchors + adjacent interpolation", comparabilityNote: "Walking EMG construct." }),
    R08: Object.freeze({ gaitId: "WALK", regionId: "R08", constructId: "WALK_ANKLE_WORK_JIN", sourceId: "JIN_2018_UO", sourceDomain: { minMps: 0.8, maxMps: 2.0 }, referenceSpeedMps: 1.5, interpolationRule: "positive/negative stance work separately interpolated, normalized, then 50:50", comparabilityNote: "Walking-specific ankle work route." }),
    R09: Object.freeze({ gaitId: "WALK", regionId: "R09", constructId: "WALK_AT_PEAK_STRESS_KEULER", sourceId: "KEULER_2019", sourceDomain: { minMps: 1.0, maxMps: 2.0 }, referenceSpeedMps: 1.5, interpolationRule: "adjacent source-anchor interpolation", comparabilityNote: "Peak Achilles tendon stress; distinct from Current strain-impulse route." }),
    R10: Object.freeze({ gaitId: "WALK", regionId: "R10", constructId: "WALK_REARFOOT_RELATIVE_PEAK_PRESSURE_LEYH", sourceId: "LEYH_2022", sourceDomain: { minMps: 0.79, maxMps: 1.86 }, referenceSpeedMps: 1.5, interpolationRule: "category-mean-speed interpolation", comparabilityNote: "Relative peak pressure; Koo slope route remains separate." }),
    R11: Object.freeze({ gaitId: "WALK", regionId: "R11", constructId: "WALK_MIDFOOT_RELATIVE_PEAK_PRESSURE_LEYH", sourceId: "LEYH_2022", sourceDomain: { minMps: 0.79, maxMps: 1.86 }, referenceSpeedMps: 1.5, interpolationRule: "category-mean-speed interpolation", comparabilityNote: "Relative peak pressure; distinct mask/construct from Current running composite." }),
    R12: Object.freeze({ gaitId: "WALK", regionId: "R12", constructId: "WALK_FOREFOOT_RELATIVE_PEAK_PRESSURE_LEYH", sourceId: "LEYH_2022", sourceDomain: { minMps: 0.79, maxMps: 1.86 }, referenceSpeedMps: 1.5, interpolationRule: "category-mean-speed interpolation", comparabilityNote: "Relative peak pressure; distinct mask/construct from Current running composite." }),
  }),
  JOGGING: Object.freeze({
    R01: Object.freeze({ gaitId: "JOGGING", regionId: "R01", constructId: "JOG_HIP_STANCE_WORK_JIN", sourceId: "JIN_2018_UO", sourceDomain: { minMps: 1.8, maxMps: 3.8 }, referenceSpeedMps: 2.5, interpolationRule: "positive/negative stance work separately interpolated, normalized, then 50:50", comparabilityNote: "Low-speed running branch; Current RUNNING remains independent." }),
    R02: Object.freeze({ gaitId: "JOGGING", regionId: "R02", constructId: "JOG_GLUTEAL_EMG_HAMNER", sourceId: "HAMNER_DELP_2013", sourceDomain: { minMps: 2.0, maxMps: 4.0 }, referenceSpeedMps: 2.5, interpolationRule: "digitized original supplemental figure AUC; muscle components normalized separately", comparabilityNote: "Mobile-specific low-speed running EMG construct." }),
    R03: Object.freeze({ gaitId: "JOGGING", regionId: "R03", constructId: "JOG_ANTERIOR_THIGH_EMG_HAMNER", sourceId: "HAMNER_DELP_2013", sourceDomain: { minMps: 2.0, maxMps: 4.0 }, referenceSpeedMps: 2.5, interpolationRule: "digitized original supplemental figure AUC; muscle components normalized separately", comparabilityNote: "Mobile-specific low-speed running EMG construct." }),
    R04: Object.freeze({ gaitId: "JOGGING", regionId: "R04", constructId: "JOG_BF_LONG_HEAD_EMG_HAMNER", sourceId: "HAMNER_DELP_2013", sourceDomain: { minMps: 2.0, maxMps: 4.0 }, referenceSpeedMps: 2.5, interpolationRule: "digitized original supplemental figure AUC", comparabilityNote: "BF long-head only; distinct from Current posterior-thigh group." }),
    R05: Object.freeze({ gaitId: "JOGGING", regionId: "R05", constructId: "JOG_PFJ_PEAK_STRESS_HO2021", sourceId: "HO_2021", sourceDomain: { minMps: 2.1, maxMps: 3.0 }, referenceSpeedMps: 2.5, interpolationRule: "adjacent pain-free group condition-mean interpolation", comparabilityNote: "Small pain-free subgroup; peak PFJ stress, not Current stress impulse." }),
    R06: Object.freeze({ gaitId: "JOGGING", regionId: "R06", constructId: "JOG_TIBIAL_TORSIONAL_MOMENT_KAWAMOTO", sourceId: "KAWAMOTO_2002", sourceDomain: { minMps: 2.0, maxMps: 5.0 }, referenceSpeedMps: 2.5, interpolationRule: "source-authored regression y=0.343+0.253v", comparabilityNote: "Tibial torsional moment; distinct from Current tibial stress impulse." }),
    R07: Object.freeze({ gaitId: "JOGGING", regionId: "R07", constructId: "JOG_POSTERIOR_SHANK_EMG_HAMNER", sourceId: "HAMNER_DELP_2013", sourceDomain: { minMps: 2.0, maxMps: 4.0 }, referenceSpeedMps: 2.5, interpolationRule: "digitized original supplemental figure AUC; muscle components normalized separately", comparabilityNote: "Mobile-specific low-speed running EMG construct." }),
    R08: Object.freeze({ gaitId: "JOGGING", regionId: "R08", constructId: "JOG_ANKLE_STANCE_WORK_JIN", sourceId: "JIN_2018_UO", sourceDomain: { minMps: 1.8, maxMps: 3.8 }, referenceSpeedMps: 2.5, interpolationRule: "positive/negative stance work separately interpolated, normalized, then 50:50", comparabilityNote: "Low-speed running branch; Current RUNNING remains independent." }),
    R09: Object.freeze({ gaitId: "JOGGING", regionId: "R09", constructId: "JOG_AT_MAX_FORCE_ARAMPATZIS", sourceId: "ARAMPATZIS_2023", sourceDomain: { minMps: 2.0, maxMps: 3.5 }, referenceSpeedMps: 2.5, interpolationRule: "adjacent source-anchor interpolation", comparabilityNote: "Maximum Achilles tendon force; distinct from Current strain impulse." }),
    R10: Object.freeze({ gaitId: "JOGGING", regionId: "R10", constructId: "JOG_HEEL_PEAK_PRESSURE_HO2010", sourceId: "HO_2010", sourceDomain: { minMps: 1.5, maxMps: 2.5 }, referenceSpeedMps: 2.5, interpolationRule: "source table interpolation", comparabilityNote: "Same Ho 2010 source family already controlled by Current; kept in separate JOG branch." }),
    R11: Object.freeze({ gaitId: "JOGGING", regionId: "R11", constructId: "JOG_MIDFOOT_PEAK_PRESSURE_HO2010", sourceId: "HO_2010", sourceDomain: { minMps: 1.5, maxMps: 2.5 }, referenceSpeedMps: 2.5, interpolationRule: "MM/LM normalize separately then 50:50", comparabilityNote: "Region composite is project-defined from source components." }),
    R12: Object.freeze({ gaitId: "JOGGING", regionId: "R12", constructId: "JOG_FOREFOOT_PEAK_PRESSURE_HO2010", sourceId: "HO_2010", sourceDomain: { minMps: 1.5, maxMps: 2.5 }, referenceSpeedMps: 2.5, interpolationRule: "MF/CF/LF normalize separately then equal average", comparabilityNote: "Region composite is project-defined from source components." }),
  }),
});

export function getMobileWalkJogRoute(gaitId, regionId) {
  return ROUTES[gaitId]?.[regionId] ?? null;
}

function evaluateDirect(route, speedMps) {
  switch (`${route.gaitId}:${route.regionId}`) {
    case "WALK:R01":
      return polarityComposite({ speedMps, positive: JIN_WALK_HIP_POS, negative: JIN_WALK_HIP_NEG, referenceSpeedMps: 1.5 });
    case "WALK:R02":
    case "WALK:R03":
    case "WALK:R04":
    case "WALK:R07":
      return interpolate(speedMps, HOF_WALK[route.regionId]);
    case "WALK:R05": {
      const raw = interpolate(speedMps, WARD_WALK_PFJ);
      return raw == null ? null : normalizeToReference(raw, interpolate(1.5, WARD_WALK_PFJ));
    }
    case "WALK:R06": {
      if (speedMps < 0.894 - EPS || speedMps > 1.788 + EPS) return null;
      return normalizeToReference(3.82 * speedMps - 1.199, 3.82 * 1.5 - 1.199);
    }
    case "WALK:R08":
      return polarityComposite({ speedMps, positive: JIN_WALK_ANKLE_POS, negative: JIN_WALK_ANKLE_NEG, referenceSpeedMps: 1.5 });
    case "WALK:R09": {
      const raw = interpolate(speedMps, KEULER_WALK_AT);
      return raw == null ? null : normalizeToReference(raw, interpolate(1.5, KEULER_WALK_AT));
    }
    case "WALK:R10": {
      const raw = interpolate(speedMps, LEYH_REARFOOT);
      return raw == null ? null : normalizeToReference(raw, interpolate(1.5, LEYH_REARFOOT));
    }
    case "WALK:R11": {
      const raw = interpolate(speedMps, LEYH_MIDFOOT);
      return raw == null ? null : normalizeToReference(raw, interpolate(1.5, LEYH_MIDFOOT));
    }
    case "WALK:R12": {
      const raw = interpolate(speedMps, LEYH_FOREFOOT);
      return raw == null ? null : normalizeToReference(raw, interpolate(1.5, LEYH_FOREFOOT));
    }

    case "JOGGING:R01":
      return polarityComposite({ speedMps, positive: JIN_RUN_HIP_POS, negative: JIN_RUN_HIP_NEG, referenceSpeedMps: 2.5 });
    case "JOGGING:R02":
    case "JOGGING:R03":
    case "JOGGING:R04":
    case "JOGGING:R07":
      return componentComposite({ speedMps, components: HAMNER_AUC[route.regionId].muscles, referenceSpeedMps: 2.5 });
    case "JOGGING:R05": {
      const raw = interpolate(speedMps, HO2021_PFJ);
      return raw == null ? null : normalizeToReference(raw, interpolate(2.5, HO2021_PFJ));
    }
    case "JOGGING:R06":
      if (speedMps < 2.0 - EPS || speedMps > 5.0 + EPS) return null;
      return normalizeToReference(0.343 + 0.253 * speedMps, 0.343 + 0.253 * 2.5);
    case "JOGGING:R08":
      return polarityComposite({ speedMps, positive: JIN_RUN_ANKLE_POS, negative: JIN_RUN_ANKLE_NEG, referenceSpeedMps: 2.5 });
    case "JOGGING:R09": {
      const raw = interpolate(speedMps, ARAMPATZIS_AT_FORCE);
      return raw == null ? null : normalizeToReference(raw, interpolate(2.5, ARAMPATZIS_AT_FORCE));
    }
    case "JOGGING:R10": {
      const raw = interpolate(speedMps, HO2010_HEEL);
      return raw == null ? null : normalizeToReference(raw, 191.3);
    }
    case "JOGGING:R11":
      return componentComposite({ speedMps, components: [HO2010_MM, HO2010_LM], referenceSpeedMps: 2.5 });
    case "JOGGING:R12":
      return componentComposite({ speedMps, components: [HO2010_MF, HO2010_CF, HO2010_LF], referenceSpeedMps: 2.5 });
    default:
      return null;
  }
}

function evaluateProvisional(route, speedMps) {
  if (route.gaitId === "JOGGING" && route.regionId === "R05" && speedMps >= 2.0 - EPS && speedMps < 2.1 - EPS) {
    const raw = interpolate(speedMps, HO2021_PFJ, { allowExtrapolateLow: true });
    return raw == null ? null : normalizeToReference(raw, interpolate(2.5, HO2021_PFJ));
  }

  if (route.gaitId !== "WALK" || speedMps <= 1.75 + EPS || speedMps > 2.0 + EPS) return null;

  switch (route.regionId) {
    case "R02":
    case "R03":
    case "R04":
    case "R07":
      return interpolate(speedMps, HOF_WALK[route.regionId], { allowExtrapolateHigh: true });
    case "R06":
      return normalizeToReference(3.82 * speedMps - 1.199, 3.82 * 1.5 - 1.199);
    case "R10": {
      const raw = interpolate(speedMps, LEYH_REARFOOT, { allowExtrapolateHigh: true });
      return normalizeToReference(raw, interpolate(1.5, LEYH_REARFOOT));
    }
    case "R11": {
      const raw = interpolate(speedMps, LEYH_MIDFOOT, { allowExtrapolateHigh: true });
      return normalizeToReference(raw, interpolate(1.5, LEYH_MIDFOOT));
    }
    case "R12": {
      const raw = interpolate(speedMps, LEYH_FOREFOOT, { allowExtrapolateHigh: true });
      return normalizeToReference(raw, interpolate(1.5, LEYH_FOREFOOT));
    }
    default:
      return evaluateDirect(route, speedMps);
  }
}

function evidenceTier(route, speedMps) {
  if (route.sourceId === "VOLOSHIN_2000" || route.sourceId === "KAWAMOTO_2002") {
    return "SOURCE_AUTHORED_MODEL";
  }
  if (route.sourceId === "HAMNER_DELP_2013") {
    return exactAnchor(speedMps, freezeAnchors([[2, 0], [3, 0], [4, 0]]))
      ? "DIGITIZED_ORIGINAL_FIGURE"
      : "WITHIN_SOURCE_INTERPOLATION";
  }
  return "WITHIN_SOURCE_INTERPOLATION";
}

export function evaluateMobileWalkJogRegion({ gaitId, regionId, speedMps, allowProvisional = false } = {}) {
  const route = getMobileWalkJogRoute(gaitId, regionId);
  const speed = finiteNumber(speedMps);
  if (!route) return null;
  if (speed == null || speed <= 0) return noOutput(route, speed, "INVALID_SPEED");

  const direct = evaluateDirect(route, speed);
  if (direct != null) {
    return routeResult(route, speed, direct, evidenceTier(route, speed));
  }

  if (allowProvisional) {
    const provisional = evaluateProvisional(route, speed);
    if (provisional != null) {
      return routeResult(route, speed, provisional, "P1_PROVISIONAL_BOUNDED_EXTENSION", "PROVISIONAL");
    }
  }
  return noOutput(route, speed, "OUTSIDE_AUTHORIZED_ROUTE");
}

export function evaluateMobileWalkJogAllRegions({ gaitId, speedMps, allowProvisional = false } = {}) {
  if (!ROUTES[gaitId]) return Object.freeze([]);
  return Object.freeze(
    REGION_IDS.map((regionId) => evaluateMobileWalkJogRegion({ gaitId, regionId, speedMps, allowProvisional })),
  );
}

export function hasStrictAll12Coverage(gaitId, speedMps) {
  const speed = finiteNumber(speedMps);
  const band = STRICT_ALL12_BANDS[gaitId];
  return Boolean(band && speed != null && speed >= band.minMps - EPS && speed <= band.maxMps + EPS);
}

export function summarizeMobileWalkJogCoverage({ gaitId, speedMps, allowProvisional = false } = {}) {
  const regions = evaluateMobileWalkJogAllRegions({ gaitId, speedMps, allowProvisional });
  const available = regions.filter((result) => result?.index != null);
  return Object.freeze({
    gaitId,
    inputSpeedMps: finiteNumber(speedMps),
    strictAll12: hasStrictAll12Coverage(gaitId, speedMps),
    availableRegionCount: available.length,
    all12Available: available.length === 12,
    provisionalRegionCount: available.filter((result) => result.evidenceTier === "P1_PROVISIONAL_BOUNDED_EXTENSION").length,
    regions,
  });
}
