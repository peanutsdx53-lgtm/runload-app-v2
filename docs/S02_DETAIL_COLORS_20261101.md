# S02｜Condition date and Achievement detail color alignment (2026-11-01)

## User-reported issue
On physical iPhone screenshot the Condition native date input's custom visual surface remained teal despite the approved purple theme, while Achievement detail stayed teal despite the orange/gold Achievement card. The overall layouts and operation had already been reviewed; requested change is targeted color consistency.

## Functional design rationale
- Condition date selector remains a native, visually transparent date input placed above the `rl-date-control` surface; no change to input `type=date`, day selection, local date display or saved life records.
- Achievement detail retains its existing read-only labels, thresholds, source restrictions and empty/error state. Gold is a visual affordance, not an achievement recommendation or physiological indicator.
- No changes to research theory, authoritative Current, canonical records, GPS, ROF-J, result 3 tabs or dashboard edit persistence.

## Screen design rationale
- Recolor only `#app .hx-dialog.hx-condition-dialog .rl-date-control`, date text, calendar SVG and focus-within state in restrained indigo/lavender. Keep the generic `rl-date-control` elsewhere teal.
- Apply warm dark-brown background, orange/gold border and high-contrast cream labels to `hx-ach-dialog` and its existing summary/milestone components; do not alter Condition lavender or home nav.
- Prefer sufficiently specific selectors because `ui/recordExperience.css` is loaded after `ui/homeExperience.css`.

## Acceptance
Inspect computed colors of date control, icon, focus border, achievement modal background/border/close button at 320/390/768/1440 in Chromium and WebKit; capture screenshots. Verify date input remains a native input, date value remains the selected date, and editing the date still works. Verify 4 milestones and their achieved/unachieved status, keyboard focus and no horizontal clipping. Real iPhone and Android device visual and picker behavior remains a separate check.

## Screenshot refinement
The first browser captures showed that the Condition modal's auto-focused close button still inherited a teal focus ring from the generic home button rule. Scope that focus ring to lavender without modifying keyboard semantics or other screens. Run real Chromium and WebKit computed-style checks for the focused close button as part of the S02 visual acceptance.

## Final verification (2026-11-01)
- Code head: `98a752b214e5d40ad59e1ef219193d9f9453bdef`. S02 condition and achievements visual acceptance run `41273688095` completed SUCCESS in both Chromium and WebKit. Screenshot artifacts: `s02-condition-achievements-chromium` and `s02-condition-achievements-webKit`.
- Verified computed Condition date background `rgb(32, 36, 64)`, border `rgb(169, 155, 224)`, calendar icon `rgb(210, 193, 255)`, and native `type=date`. The Condition dialog close button has a lavender focus outline on actual keyboard focus; `:focus` fallback was added because WebKit's focus-visible behavior differs in the browser testing setup.
- Achievement dialog border `rgb(199, 148, 91)`, warm close control `rgb(91, 67, 53)`, warm/brown gradient. Existing 4 labels and achievement state preserved. Checked 320, 390, 768, 1440px and prior duration-only save / no-response rejection / 200%-root-font stress tests.
- On head `98a752b214e5d40ad59e1ef219193d9f9453bdef`, UI Next smoke, Research interpretation audit, S02 home guide visual acceptance, B/C optional-function acceptance, 20-screen design acceptance and Pages build/deployment reported SUCCESS. Do not equate the S02 result with full 29-condition acceptance or real-device QA.
- The screenshots are headless WebKit/Chromium captures, not the actual user's iPhone. Physical Safari date-picker wheel, Android picker, accessibility and OS text sizing remain to be verified on real devices.
