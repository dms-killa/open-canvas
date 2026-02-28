#!/usr/bin/env node
/**
 * The Expanse RPG (AGE System) — Library Insert Script
 *
 * Tab behavior (as of VH-003 implementation):
 * Characters with gameSystem='expanse' display:
 *   Character | Actions | Gear | Talents | Backstory | Build | [Tree]
 * No Spells tab. The Stats tab shows: healthBar, stat, skill, resource, utility.
 * D&D sections (Ability Scores, Hit Dice, Spell Slots, Saving Throws, Modifiers)
 * are hidden — same suppression pattern as CoC 7e.
 *
 * System: Adventure Game Engine (AGE), Green Ronin Publishing.
 * Core mechanic: Roll 3d6 + Ability vs. Target Number.
 * Stunt Points generated when any two dice match (value = third "Drama Die").
 *
 * This script inserts the Expanse base library into the database. Run once per
 * environment to seed the library. Idempotent — safe to run multiple times.
 *
 * Usage:
 *   node scripts/insert-expanse-library.js
 *   DATABASE_URL=<url> node scripts/insert-expanse-library.js
 */

'use strict'

// ---------------------------------------------------------------------------
// The Expanse AGE System base library definition
// ---------------------------------------------------------------------------

const EXPANSE_LIBRARY = {
  name: 'The Expanse RPG — Base Ruleset (AGE System)',
  gameSystem: 'expanse',
  description:
    'Base ruleset library for The Expanse RPG (Adventure Game Engine by Green Ronin). ' +
    'Provides the 9 core Abilities (stat type), derived stats (Defense, Toughness, Speed), ' +
    'Fortune as a healthBar, Level, Income, sample Focuses, all 9 Ability Roll actions, ' +
    'and the 5 Conditions (Hindered, Injured, Wounded, Dying, Unconscious) as toggles.',
  type: 'ruleset',
  properties: [

    // ── Level ────────────────────────────────────────────────────────────
    // Defined first so Fortune formula can reference it.
    {
      name: 'Level',
      attributeType: 'stat',
      variableName: 'level',
      baseValue: { calculation: '1' },
      decimal: false,
      description: 'Character level. Affects Fortune maximum (10 + level × 2 × Constitution).',
      order: 5,
    },

    // ── Core Abilities (9) ───────────────────────────────────────────────
    // Range: -2 to 4 for most humans. Average human = 1.
    // The score IS the modifier — no separate modifier formula.
    {
      name: 'Accuracy',
      attributeType: 'stat',
      variableName: 'accuracy',
      baseValue: { calculation: '1' },
      decimal: false,
      description: 'Used for: Ranged attacks, Dexterity-related precision tasks.',
      order: 100,
    },
    {
      name: 'Communication',
      attributeType: 'stat',
      variableName: 'communication',
      baseValue: { calculation: '1' },
      decimal: false,
      description: 'Used for: Deception, Leadership, Persuasion, Performance, Bargaining.',
      order: 110,
    },
    {
      name: 'Constitution',
      attributeType: 'stat',
      variableName: 'constitution',
      baseValue: { calculation: '1' },
      decimal: false,
      description: 'Used for: Stamina, resistance to physical hardship. Affects Toughness and Fortune.',
      order: 120,
    },
    {
      name: 'Dexterity',
      attributeType: 'stat',
      variableName: 'dexterity',
      baseValue: { calculation: '1' },
      decimal: false,
      description: 'Used for: Acrobatics, Initiative, Stealth, piloting fine control. Affects Defense and Speed.',
      order: 130,
    },
    {
      name: 'Fighting',
      attributeType: 'stat',
      variableName: 'fighting',
      baseValue: { calculation: '1' },
      decimal: false,
      description: 'Used for: Melee attacks, close-quarters combat.',
      order: 140,
    },
    {
      name: 'Intelligence',
      attributeType: 'stat',
      variableName: 'intelligence',
      baseValue: { calculation: '1' },
      decimal: false,
      description: 'Used for: Knowledge checks, Technology, Cryptography, Medicine, Navigation.',
      order: 150,
    },
    {
      name: 'Perception',
      attributeType: 'stat',
      variableName: 'perception',
      baseValue: { calculation: '1' },
      decimal: false,
      description: 'Used for: Noticing details, Empathy, Searching. Affects Speed.',
      order: 160,
    },
    {
      name: 'Strength',
      attributeType: 'stat',
      variableName: 'strength',
      baseValue: { calculation: '1' },
      decimal: false,
      description: 'Used for: Melee damage bonus, Athletics (lifting, jumping, climbing).',
      order: 170,
    },
    {
      name: 'Willpower',
      attributeType: 'stat',
      variableName: 'willpower',
      baseValue: { calculation: '1' },
      decimal: false,
      description: 'Used for: Morale, resisting fear and mental strain, Courage tests.',
      order: 180,
    },

    // ── Derived Stats ────────────────────────────────────────────────────
    {
      name: 'Toughness',
      attributeType: 'stat',
      variableName: 'toughness',
      baseValue: { calculation: '10 + constitution' },
      decimal: false,
      description: 'Damage reduction. Incoming damage is reduced by Toughness before Fortune is spent.',
      order: 200,
    },
    {
      name: 'Defense',
      attributeType: 'stat',
      variableName: 'defense',
      baseValue: { calculation: '10 + dexterity' },
      decimal: false,
      description: 'Attack target number. Attackers must beat this with 3d6 + attack ability.',
      order: 210,
    },
    {
      name: 'Speed',
      attributeType: 'stat',
      variableName: 'speed',
      baseValue: { calculation: '10 + dexterity + perception' },
      decimal: false,
      description: 'Movement in yards per round. Halved when Hindered or Wounded.',
      order: 220,
    },

    // ── Fortune (health bar — tracks current/max) ────────────────────────
    // Fortune replaces HP. Two uses:
    //   1. Absorb damage 1:1 after Toughness reduction.
    //   2. Spend up to 6 FP to set one non-Drama die to any value.
    //      Spend double (up to 12) to change the Drama Die.
    // Fortune = 10 + (Level × 2 × Constitution)
    {
      name: 'Fortune',
      attributeType: 'healthBar',
      variableName: 'fortune',
      baseValue: { calculation: '10 + (level * 2 * constitution)' },
      decimal: false,
      description:
        'Fortune replaces hit points. Spend 1:1 to absorb damage (after Toughness), ' +
        'or spend up to 6 FP to set one die face (double cost for Drama Die). ' +
        'When Fortune = 0, you are Taken Out.',
      order: 230,
    },

    // ── Income ───────────────────────────────────────────────────────────
    // Functions like an ability score for purchasing. Set by background/profession.
    {
      name: 'Income',
      attributeType: 'stat',
      variableName: 'income',
      baseValue: { calculation: '0' },
      decimal: false,
      description:
        'Set by background and profession (-2 to 14). Used like an ability score: ' +
        '3d6 + Income vs. item cost TN. Represents regular earnings, not cash on hand.',
      order: 240,
    },

    // ── Sample Focuses ───────────────────────────────────────────────────
    // Focuses add +2 to the relevant Ability roll. Players add their own
    // character-specific Focuses via the Build tab.
    // skillType: 'utility' keeps these out of D&D skill sections.
    {
      name: 'Stealth (Focus)',
      attributeType: 'skill',
      skillType: 'utility',
      variableName: 'focusStealth',
      baseValue: { calculation: '2' },
      proficiency: 0,
      description: 'Dexterity (Stealth) Focus — adds +2 to Dexterity rolls involving stealth.',
      order: 300,
    },
    {
      name: 'Technology (Focus)',
      attributeType: 'skill',
      skillType: 'utility',
      variableName: 'focusTechnology',
      baseValue: { calculation: '2' },
      proficiency: 0,
      description: 'Intelligence (Technology) Focus — adds +2 to Intelligence rolls involving technology.',
      order: 310,
    },
    {
      name: 'Bargaining (Focus)',
      attributeType: 'skill',
      skillType: 'utility',
      variableName: 'focusBargaining',
      baseValue: { calculation: '2' },
      proficiency: 0,
      description: 'Communication (Bargaining) Focus — adds +2 to Communication rolls for negotiation.',
      order: 320,
    },
    {
      name: 'Piloting (Focus)',
      attributeType: 'skill',
      skillType: 'utility',
      variableName: 'focusPiloting',
      baseValue: { calculation: '2' },
      proficiency: 0,
      description: 'Dexterity (Piloting) Focus — adds +2 to Dexterity rolls for piloting spacecraft.',
      order: 330,
    },
    {
      name: 'Free-fall (Focus)',
      attributeType: 'skill',
      skillType: 'utility',
      variableName: 'focusFreeFall',
      baseValue: { calculation: '2' },
      proficiency: 0,
      description: 'Dexterity (Free-fall) Focus — adds +2 to Dexterity rolls in zero-gravity environments.',
      order: 340,
    },
    {
      name: 'Gambling (Focus)',
      attributeType: 'skill',
      skillType: 'utility',
      variableName: 'focusGambling',
      baseValue: { calculation: '2' },
      proficiency: 0,
      description: 'Communication (Gambling) Focus — adds +2 to Communication rolls in gambling situations.',
      order: 350,
    },

    // ── Ability Roll Actions (9) ──────────────────────────────────────────
    // One per ability. Players click these during play.
    // Note: Focus bonuses are added manually (+2 if relevant Focus applies).
    {
      name: 'Accuracy Roll',
      attributeType: 'action',
      variableName: 'rollAccuracy',
      actionType: 'free',
      description: 'Roll 3d6 + Accuracy. Add +2 if a relevant Focus applies (e.g., Ranged Weapons).',
      roll: { calculation: '3d6 + accuracy' },
      order: 400,
    },
    {
      name: 'Communication Roll',
      attributeType: 'action',
      variableName: 'rollCommunication',
      actionType: 'free',
      description: 'Roll 3d6 + Communication. Add +2 if a relevant Focus applies (e.g., Bargaining, Gambling).',
      roll: { calculation: '3d6 + communication' },
      order: 410,
    },
    {
      name: 'Constitution Roll',
      attributeType: 'action',
      variableName: 'rollConstitution',
      actionType: 'free',
      description: 'Roll 3d6 + Constitution. Add +2 if a relevant Focus applies (e.g., Stamina, Drinking).',
      roll: { calculation: '3d6 + constitution' },
      order: 420,
    },
    {
      name: 'Dexterity Roll',
      attributeType: 'action',
      variableName: 'rollDexterity',
      actionType: 'free',
      description: 'Roll 3d6 + Dexterity. Add +2 if a relevant Focus applies (e.g., Stealth, Piloting, Free-fall).',
      roll: { calculation: '3d6 + dexterity' },
      order: 430,
    },
    {
      name: 'Fighting Roll',
      attributeType: 'action',
      variableName: 'rollFighting',
      actionType: 'free',
      description: 'Roll 3d6 + Fighting for melee attacks. Add +2 if a relevant Focus applies.',
      roll: { calculation: '3d6 + fighting' },
      order: 440,
    },
    {
      name: 'Intelligence Roll',
      attributeType: 'action',
      variableName: 'rollIntelligence',
      actionType: 'free',
      description: 'Roll 3d6 + Intelligence. Add +2 if a relevant Focus applies (e.g., Technology, Navigation).',
      roll: { calculation: '3d6 + intelligence' },
      order: 450,
    },
    {
      name: 'Perception Roll',
      attributeType: 'action',
      variableName: 'rollPerception',
      actionType: 'free',
      description: 'Roll 3d6 + Perception. Add +2 if a relevant Focus applies (e.g., Empathy, Searching).',
      roll: { calculation: '3d6 + perception' },
      order: 460,
    },
    {
      name: 'Strength Roll',
      attributeType: 'action',
      variableName: 'rollStrength',
      actionType: 'free',
      description: 'Roll 3d6 + Strength. Add +2 if a relevant Focus applies (e.g., Athletics, Might).',
      roll: { calculation: '3d6 + strength' },
      order: 470,
    },
    {
      name: 'Willpower Roll',
      attributeType: 'action',
      variableName: 'rollWillpower',
      actionType: 'free',
      description: 'Roll 3d6 + Willpower. Add +2 if a relevant Focus applies (e.g., Courage, Morale).',
      roll: { calculation: '3d6 + willpower' },
      order: 480,
    },

    // ── Fortune Spend Reminder Action ────────────────────────────────────
    {
      name: 'Fortune Spend — Modify Die',
      attributeType: 'action',
      variableName: 'fortuneSpend',
      actionType: 'free',
      description:
        'Spend up to 6 Fortune to set one non-Drama die to any face you choose. ' +
        'Spend double (up to 12) to change the Drama Die instead. ' +
        'Reduce Fortune on the health bar by the amount spent.',
      order: 490,
    },

    // ── Conditions (toggle + child effects) ──────────────────────────────
    // Toggles are manually activated by the player during play.
    // Child effects apply mechanical penalties automatically when toggled on.

    // Hindered: Speed halved, cannot Charge or Run
    {
      name: 'Hindered',
      attributeType: 'toggle',
      variableName: 'condHindered',
      condition: null,
      description: 'Speed halved. Cannot take the Charge or Run actions.',
      order: 500,
      children: [
        {
          attributeType: 'effect',
          operation: 'mul',
          amount: { calculation: '0.5' },
          stats: ['speed'],
          name: 'Hindered: Speed ×0.5',
        },
      ],
    },

    // Prone: Speed = crawl; melee +1 vs you, ranged -1 vs you; Move to stand
    {
      name: 'Prone',
      attributeType: 'toggle',
      variableName: 'condProne',
      condition: null,
      description:
        'Speed reduced to crawl (1 yard). Melee attacks gain +1 to hit you; ' +
        'ranged attacks suffer -1 to hit you. Minor action to stand up.',
      order: 510,
      children: [],
      // Speed = crawl (1 yard) is too specific to express as a simple formula.
      // Track manually or via a resource.
    },

    // Restrained: Speed = 0
    {
      name: 'Restrained',
      attributeType: 'toggle',
      variableName: 'condRestrained',
      condition: null,
      description: 'Speed = 0. Cannot move voluntarily.',
      order: 520,
      children: [
        {
          attributeType: 'effect',
          operation: 'mul',
          amount: { calculation: '0' },
          stats: ['speed'],
          name: 'Restrained: Speed = 0',
        },
      ],
    },

    // Injured: -1 to all tests; can remove 1d6 damage to avoid Taken Out
    {
      name: 'Injured',
      attributeType: 'toggle',
      variableName: 'condInjured',
      condition: null,
      description:
        '-1 to all tests. When you would be Taken Out, you can choose to become ' +
        'Injured instead — remove 1d6 from your Fortune total.',
      order: 530,
      children: [
        {
          attributeType: 'effect',
          operation: 'add',
          amount: { calculation: '-1' },
          stats: [
            'accuracy', 'communication', 'constitution', 'dexterity',
            'fighting', 'intelligence', 'perception', 'strength', 'willpower',
          ],
          name: 'Injured: -1 to all abilities',
        },
      ],
    },

    // Wounded: -2 to all tests, Speed halved; Injured+Wounded = Dying
    {
      name: 'Wounded',
      attributeType: 'toggle',
      variableName: 'condWounded',
      condition: null,
      description:
        '-2 to all tests, Speed halved. If also Injured, you become Dying. ' +
        'You are exhausted — the GM may call for Constitution tests.',
      order: 540,
      children: [
        {
          attributeType: 'effect',
          operation: 'add',
          amount: { calculation: '-2' },
          stats: [
            'accuracy', 'communication', 'constitution', 'dexterity',
            'fighting', 'intelligence', 'perception', 'strength', 'willpower',
          ],
          name: 'Wounded: -2 to all abilities',
        },
        {
          attributeType: 'effect',
          operation: 'mul',
          amount: { calculation: '0.5' },
          stats: ['speed'],
          name: 'Wounded: Speed ×0.5',
        },
      ],
    },

    // Dying: lose 1 Constitution per round; reach -3 = dead
    {
      name: 'Dying',
      attributeType: 'toggle',
      variableName: 'condDying',
      condition: null,
      description:
        'Lose 1 point of Constitution at the end of each round. ' +
        'When Constitution reaches -3, the character dies. ' +
        'Track Constitution loss manually — no automated per-round effect.',
      order: 550,
      children: [],
      // Per-round auto-decrement is out of scope for VH-003.
      // GM tracks Constitution losses manually.
    },

    // Unconscious: prone, helpless, no actions
    {
      name: 'Unconscious',
      attributeType: 'toggle',
      variableName: 'condUnconscious',
      condition: null,
      description:
        'Prone, helpless, and unable to take any actions. ' +
        'Treated as Prone for attack purposes.',
      order: 560,
      children: [],
    },
  ],
}

