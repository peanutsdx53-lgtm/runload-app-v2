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
