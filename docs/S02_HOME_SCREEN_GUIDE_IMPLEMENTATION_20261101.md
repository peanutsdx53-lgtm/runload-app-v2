# S02 Home screen help — approved adjustment record (2026-11-01)

## Decision and limits
The user approved the S02 contextual B screen and the separately presented on-demand screen-specific help proposal. This patch adds only the optional home guide, not audio narration and not a new legal onboarding process. Design-only “表示例を見る” remains unavailable to users. Current and research/scientific source files are unchanged.

## WHY / feature rationale
- Personal Informatics: connect recording, revisit and interpretation without requiring uninterrupted tracking.
- Lived Informatics: voluntary visits, recording pauses and returning to prior records.
- User's own information, optional condition records and scientific reference values must not be conflated. The guide makes no claim of proven self-understanding improvement.

## HOW SHOWN / UX rationale
- “？ この画面の使い方” alongside the existing Home title and “編集”; global navigation is unchanged.
- Closed by default. Opening displays three steps (record, revisit, customize), followed by a condition-record caveat. It does not take over the screen.
- PC shows 3 columns; narrower screens show 1 column in reading order. No mandatory training or autoplay.
- `aria-expanded`, `aria-controls`, labeled region, real heading, visible close control. Focus moves into the heading when opened and back to the button when closed. Volatile state resets on leaving Home, and does not modify the saved widget arrangement.

## HOW BUILT / implementation and verification
- `app.js`: guide rendering and button event handlers. No new storage keys or data/schema/science changes.
- `ui/homeExperience.css`: responsive visuals in the pre-existing dark design language.
- `index.html`, `sw.js`: cache revision for correct PWA refresh and offline shell transition.
- `tests/s02HomeScreenGuide.test.mjs`: closed/open contract, semantics, responsive CSS.
- `tests/s02HomeGuideBrowser.mjs`: 320, 390, 768, 1440 width; Chromium and WebKit screenshot, no horizontal overflow, focus and navigation tests, and no dashboard preference writes. GitHub Actions uploads screenshots as CI artifacts.

## Remaining conditions
- Native iPhone Safari and Android Chrome input, scrolling and assistive technologies must be independently verified. Chromium/WebKit headless screenshots are not native device tests.
- Introduction/onboarding still covers the whole app and legal consent; the local guide does not replace it.
- Audio guide is a separately proposed subsequent phase, with manual activation, text-equivalent information and OS-dependent real-device review. No audio features were added.
- All 29 formal acceptance criteria cannot be inferred from this targeted S02 update.