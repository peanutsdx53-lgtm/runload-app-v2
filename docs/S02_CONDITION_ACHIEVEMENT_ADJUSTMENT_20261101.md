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