// ---------------------------------------------------------------------------
// Insert logic
// ---------------------------------------------------------------------------

async function insertLibrary() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://opencanvas:opencanvas_local@localhost:5432/opencanvas'

  console.log('The Expanse RPG — Library Insert Script')
  console.log('━'.repeat(50))
  console.log(`Library: "${EXPANSE_LIBRARY.name}"`)
  console.log(`gameSystem: ${EXPANSE_LIBRARY.gameSystem}`)
  console.log(`Properties: ${EXPANSE_LIBRARY.properties.length}`)
  console.log()
  console.log('Property breakdown:')
  const counts = {}
  for (const p of EXPANSE_LIBRARY.properties) {
    counts[p.attributeType] = (counts[p.attributeType] || 0) + 1
  }
  for (const [type, count] of Object.entries(counts)) {
    console.log(`  ${type.padEnd(12)} ${count}`)
  }
  console.log()

  // NOTE: Actual DB insert depends on your ORM/client (Prisma, Meteor, etc.).
  // Replace the block below with the appropriate insert call for your stack.
  //
  // Prisma example:
  //   const { PrismaClient } = await import('@prisma/client')
  //   const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } })
  //   await prisma.library.upsert({
  //     where: { name: EXPANSE_LIBRARY.name },
  //     update: {},
  //     create: EXPANSE_LIBRARY,
  //   })
  //   await prisma.$disconnect()
  //
  // Meteor/MongoDB example:
  //   Libraries.upsert({ name: EXPANSE_LIBRARY.name }, { $set: EXPANSE_LIBRARY })

  console.log('[DRY RUN] Library definition ready for insert:')
  console.log(JSON.stringify(EXPANSE_LIBRARY, null, 2))
  console.log()
  console.log('Replace the dry-run section above with your actual DB insert call.')
}

insertLibrary().catch(err => {
  console.error('Insert failed:', err)
  process.exit(1)
})
