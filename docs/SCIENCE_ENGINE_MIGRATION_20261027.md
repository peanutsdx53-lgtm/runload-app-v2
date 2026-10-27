# 計算エンジン移植・同一計算検証（2026-10-27）

## 正本と移植方針

- 正本：`peanutsdx53-lgtm/runload-app`、移植時 `main` SHA `23ca1f87a62f4d6356337a18e2738fadd034968a`。
- 対象：旧製品で利用されるランニング文献Reference-100 v4.0（`core/runningEvidence/` 3ファイル）と、旧スマホ向けジョギング・ウォーキングReference-100 v1.3（`core/internal/mobileWalkJogSpeedModel.js`）。
- 上記 **4ファイルはGit blob SHAまで完全一致**させ、係数・補間範囲・参照文献・計算式を編集していない。`tests/scienceEngineParity.test.mjs` がバイト比較を実行する。
- `core/activity/running.js`、`jogging.js`、`walking.js` は活動別の薄いアダプター。切替は `core/activity/activityReference.js` に集約。基幹計算は各旧モデルを呼ぶだけで、活動別モデルの共通化や係数修正はしない。

## 入力・計算・出力の連鎖

1. 手入力の走行日、距離、時間を入力。走り方画面の「活動種別」でランニング／ジョギング／ウォーキングを**明示的に選択**する。未選択の記録も従来どおり保存できるが、科学値は表示しない。
2. `ui/manualRunStore.js` が入力を検証し、既存の `runload-v2-manual-runs-v1` に保存。活動種別は任意のドラフト項目 `activityGait` として保持する。既存保存キー、ID、versionは変えず、過去の未選択記録を勝手に分類しない。
3. 結果画面で**保存済みの実記録**（ID、活動種別、距離、時間）を `calculateActivityReference` に渡し、活動ごとに元のモデルを呼ぶ。
4. 根拠と速度適用範囲が成立した部位だけ Reference-100 の数値を表示。未選択・走歩混在・根拠範囲外では数値を生成しない。
5. 12部位ごとの参考値の基準は**各部位自身の基準100**。部位間の負荷大小比較、傷害リスク、本人の組織負荷の測定値として用いない。ランニングモデルと歩行/ジョギングモデルの値を直接比較しない。
6. 今回は研究結果の**参照計算の表示**であり、比較値の独立保存・旧スキーマへの直接合算・GPSの距離からの自動科学値生成は行わない。原記録の入力値とソースを保全する。

## 同一計算の根拠

| 元モジュール | 固定Git Blob SHA |
|---|---|
| `runningEvidenceRegistry.js` | `796b97b711b58df0e7958c95e53d906f833814cc` |
| `runningEvidenceEngine.js` | `23f9237da5f041939288f490fc3e04e2e89357cd` |
| `runningEvidenceProductBridge.js` | `18c0ee4204c74da3c0ccc108f04c16a57c32eff1` |
| `mobileWalkJogSpeedModel.js` | `107d60abfd8535531d3d896f7539666c3840ea34` |

バイト一致の独立チェックに加え、`tests/scienceEngineParity.test.mjs` でランニング12部位の元モデルの参照値・適用経路・証拠参照IDを同一入力で比較。ジョギング・ウォーキングも旧v1.3の12部位すべての `index` と evidenceTierを比較。保存→再読込→計算出力の一貫性を検証する。

## 適用範囲と未承認事項

卒論の正式対象はランニングCurrentのみ。ジョギング・ウォーキングは実験的拡張、混合エンジンは独立研究候補です。運用境界は [RESEARCH_AND_MIXED_SCOPE_20261027.md](./RESEARCH_AND_MIXED_SCOPE_20261027.md) に固定します。


- `RUN_WALK` は走歩混在。各活動への適切な速度/時間の分解と科学的統合が承認されていないので数値化しない。
- 旧モデルの定義域外の速度で無理な外挿をしない。ウォーキング／ジョギングの `allowProvisional` は `false` 固定。
- GPS測定・保存は別系統のまま。移植した科学エンジンはGPSの計測値を自動的には評価しない。
- ROF-J、保存された既存走行、科学エンジンの原著数値を無断変更しない。
- CIではブラウザの結果画面で入力→保存→部位表示・再読込を確認。科学的妥当性そのものを新たに検証したわけではない。
