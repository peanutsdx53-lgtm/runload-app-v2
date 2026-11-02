# RunLoad｜承認Current内の原著4PDF・固定科学再現の再実行（2026-11-02）

**目的**：承認済みV0.2の R-04/R-05/R-12/C-03/C-12 に対する独立証拠を、既存の科学パッケージから正本を改変せず追加する。**原著の妥当性、個人の実測負荷、29条件正式PASSを宣言する文書ではない。**

## 再実行した正式Currentの固定入力

参照した原本（非公開Library／正本、**本GitHubへPDFをアップロードしない**）：

- `/RunLoad/Current/Science_Reproduction/check_science.py` SHA256 `051650dfa997a5a41cf90b98f6ba5ea6763ab013c5072937e037b5fc3231e412`
- `/RunLoad/Current/Sources/Adopted_Originals/Gazendam_Hof_2007_GaitPosture_EMG_Speed.pdf` SHA256 `22a3845f1474aaaa350cf557830d97df9e3090063b74ef1828bf854ee2c6ebbd`
- `/RunLoad/Current/Sources/Adopted_Originals/Fukuchi_2017_PeerJ_e3298.pdf` SHA256 `08a036802d617e51a030c7d0e8e76dd177bc6e8deb914f0de017b91b20e73075`
- `/RunLoad/Current/Sources/Adopted_Originals/per_step_cumulative_load_running_injury_locations_speed_gradient_cadence.pdf` SHA256 `afaf00bc970c7723c4e440b90f948a0c7f8a8750b9ccfa0641dce1bedaa4fcd6`
- `/RunLoad/Current/Sources/Adopted_Originals/Li_2020_Load_Transference_Running_Speed_Plantar_Pressure.pdf` SHA256 `22ed924787a25be6ab57f56906b5c4586b51ea063efd29d7bff256db61f831e9`

ライブラリの正式原本は**読取のみ**。原本を一度作業領域に複製し、入力4PDF＋計算スクリプトについて全5件のSHAが2026-10-31の既存`15_独立作業領域2回再計算_SHA結果.json`と一致することを確認。

## 二つの独立出力フォルダでの再実行

一方の出力を他方へコピーしたのではなく、同一の固定スクリプトを独立した`runA`・`runB`で実行した。コマンド：

```sh
RUNLOAD_SOURCE_PDFS="/path/to/verified/pdf-copies" RUNLOAD_AUDIT_OUT="/tmp/runload-check-A" python3 check_science.py
RUNLOAD_SOURCE_PDFS="/path/to/verified/pdf-copies" RUNLOAD_AUDIT_OUT="/tmp/runload-check-B" python3 check_science.py
```

実行の各出力5ファイルは **runA＝runB完全一致、さらに2026-10-31保存の既存出力ハッシュにも完全一致**。

| 生成物 | SHA256 | 大きさ |
|---|---|---:|
| `00_原著固定スナップショット.json` | `ea7af76593314003b62a4ec0949ac8c0a93ce94993a0b5c7e38c4e9f5f0502c1` | 5116 |
| `00_科学再現_検査サマリ.json` | `574db1002955d37403e12e0b98ffc44a634df586a06dd549617d4fd39b83a290` | 1423 |
| `01_科学65点_独立原著値と現行登録比較.csv` | `0f40346092d5bc43f9bb70a12595b720776943c8cc4e33cad471ac02ab3dd01c` | 19361 |
| `02_方向53区間と補間_独立照合.csv` | `beb4c969ea74b813cd5ca58383003eb5f725b54f0cbf3e6ab819e6814f410acd` | 5064 |
| `03_区間外反例24件_期待結果.csv` | `0a477e70ec79cbfe6789d4a4e13a7cd2531180c8c5b49b746bfee023a395e15e` | 2469 |

結果サマリ：12部位／数表45アンカー／Gazendam係数式20評価／参照値65点／隣接53区間／うち**減少13区間**（全部位は単調増加しない）／中点補間53件／適用範囲外の期待拒否24件。

## 出典の限定目視と既存GitHubエンジンの試験

- Li 2020 PDF表示上の5頁でTable 1の全8速度の部位別測定欄を**部分目視**し、固定スクリプトに記された「6→7 km/hで踵の値が減少する」非単調性と対応する数値 314.41→296.76 を確認。これは**Table 1全45点の独立手転記審査ではない**。
- Gazendam & Hof 2007 PDF表示4頁を部分目視し、走速度でEMGの反応が筋によって異なる旨と計測/解析の説明を確認。PDFの式の全係数・誤差と転記の全件照合ではない。
- 現行GitHubには`tests/preregisteredPublishedReferenceAudit.test.mjs`（凍結済み事前登録SHA256 `b43e8c37bbcc11334b34e6251a4a1c8b66f9df516176a7d3d229b525ed718665`を記載）があり、`evaluateRunningRegion`の65点・24範囲外・混合活動と非単調例を検査する。2026-11-02のUI Next、研究解釈監査でNodeテスト成功。ただし**当該Python再現自身が最新版GitHubエンジンのコードを呼び出したわけではない**。

## 未成立／禁止する主張

1. **R-12/C-12正式PASSではない**：固定スクリプトと採用原著からの転記期待値の反復再現は確保。ただし原著表式を独立目視で全件検算し、学術品質、許容差の由来、現在mainの新しいソースSHAの対象範囲を統一した独立実行記録は未完成。
2. **R-03/R-11正式PASSではない**：保存原本が存在しハッシュ一致でも、全採用経験主張の著者・年・方法・統計・原文頁と解釈の全数監査は代替できない。
3. **科学的実証ではない**：原著の平均群測定や計算の整合性は初心者個々人の生体負荷、走行能力、傷害リスクの予測・診断力を意味しない。文献参考値の100は設計上の基準であり、部位横断ランキング不可。
4. **権利**：本リポジトリに4原著PDF、原著の頁画像、非公開Current資料をアップロードせず、作業の複製PDFを利用者向けZIPにも含めない。
5. **正本・実機**：正式Currentは未変更。物理iPhone/Androidは最後の別ゲート。第三者の再現検証を代行したとは主張しない。

## 次の非実機作業

現行科学コードと固定CSV/独立プログラムの全比較・差分記録（事前期待値の上書き禁止）、残りの原著表値・統計・権利の全数照合、29条件のR/C/F項目へ実行証拠と留保の接続を優先。完了のたびに条件単位の証拠を追加して再審査する。
