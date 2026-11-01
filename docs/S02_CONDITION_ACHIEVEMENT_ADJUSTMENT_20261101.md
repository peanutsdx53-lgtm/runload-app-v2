# S02 Home｜Condition and achievements presentation adjustments (2026-11-01)
## Functional basis (WHAT/WHY)
Keep Personal Informatics and Lived Informatics: voluntary life-context entry and self-directed return; do not infer sleep causes, health scores, ability or mandatory running frequency. Achievement derives only from actually stored, valid manual running records, never GPS or hypothetical samples.
## Screen-design basis (HOW SHOWN)
- Condition: When zero dated life records exist in the past seven days and storage is readable, substitute a meaningful, explicitly nonzero empty-state explanation for the meaningless blank 7-day plot. If storage is unreadable, state a read error, never an absence of records. With data, display actual recorded-day bars and an explanation of missing days.
- Achievement: Replace four unlabeled diamond-shaped markers with four text-labeled milestones and their achieved/unachieved states, based on the unchanged achievementSummary. Make the unused half of the PC row useful while preserving card colors. Respect vertical reading on small phones.
- Header card opening actions are 44px minimum touch targets. No extra navigation; preserve overall home layout and saved user widget order.
## Test / counterexamples
- Empty, read-error, one observed day, one valid manually saved run, 2/4 achievement calculation, prior persistence.
- Chromium and WebKit at 320/390/768/1440; screenshots for empty, populated, condition-dialog and achievement-dialog; check card-edge and document overflow, touch targets, no JS exceptions.
- Physical iPhone/Android interaction, accessibility 200%-text, complete 29-condition acceptance not claimed by this internal exercise.
## Out of scope
No change to legal introduction, screen-guide, results three tabs, ROF-J, scientific equations, schemas, GPS, approved Current, or published research theory.

## Actual execution result (2026-11-01)
- Target HEAD (test-only selector correction): `55ae26b9db4ab6a1b9e8d4a55906b8fa95fa8e74`.
- S02 visual acceptance: GitHub Actions run `41266349966`, both Chromium and WebKit PASS. 320, 390, 768, 1440px each; empty and populated card states, condition and achievement dialogs. Screenshot artifacts `s02-condition-achievements-chromium` and `s02-condition-achievements-webKit`.
- The initial run failed due to an ambiguous Playwright close-button locator (two legitimate close controls), not an observed application layout failure; made locator specific and reran successfully.
- Baseline PC screenshot showed an empty, unexplained condition plot and only four unlabeled achievement symbols, leaving a large blank area on the right.
- Revised PC screenshot preserves paired-card horizontal balance, names each milestone, and explains no-data versus zero. The populated screenshot displays one real dated life entry and two achieved milestones derived from a saved, valid 5 km / 35 minute manual run; this is test fixture data, not evidence of user outcomes.
- Mobile 320 and 390px show no cross-card text overlap or document horizontal overflow for tested states, but the fixed navigation visually crosses the full-page capture at its viewport position; this is expected in stitched full-page screenshots, not proof every possible scroll interaction is satisfactory.
- Remaining: physical iPhone/Android screen-reader, zoom, safe area and touch interaction; app-wide general browser smoke GPS path has a separate outstanding failure not resolved by this S02-specific change.
- Earlier design sample launcher remains removed. No Current overwrite, effect claim or storage-schema modification.
