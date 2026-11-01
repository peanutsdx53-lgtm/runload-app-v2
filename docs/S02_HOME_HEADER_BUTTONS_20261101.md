# S02 header buttons — final visual adjustment (2026-11-01)
Baseline: main 8461480b80510c6e9225fb45ba811f0044e45bfb.
Observed: the Edit control has a visibly smaller target and type than the adjacent screen-help control, especially on smartphone.
Decision: keep their meanings, locations and existing dashboard actions unchanged. Equalize button height (44px minimum), typography, border, fill, focus treatment and visual radius; modest Edit minimum width on PC and smartphone, with a smaller minimum for 320px.
Rules: do not add navigation, overwrite saved widget order, change the first-use guide, introduce voice playback or touch running data.
Evidence: tests/s02HomeGuideBrowser.mjs now checks computed geometry, overflow and edit-mode width at 320/390/768/1440 for Chromium/WebKit. Screenshot artifacts are written for closed/open/editing states.
Limits: browser emulation does not prove physical iPhone/Android tap behavior or full 29-condition acceptance. Review actual screenshots after CI.

## Browser finding and correction
- First CI 320px computed inspection found Edit 32px high while Help was 44px. A legacy `styles.css` `:has()` media rule had higher specificity and won over the first home-only declaration.
- Fix selectors target `.home-v3 .home-head .home-heading-actions >` (same specificity, later home stylesheet) instead of changing global CSS. Re-run real browser screenshot and geometry checks. Prior failure must not count as PASS.
