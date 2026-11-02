# R-09 / F-04｜Currentにある採用原著PDF9本の独立バイト整合点検（2026-11-02）

## 調査方法

Libraryの**既存原本** `/RunLoad/Current/Sources/Adopted_Originals/` の9ファイルを読取専用の参照元として確認し、作業領域へ一時的にコピーして、PDFとして開けること・頁数・バイト長・SHA256を独立算出した。**正式Current・公開GitHubコード・原本に変更はない。PDFの本体もその画像も本リポジトリに保存・公開しない。**

| 採用原著（ファイル名） | ファイル長(bytes) | PDF頁 | SHA-256 |
|---|---:|---:|---|
| `Epstein_et_al_2015_Lived_Informatics.pdf` | 1049837 | 12 | `f164df540387fcb3d394df9c34c911236866b0c1859dbd0574f3e092ce2a7028` |
| `Fukuchi_2017_PeerJ_e3298.pdf` | 12185386 | 24 | `08a036802d617e51a030c7d0e8e76dd177bc6e8deb914f0de017b91b20e73075` |
| `Gazendam_Hof_2007_GaitPosture_EMG_Speed.pdf` | 1440397 | 11 | `22a3845f1474aaaa350cf557830d97df9e3090063b74ef1828bf854ee2c6ebbd` |
| `Li_2020_Load_Transference_Running_Speed_Plantar_Pressure.pdf` | 1016006 | 12 | `22ed924787a25be6ab57f56906b5c4586b51ea063efd29d7bff256db61f831e9` |
| `Li_Dey_Forlizzi_2010_Stage_Based_Personal_Informatics.pdf` | 356610 | 10 | `5993ad3cb7d80076c2d00081bc3846d05e1149a1004afa410ca5ccda9f9ac1cf` |
| `Suzuki_Arai_2026_ROFJ_Validation.pdf` | 965121 | 9 | `8ffd2e36b4c8b852a8d74c07d5051cc6856813dffd92c4655ae09b3387c92152` |
| `adherence_and_health_related_outcomes_of_beginner_running_programs_a_10_week_observational_study.pdf` | 253224 | 32 | `8222418e61e56c807246cdcb6b7f12813c18a9b9c1fdef71e330bd025b015b1f` |
| `how_are_sports_trackers_used_by_runners_running_related_data_personal_goals_and_self_tracking_in_running.pdf` | 1300610 | 14 | `3a084bb5408b0d70a09706b11942b8b7e3d69b202bd05295ec4896c365ac3f77` |
| `per_step_cumulative_load_running_injury_locations_speed_gradient_cadence.pdf` | 2936570 | 19 | `afaf00bc970c7723c4e440b90f948a0c7f8a8750b9ccfa0641dce1bedaa4fcd6` |

## 検証結果と残る権利・科学判定

- 全9PDFはファイルとして読み込み可能で、完全性を識別するSHA256と物理頁数を採取した。**この結果は過去のハッシュと比較しなければ「原本が以前から不変」の証明ではない**。4本の科学原著（Fukuchi・Gazendam・Van Hooren・Li 2020）については正式Currentの2026-10-31固定科学再現ログに記録されたSHAとすべて一致した。
- 正式Currentの`MANIFEST_SHA256.json`は`scope=SELECTED_CANONICAL_AND_MANAGEMENT_FILES_NOT_ALL_LIBRARY`、`other_current_files_hashed=false`、`app_sha_status=NOT_ASSERTED_LATEST`と明記された**部分マニフェスト**である。これは9採用原著の完全な目録や2026-11-02 GitHub mainのハッシュ整合を証明しない。F-02/F-04として拡大マニフェストが必要。
- 以上は**PDFの著作権・再配布許諾の証明ではない**。ROF-Jの原図・原文の利用条件や、研究論文PDFの転載/公開は別の原著・権利台帳に従い、判断が未確定な原本は配布しない。PDFが暗号化されていない事実は許諾を意味しない。
- R-03の全採用経験的主張98件の原文位置・方法・対象・許される解釈、R-11の査読・標本・バイアス・訂正状態と質評価は本検査の対象外。対応する主張と頁を全件紐付け、権利を独立に確認する必要がある。
- **部分証拠の増強であって R-09/F-04 の正式PASSではない**。本人の実記録や個人識別情報は対象としていない。

## 次作業

1. `/RunLoad/Current/Sources/`のその他背景・補助原典と保護旧98原本を索引と照合し、同名・異SHA・許諾未確定を明示する。
2. 原著の頁と研究主張・数表・品質審査を個別に突合する。欠損や不確実な原典は採用強行しない。
3. 完全性を説明する配布可能・非公開・管理限定の3区分の候補マニフェストを、正式Currentの正本ファイルを上書きしない別文書として作る。