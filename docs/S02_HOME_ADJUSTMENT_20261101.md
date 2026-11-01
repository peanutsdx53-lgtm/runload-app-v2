# S02 Home adjustment — 2026-11-01
## Agreed
- User preferred the contextual B approach over navigation-duplicating option A.
- Remove the “表示例を見る” design-only launcher from the production home screen. No application data is replaced, fabricated or deleted.
- In a readable empty manual-running state only, show an optional “走行を記録する” entry within the existing latest-record widget. Re-use the existing `#/record-start` destination; do not change the saved widget order/visibility.
- A screen-specific optional guide, separate from legal onboarding and from app-wide introduction, is under discussion. No guide implementation, audio playback or autoplay is included in this patch.
## Why / WHAT
- Personal Informatics + Lived Informatics: enable self-directed record → review → return; no requirement to record daily.
- Strict separation between real saved records, optional input, and unsupported design sample values.
## How displayed / HOW
- On wide screens, empty-state explanation on the left and optional recording action on the right.
- On narrow screens, read top-to-bottom; the link remains inside the latest-record card.
- Keep global navigation and six-widget free-edit preferences intact; do not display action on a read error or once a valid recent run exists.
## Evidence and limits
- Node home unit tests plus new regression assertions for preview-button removal, empty/failure/populated state.
- 320/390/768/1440 screenshots using the current widget HTML and CSS were created for visual review; these are not claims of full iOS/Android native operation.
- Desktop/iOS/Android real-device accessibility and final 29-condition acceptance remain separate. Prior GPS browser smoke failure is unrelated and must be independently checked.
- Do not modify Current, research theory, ROF-J or science models.
