# RunLoad GPSコード設計対策・検証対応表（2026-10-27）

対象：`peanutsdx53-lgtm/runload-app-v2` / `main`。目的は **実走を実施せずにコード設計で対策された事項を追跡可能にする** こと。元アプリ `runload-app` および12部位の科学計算はこのGPS改修の対象外。

## 判定区分

- **設計・模擬PASS**：実コードに対策があり、Node.jsまたは自動ブラウザーで模擬検証が成功した範囲。CIログで現在の `main` に対する最終結果を照合する。
- **設計上の限界**：ブラウザー/OSの規約・権限・データ消去等によりコードで保証できない。検証PASSとは表現しない。
- **実機保留**：スマートフォンを持って屋外で走行する検証。現段階のリリース判定には含めず、ユーザーの指示があるまで実施しない。

## 工程別・設計対策と自動検証

| ID | 具体的な危険・課題 | 実装箇所・対策 | 自動検証・確認できる範囲 |
| --- | --- | --- | --- |
| W-01 | OSで位置情報が過去に許可されていても、本人が新しい測定に同意していない | `app.js` の `gpsConsentAction`：新規開始・一時停止後再開の都度、アプリ内の確認を必須化。拒否/Escapeで `watchPosition` 不実行 | `tests/browserSmoke.mjs`：確認前は監視ゼロ、キャンセル・Escape・再開時の確認 |
| W-02 | タイル読み込み失敗で測定不能、外部地図の参照元制限 | `ui/gpsLiveMap.js`：タイルの表示成功を画像デコードで確認、失敗通知、OSMにRefererを送れる設定。地図がなくても距離・軌跡の測定は継続 | `tests/gpsLiveMap.test.mjs`、`tests/browserSmoke.mjs`：画像読込、Referer、タイル障害 |
| W-03 | 不正確な標高や長いGPS空白を真正な起伏・走行距離と誤認 | `ui/gpsMeasurementCore.js`：`altitudeAccuracy`・`altitudeQuality`、不確かな標高は `ele:null`、30秒超の空白を切れ目として距離加算しない | `tests/gpsAltitudeQuality.test.mjs`：精度不明・高度スパイク・時間ギャップ |
| W-04 | GPSルートが他のlocalStorage記録と容量競合、保存失敗の黙殺 | `ui/gpsIndexedDbStore.js`：GPS専用IndexedDB、成功はトランザクション完了後、読取異常は変更禁止。位置列は保存時の追加選択が必要 | `tests/gpsIndexedDbStore.test.mjs`、`tests/browserSmoke.mjs`：書込・再読込・削除・localStorageのGPS不保存 |
| W-05 | 2,000点超で末尾軌跡だけ欠落し距離と一致しない | `ui/gpsMeasurementCore.js`：全採用点で距離計算し、軌跡は上限以下へ簡略化。最終点・区間切れ目を維持し `trackSimplified` を明記 | `tests/gpsLongTrack.test.mjs`：4時間・14,401点の模擬測位、区間切替、終点・保存距離一致 |
| W-06 | ブラウザーの保存領域消去、復元時の衝突、容量不足 | `ui/gpsIndexedDbStore.js`：明示的JSONバックアップ・検証後の復元・衝突拒否。`ui/gpsStorageHealth.js`：サイト全体の容量概算、ユーザー操作による永続化申請、共有オリジン警告 | `tests/gpsBackupContract.test.mjs`、`tests/gpsStorageHealth.test.mjs`、`tests/browserSmoke.mjs`：異常JSON・衝突・保存・復元・永続化の拒否 |
| W-07 | GPSの地形値を科学的な走行能力予測・12部位値と混同 | `ui/gpsCourseEvidence.js` と `ui/simulationExperience.js`：GPSのA/B仮位置と観測／補間標高を別表示。欠損・終点超過で値を作らず、科学計算に入力しない | `tests/gpsCourseEvidence.test.mjs`、`tests/simulationExperience.test.mjs`、`tests/browserSmoke.mjs` |
| W-08 | 非表示中にGPS停止しても見かけの連続測定になる、権限拒否、過去の非同期処理が復帰後に混入 | `app.js`：`visibilitychange`/`pagehide`でGPSと任意のWake Lockを停止。復帰は再同意必須。`ui/gpsMeasurementCore.js`：watch世代番号で古いコールバックを除外。計測終了時の停止時間を一回だけ差引く。Wake Lockは非同期の世代照合を行う | `tests/measurementExperience.test.mjs`：一時停止終了、複数停止、権限拒否、古いコールバック。`tests/browserSmoke.mjs`：非表示・復帰・再確認 |

### 特に重要な設計上の禁止事項

1. **保存していない現在の測定内容を、本人の同意なく永続保存しない。** 現行版は走行中の状態をメモリで保持する。ブラウザーの強制終了・タブ再読込後の未保存測定は復元できない。UIに明示する。
2. **画面ロック中の継続GPSを保証しない。** 画面が非表示になった通知を受けたら明示的に一時停止する。OSが事前警告なくアプリを強制終了した場合は、必ずしもイベントを受信できない。
3. **Wake Lockは測位継続の保証ではない。** 初期OFF、明示的に選択した測定でのみ要求し、端末・電池・ブラウザー判断により拒否・自動解放される。
4. **GPS高度から速度や身体負荷の補正値を生成しない。** 信頼できる検証済みモデルと別途の承認が必要。
5. **保存先は端末内であり、暗号化や確実な永続性を保証しない。** GPSバックアップは非暗号化。GitHub Pagesの兄弟アプリと同一オリジンになる配置ではWebストレージの完全な分離はできない。専用オリジンの採用は運用・公開環境の設計判断。

## 自動PASSの意味と実機保留の境界

自動テストのPASSは、**定義した入力・模擬イベント・ブラウザー実装下の挙動が条件に合致する** ことを示す。スマートフォン実GPSセンサーの誤差、端末に固有の電源管理、屋外での受信、高度の信頼性、長時間発熱/電池消費の合格を意味しない。

実機検証は **保留**。後で実施する場合のみ、端末・OS・ブラウザー・屋外受信・画面ロック/復帰・長時間記録・再読込後の保存状態を別の受入記録に残す。現段階では未検証と表記し、コード対策の未達と混同しない。

## 保護・改修の運用

- `runload-app-v2/main` を直接変更。保護対象の科学計算・12部位比較、旧 `runload-app` と `Runload_UIUX_Idea_Repository` は変更しない。
- 原則「原因 → 最小改修 → 合致する回帰テスト → 全CI判定」。CIが未完了なら未完了と明記。
- 事故後に曖昧な「実機PASS」「画面ロックでも計測継続」を報告しない。
