# RunLoad v35 — GPS実走計測・走行形式移植と境界

## 対象
- 移植参照：`runload-app` の `docs/GPS_MEASUREMENT.md`, `ui/runMeasurementCore.js`, `ui/runMeasurementState.js`, `ui/mobileWalkJogMeasurementWiring.js`, `ui/runMeasurementMap.js`。
- 現行 `runload-app-v2` の研究Current、12部位科学計算、手入力保存 `runload-v2-manual-runs-v1`、コース保存 `runload-v2-course-presets-v1` を変更しない。
- 新規独立保存 `runload-v2-gps-runs-v1`。既存のGPS/GPXを自動インポートしない。GPSの記録は手動や科学モデルと混ぜない。

## 実装したGPS記録
1. HTTPSと利用者の開始操作が必要。ブラウザ標準 `navigator.geolocation.watchPosition` を使用。
2. 誤差50m超・時刻逆行・異常速度15m/s超・2m未満の変化を不採用。位置読み取りは例外を捕捉。HaversineによるGPS走行距離。
3. 一時停止・再開で `clearWatch` を実行。停止中の経過時間を除外。停止からの再開や混合活動切替の前後は距離・軌跡を接続せず、不連続点として保存。
4. 走行形式：ランニング・ジョギング・ウォーキング・走る＋歩く。自由/目標時間/目標距離。混合の場合は現在の活動を明示的に切替（速度から分類しない）。12部位と合成しない。
5. 計測終了後、10m以上の距離と1秒以上の有効時間がある場合のみ端末内に記録。正確な軌跡は利用者が明示的にチェックした場合だけ保存。チェックしなければ距離・時間などのメタデータのみ。
6. 最大2000位置点、150記録、約2.4MBの保存サイズ上限。読取り不正時に既存データを上書きしない。GPS履歴は手動履歴とは区別し、個別に削除確認。
7. 軌跡保存済みなら、シミュレーションのGPS実走履歴から地形断面の読み取りと仮のA/B到達位置比較が可能。地図上の道路・通行可否を生成しない。

## UI
- 活動形式は、単一のアクセント付き選択サーフェス。ボタンを4枚並べない。フォーム詳細は選択内容によって絞る。
- GPS位置、経過時間、平均ペース、2.5D形状・高低差の現在の事実のみ表示。
- GPS保存時の位置データに関するチェックは初期OFF。ゼロGPS・拒否・低精度・破損を区別。
- 320 / 390 / 820 / 1440幅の描画とキーボード操作の維持。

## 今回まだ移植していないもの
- 旧版の端末モーション歩数推定と出典・精度管理、エネルギー推定、ROF-J PRE/POSTの正式な時計付き記録との一体化。
- 音・振動通知、OSバックグラウンド保証（ブラウザー側の制約あり）、インターバル各区間の学術的参照値の計算。
- GPS実走を既存の科学的な手動 `run` / 結果モデルへ黙って変換しない。統合にはモデルと保存契約の独立審査が必要。

## 合格条件
- Nodeエンジンテスト・破損データ保護・ChromeブラウザーのGPS模擬APIテスト・WebKitブラウザーでの画面検査。
- iPhone / Androidの屋外実走、権限変更、長時間・画面ロック・復帰、位置・標高精度の実地確認はデスクトップ模擬テストでは代替できない。

## v36 安全性・地図パッチ（W-01/W-02）
- 測定開始と一時停止からの再開では、毎回アプリ独自の利用確認を表示する。拒否・キャンセル時には `watchPosition` を呼ばない。OSの過去の許可はセッション同意と区別する。
- OpenStreetMapへのタイル画像リクエストは、Web版でRefererを送れる設定にする。外部地図は事前取得せず、ブラウザーの通常キャッシュに任せる。
- 実地図はGPSで有効位置点を受けた後だけ表示し、地図読み込み全失敗時にもGPS計測と軌跡プレビューは続ける。
- テストはGPSの毎回同意、拒否時の無監視、ブラウザーでの画像デコード、Referer、地図失敗時のUIを検証する。屋外実測・GPS標高精度・端末バックグラウンド保証とは別の範囲である。

