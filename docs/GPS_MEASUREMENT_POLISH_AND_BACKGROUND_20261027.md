# GPS測定UI・消費カロリー・PWAバックグラウンド調査（2026-10-27）

## 実装範囲
- GPS測定画面の重複した「軌跡プレビュー」を削除。現在地地図・ルート・フラッグを1画面にまとめる。
- フラッグは採用済み位置のみ、押下で番号と件数を地図に表示。測位前の押下は理由を表示。
- 終了後にフラッグごとの任意メモ（240字まで）を記入。詳細保存OFFでは位置・速度・フラッグ・メモを永続化しない。
- フラッグ／一時停止（再開）を上段、測定終了を全幅下段に整理。停止中は再開を全幅とする。
- 終了時の有効移動距離が10m未満の場合は「保存できません」と明示し、「保存せず戻る」で安全に離脱できる。
- 平均ペースの横に、任意プロフィール体重を使った「推定消費カロリー」を表示する。測定開始時の体重を固定する。

## 消費エネルギーの出所
旧 `runload-app/main/ui/mobileRunMeasurementEnergy.js` の `adult-compendium-2024-running-speed-v1` を計算式とMET表を変更せずに再利用。

- Herrmann et al., 2024 Adult Compendium of Physical Activities. https://pmc.ncbi.nlm.nih.gov/articles/PMC10818145/
- 速度別の公式MET表: https://pacompendium.com/running/
- 公式換算: https://pacompendium.com/unite-conversions/
- 元実装の説明: https://github.com/peanutsdx53-lgtm/runload-app/blob/main/docs/references/mobile-measurement-energy-expenditure.md
- `MET × 3.5 × 体重(kg) / 200 × 活動時間(分)` の概算値で、個人の実測値ではない。
- 対象はRUNNINGとJOGGINGのみ。WALK・MIXEDを連続走行として扱わない。
- 体重未設定、元モデルの速度範囲外、距離10m未満などでは推定しない。
- GPS保存概要に利用体重・モデルID・速度帯対応を含む推定の出所を保存。Reference-100とは別の指標。

## iPhone PWAのバックグラウンドGPS調査
**判定：現行Web技術だけでは、iPhoneの画面ロック中・アプリ切替中に連続GPS測位を保証できない。**

- W3C Geolocation 2026 Specification：位置情報更新は完全にアクティブで可視のドキュメントへ配信され、非表示中の更新は保証されない。
  https://www.w3.org/TR/geolocation/
- `navigator.geolocation.watchPosition()` はWindowのGeolocation APIであり、Service WorkerにバックグラウンドGPSを持続させる標準機能はない。
  https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition
- インストールされたPWAにはオフラインキャッシュなどの利点はあるが、連続位置追跡のOSレベルのバックグラウンド実行許可に相当しない。
- したがってRunLoadでは非表示・画面ロックを検出したら測定を一時停止し、ユーザーが前面復帰後に明示的に再開する。バックグラウンド区間を直線補間せずGPS欠損として扱う。
- 「画面を点灯したままにする」はWake Lockが対応・許可された間だけ有効。バックグラウンドGPSを有効化する機能ではない。

### iPhoneでの追加実機検証（未PASS）
1. Safariタブで測定開始→30秒以上画面をロック→復帰し、測位・経過時間・一時停止メッセージを確認
2. ホーム画面に追加したPWAで同じ操作を行う
3. SafariとPWAで別アプリへ切替→復帰する
4. PWAで「画面点灯保持」ON/OFFの端末挙動を確認（端末により非対応）
5. 各条件でGPS受信欠損の前後が直線連結されず、再開時にGPS権限の確認が行われることを確認
6. 走行中は安全な場所で操作し、スクリーンの注視を求めない

バックグラウンドの継続位置追跡を製品要件にする場合は、ネイティブアプリでOS所定の位置権限を使う実装を別途検討する。
