# Design QA — Profiles mobile density

**Source visual truth:** `D:\OpportunityPilot\OpportunityPilotWebapp\design-reference-profile-mobile.png`

**Implementation evidence:**

- `D:\OpportunityPilot\OpportunityPilotWebapp\design-qa-mobile-light.png`
- `D:\OpportunityPilot\OpportunityPilotWebapp\design-qa-mobile-dark.png`
- `D:\OpportunityPilot\OpportunityPilotWebapp\design-qa-comparison.png`

**Viewport and normalization:** Browser CSS viewport was 375 × 812 at device scale 1. The source issue capture is
238 × 460 pixels. The browser content captures are 360 × 744 pixels in light mode (vertical scrollbar excluded) and
375 × 775 pixels in dark mode. The side-by-side comparison scales both images to 375 CSS pixels wide and is evidence
of layout/density, not pixel-for-pixel fidelity to a differently cropped source.

**State:** brand-new local development user, zero profiles, `/profiles/new`, Candidate selected; light and dark themes.

## Findings

No actionable P0, P1 or P2 findings remain.

- The source shows the reported problem rather than a target mock: a narrow content column and one full-width card per
  profile type. The implementation intentionally uses the available width and a two-column selector.
- The empty profile-list rail is absent for a zero-profile user. The form is the only primary region.
- All four types are visible in two rows. At 375 CSS pixels each card is about 160–168 pixels wide and 70 pixels high.
- Measured document width does not exceed the viewport in either theme: dark 375/375; light content 360 within a 375
  viewport. Persistent controls remain reachable.

## Required fidelity surfaces

- **Typography:** existing application font, weights and hierarchy are preserved; card descriptions remain readable
  and wrap without clipping.
- **Spacing/layout:** the redundant list rail is removed for first use; card padding and gaps are reduced at the mobile
  breakpoint; the editor stays single-column.
- **Colors/tokens:** only existing semantic surface, border, primary and text tokens are used. Selected state and text
  contrast remain clear in light and dark themes.
- **Image quality/assets:** this screen contains no product imagery or non-standard assets; existing interface icons are
  unchanged.
- **Copy/content:** all four profile names and descriptions remain present. No meaning or claim was removed.

## Interaction and runtime checks

- Development sign-in → Candidate onboarding → Continue to profile.
- Selected-state control and theme toggle.
- Empty-profile rail suppression.
- Console errors: none observed on the rendered profile screen.
- `npm run typecheck`: passed.
- `npm run lint`: passed.

## Comparison history

1. Original evidence: one-column type cards consume most of the mobile viewport and an empty Profiles region can
   occupy the page without useful content.
2. Fix: suppress the rail when the loaded profile count is zero; use a compact two-column grid through 860 pixels,
   with a one-column fallback below 341 pixels.
3. Post-fix evidence: 375-pixel light/dark captures show four visible types, the form using the full content width,
   and zero horizontal overflow.

Focused region comparison was not needed: the selector labels, descriptions, radio state and boundaries are readable
in the full-view side-by-side comparison, and there are no detailed image assets.

final result: passed

---

# Design QA — Job discovery controls

**Source reference:** `D:\Temp\codex-clipboard-5533fbd5-16d5-4921-b9d2-64877513336e.png` (1279 × 630).

## Source issues addressed

- KPI label, value and supporting text were inline and visually collided.
- Six Sales KPIs were forced into the five-column Candidate layout.
- Sales had no discovery filters, and Candidate had no explicit tech-stack/company/state/sort controls.

## Implementation checks

- Sales uses the six-column KPI strip; Candidate keeps five columns.
- Every KPI is a vertical flex stack: label → numeric value → supporting text.
- Wellfound filters wrap within the existing responsive filter container.
- Indeed is labelled as an official search handoff and never renders fabricated listing rows.
- TypeScript, lint, 146 unit tests and the production build pass.

## Visual comparison

Post-change browser capture and 375 px interaction check were not run because the user explicitly asked to stop browser-based testing. No claim of live visual verification is made.

final result: code-verified; visual check intentionally skipped by user request
