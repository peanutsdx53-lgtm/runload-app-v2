// Isolated, not yet routed into v3.1 records, UI or persistence.
// Data transcription only: Current/18 (65 independent original values) and Current/13 (Gazendam coefficients).
// A2 anchors are independent formula examples, not published table observations.
// No E extension is approved; the registry does not accept external approval flags.
export const SCIENCE_REGISTRY_VERSION = 'runload-running-evidence-a1a2b-candidate-20261019';
export const RESEARCH_EXPECTATION_SHA256 = Object.freeze({
  current18:'93e275b1581b8170ca28e760407d5973435086e242ccf02681b063c835bd2a30',
  current19:'1b131c85e60a9f4d893930587478ce92fd72b3a059e1a4adbd164287f188c025',
  current13:'1d33ab93c2c2fc0248ec27d29694ad0a31b8818fc32337c4db225c58e18163b9'
});
export const APPROVED_E_EXTENSIONS = Object.freeze([]);
const series = [
  {
    "regionId": "R01",
    "label": "股関節",
    "metricDescription": "関節の正の仕事（原著の集団平均）",
    "unit": "J/kg",
    "sourceFile": "Fukuchi_2017_PeerJ_e3298.pdf",
    "sourceSha256": "08a036802d617e51a030c7d0e8e76dd177bc6e8deb914f0de017b91b20e73075",
    "sourceLocation": "PDF17 Table 4",
    "activity": "RUNNING_PRIMARY",
    "routePolicy": "A1_B",
    "reference": {
      "speedMps": 2.5,
      "raw": 0.8
    },
    "anchors": [
      {
        "speedMps": 2.5,
        "raw": 0.8
      },
      {
        "speedMps": 3.5,
        "raw": 1.49
      },
      {
        "speedMps": 4.5,
        "raw": 2.43
      }
    ],
    "conditionScope": "PUBLISHED_PROTOCOL_REFERENCE_ONLY",
    "approvedSpeedMps": [
      2.5,
      4.5
    ],
    "metricId": "FUKUCHI_HIP_POSITIVE_WORK_JKG",
    "seriesId": "FUKUCHI_HIP_POSITIVE_WORK_JKG_CURRENT_20261017",
    "referenceSignature": "FUKUCHI_HIP_POSITIVE_WORK_JKG_CURRENT_20261017|2.5|0.8|J/kg",
    "evidenceApproval": "APPROVED_RESEARCH_CURRENT_SPECIFICATION"
  },
  {
    "regionId": "R02",
    "label": "臀部",
    "metricDescription": "大殿筋のFF6係数（筋全体の活動ではない）",
    "unit": "無次元係数",
    "sourceFile": "Gazendam_Hof_2007_GaitPosture_EMG_Speed.pdf",
    "sourceSha256": "22a3845f1474aaaa350cf557830d97df9e3090063b74ef1828bf854ee2c6ebbd",
    "sourceLocation": "PDF5 Table 3, Eq(2)(4)",
    "activity": "RUNNING_PRIMARY",
    "routePolicy": "A2",
    "reference": {
      "speedMps": 3.0,
      "raw": 0.0895266
    },
    "anchors": [
      {
        "speedMps": 2.5,
        "raw": 0.0746055
      },
      {
        "speedMps": 3.0,
        "raw": 0.0895266
      },
      {
        "speedMps": 3.5,
        "raw": 0.1044477
      },
      {
        "speedMps": 4.0,
        "raw": 0.1193688
      },
      {
        "speedMps": 4.5,
        "raw": 0.1342899
      }
    ],
    "conditionScope": "PUBLISHED_PROTOCOL_REFERENCE_ONLY",
    "equation": {
      "type": "GAZENDAM_FF_POLYNOMIAL",
      "muscleCode": "GX",
      "ffComponent": 6,
      "D0": 0.0,
      "D1": 0.093,
      "D2": 0.0,
      "legLengthM": 0.99,
      "gravityMps2": 9.81
    },
    "approvedSpeedMps": [
      2.5,
      4.5
    ],
    "metricId": "GAZ_GX_FF6",
    "seriesId": "GAZ_GX_FF6_CURRENT_20261017",
    "referenceSignature": "GAZ_GX_FF6_CURRENT_20261017|3|0.0895266|無次元係数",
    "evidenceApproval": "APPROVED_RESEARCH_CURRENT_SPECIFICATION"
  },
  {
    "regionId": "R03",
    "label": "大腿前面",
    "metricDescription": "外側広筋のFF2係数（筋全体の活動ではない）",
    "unit": "無次元係数",
    "sourceFile": "Gazendam_Hof_2007_GaitPosture_EMG_Speed.pdf",
    "sourceSha256": "22a3845f1474aaaa350cf557830d97df9e3090063b74ef1828bf854ee2c6ebbd",
    "sourceLocation": "PDF5 Table 3, Eq(2)(4)",
    "activity": "RUNNING_PRIMARY",
    "routePolicy": "A2",
    "reference": {
      "speedMps": 3.0,
      "raw": 0.62365078
    },
    "anchors": [
      {
        "speedMps": 2.5,
        "raw": 0.59637565
      },
      {
        "speedMps": 3.0,
        "raw": 0.62365078
      },
      {
        "speedMps": 3.5,
        "raw": 0.65092591
      },
      {
        "speedMps": 4.0,
        "raw": 0.67820104
      },
      {
        "speedMps": 4.5,
        "raw": 0.70547617
      }
    ],
    "conditionScope": "PUBLISHED_PROTOCOL_REFERENCE_ONLY",
    "equation": {
      "type": "GAZENDAM_FF_POLYNOMIAL",
      "muscleCode": "VL",
      "ffComponent": 2,
      "D0": 0.46,
      "D1": 0.17,
      "D2": 0.0,
      "legLengthM": 0.99,
      "gravityMps2": 9.81
    },
    "approvedSpeedMps": [
      2.5,
      4.5
    ],
    "metricId": "GAZ_VL_FF2",
    "seriesId": "GAZ_VL_FF2_CURRENT_20261017",
    "referenceSignature": "GAZ_VL_FF2_CURRENT_20261017|3|0.62365078|無次元係数",
    "evidenceApproval": "APPROVED_RESEARCH_CURRENT_SPECIFICATION"
  },
  {
    "regionId": "R04",
    "label": "大腿後面",
    "metricDescription": "半腱様筋のFF4係数（筋全体の活動ではない）",
    "unit": "無次元係数",
    "sourceFile": "Gazendam_Hof_2007_GaitPosture_EMG_Speed.pdf",
    "sourceSha256": "22a3845f1474aaaa350cf557830d97df9e3090063b74ef1828bf854ee2c6ebbd",
    "sourceLocation": "PDF5 Table 3, Eq(2)(4)",
    "activity": "RUNNING_PRIMARY",
    "routePolicy": "A2",
    "reference": {
      "speedMps": 3.0,
      "raw": 0.7594584
    },
    "anchors": [
      {
        "speedMps": 2.5,
        "raw": 0.67121533
      },
      {
        "speedMps": 3.0,
        "raw": 0.7594584
      },
      {
        "speedMps": 3.5,
        "raw": 0.84770147
      },
      {
        "speedMps": 4.0,
        "raw": 0.93594453
      },
      {
        "speedMps": 4.5,
        "raw": 1.0241876
      }
    ],
    "conditionScope": "PUBLISHED_PROTOCOL_REFERENCE_ONLY",
    "equation": {
      "type": "GAZENDAM_FF_POLYNOMIAL",
      "muscleCode": "ST",
      "ffComponent": 4,
      "D0": 0.23,
      "D1": 0.55,
      "D2": 0.0,
      "legLengthM": 0.99,
      "gravityMps2": 9.81
    },
    "approvedSpeedMps": [
      2.5,
      4.5
    ],
    "metricId": "GAZ_ST_FF4",
    "seriesId": "GAZ_ST_FF4_CURRENT_20261017",
    "referenceSignature": "GAZ_ST_FF4_CURRENT_20261017|3|0.7594584|無次元係数",
    "evidenceApproval": "APPROVED_RESEARCH_CURRENT_SPECIFICATION"
  },
  {
    "regionId": "R05",
    "label": "膝蓋大腿関節",
    "metricDescription": "膝蓋大腿関節の通常累積応力積（モデル推定の集団平均）",
    "unit": "MPa·s/km",
    "sourceFile": "per_step_cumulative_load_running_injury_locations_speed_gradient_cadence.pdf",
    "sourceSha256": "afaf00bc970c7723c4e440b90f948a0c7f8a8750b9ccfa0641dce1bedaa4fcd6",
    "sourceLocation": "PDF9 Table 2 speed",
    "activity": "RUNNING_PRIMARY",
    "routePolicy": "A1_B",
    "reference": {
      "speedMps": 2.78,
      "raw": 787.0
    },
    "anchors": [
      {
        "speedMps": 2.78,
        "raw": 787.0
      },
      {
        "speedMps": 3.0,
        "raw": 742.0
      },
      {
        "speedMps": 3.33,
        "raw": 697.0
      },
      {
        "speedMps": 4.0,
        "raw": 628.0
      },
      {
        "speedMps": 5.0,
        "raw": 552.0
      }
    ],
    "conditionScope": "PUBLISHED_PROTOCOL_REFERENCE_ONLY",
    "approvedSpeedMps": [
      2.78,
      5.0
    ],
    "metricId": "VAN_PFJ_ORDINARY_CUM_STRESS",
    "seriesId": "VAN_PFJ_ORDINARY_CUM_STRESS_CURRENT_20261017",
    "referenceSignature": "VAN_PFJ_ORDINARY_CUM_STRESS_CURRENT_20261017|2.78|787|MPa·s/km",
    "evidenceApproval": "APPROVED_RESEARCH_CURRENT_SPECIFICATION"
  },
  {
    "regionId": "R06",
    "label": "脛骨",
    "metricDescription": "脛骨の通常累積応力積（モデル推定の集団平均）",
    "unit": "MPa·s/km",
    "sourceFile": "per_step_cumulative_load_running_injury_locations_speed_gradient_cadence.pdf",
    "sourceSha256": "afaf00bc970c7723c4e440b90f948a0c7f8a8750b9ccfa0641dce1bedaa4fcd6",
    "sourceLocation": "PDF9 Table 2 speed",
    "activity": "RUNNING_PRIMARY",
    "routePolicy": "A1_B",
    "reference": {
      "speedMps": 2.78,
      "raw": 12424.0
    },
    "anchors": [
      {
        "speedMps": 2.78,
        "raw": 12424.0
      },
      {
        "speedMps": 3.0,
        "raw": 11624.0
      },
      {
        "speedMps": 3.33,
        "raw": 10551.0
      },
      {
        "speedMps": 4.0,
        "raw": 9362.0
      },
      {
        "speedMps": 5.0,
        "raw": 7802.0
      }
    ],
    "conditionScope": "PUBLISHED_PROTOCOL_REFERENCE_ONLY",
    "approvedSpeedMps": [
      2.78,
      5.0
    ],
    "metricId": "VAN_TIBIA_ORDINARY_CUM_STRESS",
    "seriesId": "VAN_TIBIA_ORDINARY_CUM_STRESS_CURRENT_20261017",
    "referenceSignature": "VAN_TIBIA_ORDINARY_CUM_STRESS_CURRENT_20261017|2.78|12424|MPa·s/km",
    "evidenceApproval": "APPROVED_RESEARCH_CURRENT_SPECIFICATION"
  },
  {
    "regionId": "R07",
    "label": "下腿後面",
    "metricDescription": "腓腹筋内側頭のFF1係数（筋全体の活動ではない）",
    "unit": "無次元係数",
    "sourceFile": "Gazendam_Hof_2007_GaitPosture_EMG_Speed.pdf",
    "sourceSha256": "22a3845f1474aaaa350cf557830d97df9e3090063b74ef1828bf854ee2c6ebbd",
    "sourceLocation": "PDF5 Table 3, Eq(2)(4)",
    "activity": "RUNNING_PRIMARY",
    "routePolicy": "A2",
    "reference": {
      "speedMps": 3.0,
      "raw": 0.80954246
    },
    "anchors": [
      {
        "speedMps": 2.5,
        "raw": 0.76461872
      },
      {
        "speedMps": 3.0,
        "raw": 0.80954246
      },
      {
        "speedMps": 3.5,
        "raw": 0.8544662
      },
      {
        "speedMps": 4.0,
        "raw": 0.89938994
      },
      {
        "speedMps": 4.5,
        "raw": 0.94431369
      }
    ],
    "conditionScope": "PUBLISHED_PROTOCOL_REFERENCE_ONLY",
    "equation": {
      "type": "GAZENDAM_FF_POLYNOMIAL",
      "muscleCode": "GM",
      "ffComponent": 1,
      "D0": 0.54,
      "D1": 0.28,
      "D2": 0.0,
      "legLengthM": 0.99,
      "gravityMps2": 9.81
    },
    "approvedSpeedMps": [
      2.5,
      4.5
    ],
    "metricId": "GAZ_GM_FF1",
    "seriesId": "GAZ_GM_FF1_CURRENT_20261017",
    "referenceSignature": "GAZ_GM_FF1_CURRENT_20261017|3|0.80954246|無次元係数",
    "evidenceApproval": "APPROVED_RESEARCH_CURRENT_SPECIFICATION"
  },
  {
    "regionId": "R08",
    "label": "足関節",
    "metricDescription": "関節の正の仕事（原著の集団平均）",
    "unit": "J/kg",
    "sourceFile": "Fukuchi_2017_PeerJ_e3298.pdf",
    "sourceSha256": "08a036802d617e51a030c7d0e8e76dd177bc6e8deb914f0de017b91b20e73075",
    "sourceLocation": "PDF17 Table 4",
    "activity": "RUNNING_PRIMARY",
    "routePolicy": "A1_B",
    "reference": {
      "speedMps": 2.5,
      "raw": 0.64
    },
    "anchors": [
      {
        "speedMps": 2.5,
        "raw": 0.64
      },
      {
        "speedMps": 3.5,
        "raw": 0.78
      },
      {
        "speedMps": 4.5,
        "raw": 0.95
      }
    ],
    "conditionScope": "PUBLISHED_PROTOCOL_REFERENCE_ONLY",
    "approvedSpeedMps": [
      2.5,
      4.5
    ],
    "metricId": "FUKUCHI_ANKLE_POSITIVE_WORK_JKG",
    "seriesId": "FUKUCHI_ANKLE_POSITIVE_WORK_JKG_CURRENT_20261017",
    "referenceSignature": "FUKUCHI_ANKLE_POSITIVE_WORK_JKG_CURRENT_20261017|2.5|0.64|J/kg",
    "evidenceApproval": "APPROVED_RESEARCH_CURRENT_SPECIFICATION"
  },
  {
    "regionId": "R09",
    "label": "アキレス腱",
    "metricDescription": "アキレス腱の通常累積ひずみ積（モデル推定の集団平均）",
    "unit": "%·s/km",
    "sourceFile": "per_step_cumulative_load_running_injury_locations_speed_gradient_cadence.pdf",
    "sourceSha256": "afaf00bc970c7723c4e440b90f948a0c7f8a8750b9ccfa0641dce1bedaa4fcd6",
    "sourceLocation": "PDF9 Table 2 speed",
    "activity": "RUNNING_PRIMARY",
    "routePolicy": "A1_B",
    "reference": {
      "speedMps": 2.78,
      "raw": 439.0
    },
    "anchors": [
      {
        "speedMps": 2.78,
        "raw": 439.0
      },
      {
        "speedMps": 3.0,
        "raw": 413.0
      },
      {
        "speedMps": 3.33,
        "raw": 374.0
      },
      {
        "speedMps": 4.0,
        "raw": 325.0
      },
      {
        "speedMps": 5.0,
        "raw": 266.0
      }
    ],
    "conditionScope": "PUBLISHED_PROTOCOL_REFERENCE_ONLY",
    "approvedSpeedMps": [
      2.78,
      5.0
    ],
    "metricId": "VAN_ACHILLES_ORDINARY_CUM_STRAIN",
    "seriesId": "VAN_ACHILLES_ORDINARY_CUM_STRAIN_CURRENT_20261017",
    "referenceSignature": "VAN_ACHILLES_ORDINARY_CUM_STRAIN_CURRENT_20261017|2.78|439|%·s/km",
    "evidenceApproval": "APPROVED_RESEARCH_CURRENT_SPECIFICATION"
  },
  {
    "regionId": "R10",
    "label": "後足部",
    "metricDescription": "踵区域の最大力（原著の集団平均）",
    "unit": "N",
    "sourceFile": "Li_2020_Load_Transference_Running_Speed_Plantar_Pressure.pdf",
    "sourceSha256": "22ed924787a25be6ab57f56906b5c4586b51ea063efd29d7bff256db61f831e9",
    "sourceLocation": "PDF5 Table 1",
    "activity": "RUNNING_PRIMARY",
    "routePolicy": "A1_B",
    "reference": {
      "speedMps": 2.2222222222222223,
      "raw": 322.95
    },
    "anchors": [
      {
        "speedMps": 1.3888888888888888,
        "raw": 269.53
      },
      {
        "speedMps": 1.6666666666666665,
        "raw": 314.41
      },
      {
        "speedMps": 1.9444444444444444,
        "raw": 296.76
      },
      {
        "speedMps": 2.2222222222222223,
        "raw": 322.95
      },
      {
        "speedMps": 2.5,
        "raw": 341.35
      },
      {
        "speedMps": 2.7777777777777777,
        "raw": 352.39
      },
      {
        "speedMps": 3.0555555555555554,
        "raw": 383.08
      },
      {
        "speedMps": 3.333333333333333,
        "raw": 391.47
      }
    ],
    "conditionScope": "PUBLISHED_PROTOCOL_REFERENCE_ONLY",
    "approvedSpeedMps": [
      1.3888888888888888,
      3.333333333333333
    ],
    "metricId": "LI_HEEL_MAX_FORCE",
    "seriesId": "LI_HEEL_MAX_FORCE_CURRENT_20261017",
    "referenceSignature": "LI_HEEL_MAX_FORCE_CURRENT_20261017|2.22222222222|322.95|N",
    "evidenceApproval": "APPROVED_RESEARCH_CURRENT_SPECIFICATION"
  },
  {
    "regionId": "R11",
    "label": "中足部",
    "metricDescription": "内側中足区域の最大力（原著の集団平均）",
    "unit": "N",
    "sourceFile": "Li_2020_Load_Transference_Running_Speed_Plantar_Pressure.pdf",
    "sourceSha256": "22ed924787a25be6ab57f56906b5c4586b51ea063efd29d7bff256db61f831e9",
    "sourceLocation": "PDF5 Table 1",
    "activity": "RUNNING_PRIMARY",
    "routePolicy": "A1_B",
    "reference": {
      "speedMps": 2.2222222222222223,
      "raw": 151.69
    },
    "anchors": [
      {
        "speedMps": 1.3888888888888888,
        "raw": 131.13
      },
      {
        "speedMps": 1.6666666666666665,
        "raw": 137.39
      },
      {
        "speedMps": 1.9444444444444444,
        "raw": 144.22
      },
      {
        "speedMps": 2.2222222222222223,
        "raw": 151.69
      },
      {
        "speedMps": 2.5,
        "raw": 157.79
      },
      {
        "speedMps": 2.7777777777777777,
        "raw": 159.84
      },
      {
        "speedMps": 3.0555555555555554,
        "raw": 164.88
      },
      {
        "speedMps": 3.333333333333333,
        "raw": 167.72
      }
    ],
    "conditionScope": "PUBLISHED_PROTOCOL_REFERENCE_ONLY",
    "approvedSpeedMps": [
      1.3888888888888888,
      3.333333333333333
    ],
    "metricId": "LI_MEDIAL_MIDFOOT_MAX_FORCE",
    "seriesId": "LI_MEDIAL_MIDFOOT_MAX_FORCE_CURRENT_20261017",
    "referenceSignature": "LI_MEDIAL_MIDFOOT_MAX_FORCE_CURRENT_20261017|2.22222222222|151.69|N",
    "evidenceApproval": "APPROVED_RESEARCH_CURRENT_SPECIFICATION"
  },
  {
    "regionId": "R12",
    "label": "前足部",
    "metricDescription": "中央中足骨区域の最大力（原著の集団平均）",
    "unit": "N",
    "sourceFile": "Li_2020_Load_Transference_Running_Speed_Plantar_Pressure.pdf",
    "sourceSha256": "22ed924787a25be6ab57f56906b5c4586b51ea063efd29d7bff256db61f831e9",
    "sourceLocation": "PDF5 Table 1",
    "activity": "RUNNING_PRIMARY",
    "routePolicy": "A1_B",
    "reference": {
      "speedMps": 2.2222222222222223,
      "raw": 267.06
    },
    "anchors": [
      {
        "speedMps": 1.3888888888888888,
        "raw": 220.36
      },
      {
        "speedMps": 1.6666666666666665,
        "raw": 229.83
      },
      {
        "speedMps": 1.9444444444444444,
        "raw": 253.16
      },
      {
        "speedMps": 2.2222222222222223,
        "raw": 267.06
      },
      {
        "speedMps": 2.5,
        "raw": 274.9
      },
      {
        "speedMps": 2.7777777777777777,
        "raw": 285.48
      },
      {
        "speedMps": 3.0555555555555554,
        "raw": 292.88
      },
      {
        "speedMps": 3.333333333333333,
        "raw": 301.95
      }
    ],
    "conditionScope": "PUBLISHED_PROTOCOL_REFERENCE_ONLY",
    "approvedSpeedMps": [
      1.3888888888888888,
      3.333333333333333
    ],
    "metricId": "LI_CENTRAL_METATARSAL_MAX_FORCE",
    "seriesId": "LI_CENTRAL_METATARSAL_MAX_FORCE_CURRENT_20261017",
    "referenceSignature": "LI_CENTRAL_METATARSAL_MAX_FORCE_CURRENT_20261017|2.22222222222|267.06|N",
    "evidenceApproval": "APPROVED_RESEARCH_CURRENT_SPECIFICATION"
  }
];
function deeplyFreeze(x) {
  if (x && typeof x === 'object' && !Object.isFrozen(x)) {
    for (const v of Object.values(x)) deeplyFreeze(v);
    Object.freeze(x);
  }
  return x;
}
export const RUNNING_REGION_SERIES = deeplyFreeze(series);
export const RUNNING_REGION_BY_ID = deeplyFreeze(Object.fromEntries(RUNNING_REGION_SERIES.map(x => [x.regionId,x])));
