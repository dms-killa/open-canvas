# The Expanse RPG — DiceCloud Playtest Guide

*Adventure Game Engine (AGE) by Green Ronin Publishing*
*VH-003 implementation — for friend playtest use*

---

## Core Mechanic

**Roll 3d6 + Ability score vs. Target Number (TN)**

One of the three dice is the **Drama Die** (use a different color in real play).

| Difficulty    | TN |
|---------------|----|
| Average       | 11 |
| Challenging   | 13 |
| Hard          | 15 |
| Daunting      | 17 |
| Formidable    | 19 |
| Nigh-Impossible | 21 |

---

## Stunts

If **any two dice show the same number**, you generate **Stunt Points** equal to the Drama Die value.

- Stunt Points **must be spent immediately** — they do not carry over.
- Track on paper. The sheet does not automate Stunt Points.
- Common stunts: extra damage, knock prone, disarm, gain advantage next round.

---

## Focuses

A **Focus** is an area of expertise under a specific Ability (e.g., *Communication (Bargaining)*).

- **Having the relevant Focus adds +2 to the roll.**
- The sheet does not auto-add Focus bonuses to ability rolls.
- **How to use:** Click the Ability Roll action on the sheet, then add +2 manually if the situation matches a Focus you have.
- Players can add additional Focuses via the Build tab.

---

## Fortune

Fortune is shown as a **health bar** on the Character tab. It serves two purposes:

### 1. Absorb Damage
When you take damage:
1. Attacker rolls weapon damage.
2. Subtract your **Toughness** from the damage.
3. The remainder reduces your **Fortune** by that amount.

When Fortune hits **0**, you are **Taken Out** — the attacker chooses your condition.

### 2. Modify a Roll
Before seeing the result of a dice roll, you may spend Fortune to change a die:
- **Up to 6 Fortune:** Set one non-Drama die to any face you choose.
- **Up to 12 Fortune (double cost):** Set the Drama Die to any face you choose.

Reduce Fortune on the health bar by the amount spent. You choose before rolling — declare and deduct first.

---

## Conditions

Toggle conditions on/off in the Character tab. Mechanical penalties apply automatically.

| Condition   | Effect |
|-------------|--------|
| **Hindered**    | Speed halved. Cannot Charge or Run. |
| **Prone**       | Speed = crawl. Melee +1 vs. you, Ranged -1 vs. you. Minor action to stand. |
| **Restrained**  | Speed = 0. |
| **Injured**     | −1 to all tests. Can accept Injured to avoid Taken Out (remove 1d6 Fortune). |
| **Wounded**     | −2 to all tests, Speed halved. Injured + Wounded = Dying. |
| **Dying**       | Lose 1 Constitution per round. At Constitution −3: dead. *Track manually.* |
| **Unconscious** | Prone, helpless, no actions. |

---

## Combat Turn

**Initiative:** Roll 3d6 + Dexterity (higher goes first; ties broken by Dexterity score).

**On your turn, choose one of:**
- **1 Major action + 1 Minor action**
- **2 Minor actions**

**Common actions:**
| Action Type | Examples |
|-------------|----------|
| Major       | Attack, Charge, Run, Use a complex item |
| Minor       | Move (Speed in yards), Draw weapon, Stand up, Aim |
| Free        | Drop item, Short phrase, Activate ability roll |

### Attack Sequence
1. **Roll:** 3d6 + Accuracy (ranged) or Fighting (melee) vs. target's **Defense**.
2. **Hit?** Roll weapon damage.
3. **Target reduces by Toughness.** Remainder hits their Fortune.
4. **Target can spend Fortune** to further reduce damage (1 Fortune per 1 damage).
5. If Fortune hits 0, target is **Taken Out.**

### Common Weapons
| Weapon         | Damage | Notes |
|----------------|--------|-------|
| Unarmed Strike | 1d3 + Strength | |
| Holdout Pistol | 1d6+3  | Concealable |
| Heavy Pistol   | 2d6    | Standard sidearm |
| Assault Rifle  | 2d6+3  | Two-handed |
| PDW            | 1d6+4  | Compact rifle |

---

## Using the Sheet

### Character Tab
- **Health bar at top:** Current / Maximum Fortune.
- **Stats section:** All 9 Abilities plus Toughness, Defense, Speed, Level, Income.
- **Skills section:** Any Focuses you have added.
- **Toggles:** Condition on/off switches.

### Actions Tab
- **Ability rolls:** One button per Ability. Click to roll 3d6 + [ability].
- **Attacks:** Weapon attack rolls (separate damage roll shown in description).
- **Fortune Spend:** Reminder action — reduce Fortune on the health bar manually.

### Talents Tab (labeled "Features" in data)
- Lists your Talent descriptions. No mechanical automation — read and apply manually.

### Gear Tab (Inventory)
- Equipment list. Encumbrance not tracked in this version.

### Build Tab
- Add new properties: extra Focuses, custom abilities, or notes.

---

## Known Sheet Limitations (VH-003)

These are documented limitations — not bugs. They will be addressed in future sessions.

- **Focus automation:** Focuses do not auto-add to ability rolls. Add +2 manually when relevant.
- **Stunt Points:** Must be tracked on paper. No automatic detection of matching dice.
- **Dying condition:** Per-round Constitution loss must be tracked manually by the GM.
- **Income checks:** Roll 3d6 + Income manually; no dedicated Income action exists yet.
- **Ship combat:** Not implemented. Personal combat only.
- **Talent mechanics:** Descriptive text only — no automated talent effects.
- **Initiative tracker:** Not on the sheet. Use paper or a separate tracker.

---

## Quick Reference Card

```
ROLL:      3d6 + Ability vs. TN (11 average, 13 challenging, 15 hard)
STUNT:     Two dice match → earn Stunt Points = Drama Die value (spend immediately)
FOCUS:     Relevant expertise → add +2 (manual)
ATTACK:    3d6 + Accuracy/Fighting vs. Defense → damage − Toughness → reduce Fortune
FORTUNE:   Absorb damage (1:1 after Toughness) OR set a die face (6 FP; 12 FP Drama Die)
TAKEN OUT: Fortune = 0 → attacker chooses condition
```

---

*Sheet implemented by VH-003 session. Report issues to the vibe-hacks log in CLAUDE.md §9.*
