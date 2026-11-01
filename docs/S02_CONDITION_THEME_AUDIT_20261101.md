# S02 condition visual theme and detail dialogue audit — 2026-11-01
## Context and authorization
User suggested distinguishing the condition card and entry screen from other teal cards, because achievement already has a distinct orange accent. The direction is a calm indigo/lavender theme, deliberately avoiding green/red health scores.
## Functional rationale (WHAT)
Preserve manual life diary as separate from run ROF-J; sleep/wake duration means in-bed interval, not objectively measured sleep; no inference that it caused running outcomes. Only presentation classes and CSS change. No changes to data saving, canonical running engine, result 3 tabs, dashboard preferences or Current.
## Screen design (HOW)
Condition card background #3a315e→#1a253f; lilac separators and seven-day bars, with neutral missing states. Condition-only dialog uses same nighttime indigo, lavender input focus and selected segmented control. The Achievement dialog remains orange-independent and unchanged. Text contrast and interaction states require browser verification.
## Limitations at start
Previous tests captured dialog opening only and visual bounds of cards, not ability to reach Save at 320/390, keyboard focus, valid/invalid submission or alternate input mode. Prior 320px condition screenshot shows a partly visible memo at the viewport bottom; it is not alone evidence of clipping if the modal itself scrolls.
## Quality requirements
Run actual Chromium/WebKit at 320,390,768,1440 widths; capture new empty/populated and condition dialog state, check all form controls within dialog and Save button reachable by scrolling, and test at least one duration-only save and cancellation flow. Device-specific date/time pickers and physical iOS/Android gestures remain separately unverified.

## Executed browser evidence (2026-11-01)
Commit `4e3f4ca6753c8edd996450c713750b23a205657c`: S02 condition and achievements visual acceptance, GitHub Actions run `41271386137` — Chromium PASS and WebKit PASS. Widths 320, 390, 768, 1440 px, empty and one-record states, both dialogs.
- The 320/390px initial condition modal screenshot does not show the Save button because the content is taller than the viewport. The dialog has its own scroll region: the browser test scrolled Save into view, captured the lower form area, and verified its bounding box remained within the modal.
- The test rejected saving with an unselected self-reported feeling, then saved explicit 7 hours 30 minutes and '良い'; the actual stored record was `sleepSource='duration'`, `sleepMinutes=450` and `feeling='良い'`. No additional inferred times were introduced.
- No cross-card document overflow or browser JS exception was detected in tested states; the Achievement detail was opened, captured and closed. Its 320px explanatory copy still wraps noticeably and its readability under enlarged text, keyboard focus/escape interaction and assistive tech is not fully accepted.
- Violet theme was visually verified on both the actual empty-state condition card and the condition dialog; saved-run achievement calculations and their orange presentation were unchanged.
- Chrome/WebKit headless coverage does not equal a physical iPhone/Android native-picker/accessibility or full 29-condition PASS. Do not claim complete detail-screen sign-off.
