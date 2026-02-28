# Proposed Refactors

Ongoing notes on deferred technical improvements identified during vibe-hack sessions.
Each item has a priority (P1 = urgent, P2 = valuable, P3 = nice-to-have) and a trigger
condition for when it should move to active work.

---

## Mod 9 — Property Type Registration

**Current state:** Property types (`stat`, `healthBar`, `skill`, `toggle`, `action`, etc.)
are used by convention across library scripts and UI components. There is no formal registry
or schema validation for them — a typo produces a silently missing section rather than an
error.

**Proposed refactor:** Add a `PROPERTY_TYPES` registry constant (or JSON schema) that
documents the full set of valid `attributeType` values, their required fields, and which
UI sections they render into. Scripts and tests could then validate library definitions
against it at load time.

**Priority:** P2

**Trigger:** Defer until the BitD Clock property type is needed (VH-004 planned). BitD
Clocks require a custom property type (`clock`) that renders as a segmented progress ring
— not expressible via existing types. That will be the first case where the lack of a
registry causes real friction (no obvious place to register the new type, no validation
that existing code handles unknown types gracefully).

**VH-003 update:** Expanse implementation confirmed that **three** systems (D&D 5e,
CoC 7e, The Expanse) require zero custom property types. The existing type set is
sufficient for most traditional RPG mechanics. Mod 9 priority remains P2 — deferring
until BitD Clock properties are needed (VH-004 planned).

---

## Focus Automation

**Current state:** Focuses are modeled as `skill` properties with `baseValue: 2`. They
display in the Skills section on the Character tab. When a player rolls an ability that
has a relevant Focus, they must add +2 manually.

**Proposed refactor:** Add a Focus-to-Ability linkage so that when a Roll action is
evaluated, any active Focuses linked to that Ability are automatically summed into the
roll formula.

**Implementation sketch:**
- Each Focus property stores `ability: 'communication'` (already present in the data model)
- A Roll action with `abilityRef: 'communication'` queries for active Focuses where
  `focus.ability === abilityRef` and adds their values to the roll
- Requires a computed roll formula or a pre-roll hook

**Priority:** P2

**Trigger:** When a second game system with Focuses is added (BitD has Approaches, which
are structurally similar). At that point the manual-add pattern becomes clearly untenable.

---

## Stunt Point Automation

**Current state:** Stunt Points are generated when any two dice match (value = Drama Die).
Tracked on paper during play.

**Proposed refactor:** Custom roll result parser that detects matching pairs in a 3d6
result and automatically displays the Stunt Point total.

**Implementation sketch:**
- Post-roll hook receives the individual die values (not just the sum)
- Checks for pairs; if found, shows "Stunt Points: [drama die value]"
- Drama Die could be flagged by die position or a separate roll

**Priority:** P3

**Trigger:** If/when the roll engine supports individual die value access (not just
aggregate totals). This requires platform-level support that may not exist yet.

---

## Income Roll Action

**Current state:** Income checks must be rolled manually (3d6 + Income vs. item cost TN).

**Proposed refactor:** Add a dedicated Income Roll action to the Expanse library, similar
to the Ability Roll actions.

**Priority:** P3

**Trigger:** Easy win — add to `insert-expanse-library.js` in the next Expanse session.
No code changes required.

---

## Per-Round Condition Effects (Dying)

**Current state:** The Dying condition notes "Lose 1 Constitution per round" in its
description but has no automated effect. The GM tracks this manually.

**Proposed refactor:** Per-round triggered effects — a system where a toggle condition
can fire an effect at a defined trigger point (start of round, end of turn, etc.).

**Priority:** P3

**Trigger:** Requires a turn/round tracking system that does not currently exist.
Defer until a full initiative/round tracker is implemented.
