# Environment Ver.4 and body/equipment Ver.4 — 2026-10-24

## What is implemented on main

The environment input route `#/record-environment` now uses `ui/environmentExperience.js` + CSS. It follows the approved home/record palette on iPhone-sized, Android-sized and desktop layouts.

- Only the existing draft keys `temperatureC` and `environmentNote` are written to `state.recordDraft`. Blank temperature is *not* zero; valid range is −50…60 °C. The UI stops its confirmation link for invalid input.
- Weather chips (SUN/CLOUD/RAIN/SNOW) and perceived WIND/HUMID flags remain **transient UI state only**. They are NOT connected to the scientific calculation, GPS, weather services, or formal record persistence. The UI explicitly says so.
- No previous entry schemas were migrated or changed. No change to old `runload-app`.
- `tests/environmentExperience.test.mjs` validates range, missing-vs-zero, escapes, toggles. `tests/browserSmoke.mjs` exercises 320px/390px/430px/desktop layouts and snapshot capture.

## Next UI proposal, awaiting approval

The body/equipment Ver.4 clickable design prototype is stored at `/RunLoad_Screen_Design_Repository/RunLoad_v2_身体使用品_操作可能デザインVer4_20261024.html`; reference screenshots and handoff memo are in that Library folder (document 32). **This proposal is not implemented in main**.

Its 12 selectable observation-region IDs are existing `BA-DISP-014, 015, 016, 018, 019, 021, 023, 024, 025, 027, 028, 029`, mapped to existing public-facing names in `app.js`. Selection is a subjective input aid only — **not the baseline-100 scientific comparison values**, not a clinical diagnosis, and not a ROF-J score.

The currently supported draft inputs are `bodyObservation`, `shoeName`, and `memo`. Introducing persistent `observedRegions` or storing subjective flags requires a separate approval and data contract. The design prototype does not pretend otherwise.

## Verification and handoff

GitHub workflows `UI Next smoke`, `UI browser visual smoke` and GitHub Pages were all green on the latest UI commit at handoff. Final hands-on iPhone/Android confirmation is still outstanding.

On future updates, keep the record UI staged, keep screen fields aligned across PC/mobile, and do not silently convert subjective observations into scientific 12-region results.