## W-03 GPS altitude quality and discontinuity gate
- Horizontal GPS acceptance is separate from altitude quality. Optional altitude accessors throwing do not lose valid horizontal fixes.
- Store `altitudeAccuracy` and explicit `altitudeQuality` for each accepted point. Missing/unknown/low-quality altitude and exceptional vertical spikes are stored as `ele:null`, not inferred. These thresholds are conservative display gates, NOT calibrated proof of elevation accuracy.
- Time gaps over 30 seconds create a new segment and zero added distance over the unknown path. Pauses/activity changes remain explicit gap boundaries.
- Simulation and live route diagrams use measured heights only when the altitude quality gate accepts them; unverified altitude is clearly distinguished from valid elevation.
- Existing 2,000-point memory cap, localStorage capacity, and physical iOS tracking limitations remain W-04/W-05/W-08 tasks. Existing users reported no retained GPS data; the current contract can be refreshed without historic route migration.

## W-04 GPS records in IndexedDB
- GPS records/opt-in route geometry now use IndexedDB `runload-v2-gps-measurements-v1/gpsRuns`, never localStorage.
- Store open, read and writes fail closed; corrupt data cannot be overwritten, and save/delete transactions serialize across multiple tabs.
- Browser quota still applies; 2000 GPS records is a conservative app limit pending further storage benchmarks. A separate 2000-point per-run limit remains a W-05 issue.
- The owner has no previously retained GPS records, so no historic localStorage GPS migration is added.
- Existing manual/course scientific stores retain their current localStorage contracts.

## W-05 adaptive bounded route retention (2026-10-27)
- The original v35 behavior of freezing the track after 2,000 accepted GPS fixes has been replaced. `GPS_LIMITS.maxTrack=2000` now bounds *retained in-memory points*, not lifetime fixes.
- Every accepted fix continues updating measured distance, the latest position and the route endpoint. When over budget, a deterministic in-memory reduction selects significant turns, elevation changes, segment boundaries and points spread across the full route.
- Unobserved gaps, pauses and activity changes are kept as disconnected segments even if the exact boundary point is removed. GPS distance is **not** recomputed from the simplified polyline.
- `trackSimplified` is persisted with an opted-in route; measurement, history and what-if view disclose that route geometry is sampled. The sampling is lossy and not a substitute for survey-grade full resolution. No GPS coordinates are written to IndexedDB without saving the route.
- A persisted route whose last cumulative point does not match measured distance (within rounding tolerance), or whose time/distance goes backward, is rejected to prevent the old silent truncation failure.
- Node regression covers 14,401 simulated fixes at 1 Hz, pauses, activity switches, a 35-second GPS outage, fixed-memory retention, exact final cumulative distance, and save preparation. Real iPhone/iOS background behavior remains unverified in W-08.

## W-06 GPS records backup and safe restoration
- Users can explicitly download a JSON backup of GPS run records and opted-in route coordinates. The file is **not encrypted** and should be kept private; no automatic upload/transfer is made.
- Restore first validates the exact backup format, every record and route endpoint, record count, duplicates, and a 50MB input limit. The UI shows a preview/confirmation before any IndexedDB writes.
- Restore merges only missing IDs under a single IndexedDB readwrite transaction. Identical existing IDs are skipped; conflicting content for the same ID refuses the entire restore without overwriting an existing route.
- The backup is for GPS records only. Manual-run scientific stores, other history or settings are not included and are not modified.
- The 50MB single-file restriction and origin-based browser storage eviction remain documented limitations. Browsers may still deny a download; the user must confirm the saved file exists on the device.

## W-06 continued — storage estimate, explicit persistence and origin limitations
- User-triggered storage estimate shows **whole-origin** usage/quota, never claims GPS-only allocation.
- Storage persistence is requested on explicit user action and browser refusal/absence is reported without claiming success. This does not protect from user deletion or device loss.
- Project-hosted GitHub Pages shares one origin with sibling projects. Code cannot isolate indexedDB from sibling apps of the same origin; a dedicated origin/custom domain is required for isolation and remains a deployment decision.
- Backups remain unencrypted and local; browser estimates and persistence do not replace backup files.
