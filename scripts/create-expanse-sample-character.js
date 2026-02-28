#!/usr/bin/env node
/**
 * The Expanse RPG — Sample Character Insert Script
 *
 * Creates a complete pre-generated Level 1 character for playtest purposes.
 *
 * Character: Jadamantha "Jade" Holland
 * Background: Belter Negotiator, Level 1
 *
 * Stats (from The Expanse RPG rules reference):
 *   Accuracy 0, Communication 3, Constitution 1, Dexterity 2, Fighting 0,
 *   Intelligence 2, Perception 2, Strength 1, Willpower 3
 *
 * Derived (auto-calculated from formulas, shown for reference):
 *   Defense   = 10 + Dex(2)       = 12
 *   Toughness = 10 + Con(1)       = 11
 *   Speed     = 10 + Dex(2) + Per(2) = 14
 *   Fortune   = 10 + (1 × 2 × 1) = 12
 *
 * Focuses: Bargaining, Gambling (Communication); Free-fall (Dexterity)
 * Talents: Carousing (Novice), Improvisation (Novice), Oratory (Novice)
 *
 * Usage:
 *   node scripts/create-expanse-sample-character.js
 *   DATABASE_URL=<url> node scripts/create-expanse-sample-character.js
 */

'use strict'

// ---------------------------------------------------------------------------
// Sample character definition
// ---------------------------------------------------------------------------

const JADAMANTHA_HOLLAND = {
  name: 'Jadamantha "Jade" Holland',
  gameSystem: 'expanse',
  level: 1,
  background: 'Belter Negotiator',
  description:
    'Born on Ceres Station, Jade grew up navigating the sharp edges of Belt politics. ' +
    'She has a gift for reading people and an even better gift for making them feel ' +
    'heard — right up until the moment she walks away with exactly what she came for. ' +
    'She still owes the Outer Planets Alliance a favor she has been avoiding collecting.',

  // ── Core Abilities ────────────────────────────────────────────────────
  abilities: {
    accuracy:      0,
    communication: 3,
    constitution:  1,
    dexterity:     2,
    fighting:      0,
    intelligence:  2,
    perception:    2,
    strength:      1,
    willpower:     3,
  },

  // ── Derived Stats (computed values shown for reference/verification) ──
  // Actual values are calculated by formulas in the library:
  //   Defense   = 10 + dexterity        = 10 + 2 = 12
  //   Toughness = 10 + constitution     = 10 + 1 = 11
  //   Speed     = 10 + dexterity + perception = 10 + 2 + 2 = 14
  //   Fortune   = 10 + (level * 2 * constitution) = 10 + (1*2*1) = 12
  derivedStatsReference: {
    defense:   12,
    toughness: 11,
    speed:     14,
    fortune:   12,
  },

  // ── Focuses ───────────────────────────────────────────────────────────
  // Jade's specific focuses (each grants +2 to the parent Ability roll).
  focuses: [
    {
      name: 'Bargaining (Focus)',
      ability: 'communication',
      variableName: 'focusBargaining',
      description: 'Communication (Bargaining) — Jade\'s bread and butter. +2 to negotiation rolls.',
    },
    {
      name: 'Gambling (Focus)',
      ability: 'communication',
      variableName: 'focusGambling',
      description: 'Communication (Gambling) — Cards, dice, or bluffing a dockmaster. +2.',
    },
    {
      name: 'Free-fall (Focus)',
      ability: 'dexterity',
      variableName: 'focusFreeFall',
      description: 'Dexterity (Free-fall) — Belter-born. Moving in zero-g is natural. +2.',
    },
  ],

  // ── Talents ───────────────────────────────────────────────────────────
  // Tracked as feature properties with descriptive text.
  // Full mechanical automation of talent abilities is out of scope for VH-003.
  talents: [
    {
      name: 'Carousing (Novice)',
      attributeType: 'feature',
      description:
        'You are skilled at socializing and making friends in informal settings. ' +
        'Novice: When you make a successful Communication (Carousing) test in a social ' +
        'setting, you can ask the GM one question about the scene or an NPC present. ' +
        'The GM must answer honestly.',
    },
    {
      name: 'Improvisation (Novice)',
      attributeType: 'feature',
      description:
        'You are good at making do with whatever is at hand. ' +
        'Novice: Once per scene, you can use a mundane object as a tool or improvised ' +
        'weapon without the normal penalty, provided you can explain how to the GM.',
    },
    {
      name: 'Oratory (Novice)',
      attributeType: 'feature',
      description:
        'You can move people with your words when addressing a group. ' +
        'Novice: When you make a Communication (Persuasion) or Communication (Leadership) ' +
        'test to address a group of 3 or more people, add +1 to your roll.',
    },
  ],

  // ── Equipment ─────────────────────────────────────────────────────────
  equipment: [
    {
      name: 'Heavy Pistol',
      attributeType: 'item',
      quantity: 1,
      description:
        'Standard sidearm, common throughout the system. ' +
        'Damage: 2d6. Range: 30/60 yards. Reload: Minor action.',
    },
    {
      name: 'Holdout Pistol',
      attributeType: 'item',
      quantity: 1,
      description:
        'Compact and easily concealed. ' +
        'Damage: 1d6+3. Range: 20/40 yards. Concealable (Dexterity TN 13 to spot).',
    },
    {
      name: 'Commlink (Personal)',
      attributeType: 'item',
      quantity: 1,
      description: 'Standard personal communicator. Short-range encrypted channel.',
    },
    {
      name: 'Void Suit (Light)',
      attributeType: 'item',
      quantity: 1,
      description:
        'Light EVA suit rated for 4 hours. Provides Armor Rating 3 and vacuum protection. ' +
        'Penalty: -1 to Dexterity tests requiring fine motor control.',
    },
    {
      name: 'Data Pad',
      attributeType: 'item',
      quantity: 1,
      description: 'Portable computer for contracts, manifests, and belt navigation charts.',
    },
  ],

  // ── Attack Actions ─────────────────────────────────────────────────────
  // These are click-to-roll actions for combat.
  attacks: [
    {
      name: 'Heavy Pistol',
      attributeType: 'action',
      actionType: 'major',
      description:
        'Ranged attack. Roll 3d6 + Accuracy vs. target Defense. ' +
        'On hit: 2d6 damage (target reduces by Toughness, then can spend Fortune).',
      roll: { calculation: '3d6 + accuracy' },
      damageRoll: { calculation: '2d6' },
    },
    {
      name: 'Holdout Pistol',
      attributeType: 'action',
      actionType: 'major',
      description:
        'Ranged attack. Roll 3d6 + Accuracy vs. target Defense. ' +
        'On hit: 1d6+3 damage.',
      roll: { calculation: '3d6 + accuracy' },
      damageRoll: { calculation: '1d6 + 3' },
    },
    {
      name: 'Unarmed Strike',
      attributeType: 'action',
      actionType: 'major',
      description:
        'Melee attack. Roll 3d6 + Fighting vs. target Defense. ' +
        'On hit: 1d3 + Strength damage.',
      roll: { calculation: '3d6 + fighting' },
      damageRoll: { calculation: '1d3 + strength' },
    },
  ],

  // ── Skill Check Actions (primary ability) ───────────────────────────
  primaryActions: [
    {
      name: 'Negotiate (Communication + Bargaining)',
      attributeType: 'action',
      actionType: 'free',
      description:
        'Roll 3d6 + Communication + 2 (Bargaining Focus). ' +
        'Average TN 11. Challenging TN 13. Hard TN 15.',
      roll: { calculation: '3d6 + communication + 2' },
    },
    {
      name: 'Initiative Roll',
      attributeType: 'action',
      actionType: 'free',
      description:
        'Roll 3d6 + Dexterity for initiative. ' +
        'Add +2 if Free-fall Focus applies (zero-g combat).',
      roll: { calculation: '3d6 + dexterity' },
    },
  ],

  // ── Conditions (all toggled off at creation) ─────────────────────────
  conditions: [
    { name: 'Hindered',    active: false },
    { name: 'Prone',       active: false },
    { name: 'Restrained',  active: false },
    { name: 'Injured',     active: false },
    { name: 'Wounded',     active: false },
    { name: 'Dying',       active: false },
    { name: 'Unconscious', active: false },
  ],
}

// ---------------------------------------------------------------------------
// Insert logic
// ---------------------------------------------------------------------------

async function createCharacter() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://opencanvas:opencanvas_local@localhost:5432/opencanvas'

  console.log('The Expanse RPG — Sample Character Create Script')
  console.log('━'.repeat(50))
  console.log(`Character: ${JADAMANTHA_HOLLAND.name}`)
  console.log(`Background: ${JADAMANTHA_HOLLAND.background}`)
  console.log(`Level: ${JADAMANTHA_HOLLAND.level}`)
  console.log()

  console.log('Abilities:')
  for (const [ability, score] of Object.entries(JADAMANTHA_HOLLAND.abilities)) {
    console.log(`  ${ability.padEnd(15)} ${score >= 0 ? '+' : ''}${score}`)
  }
  console.log()

  console.log('Derived Stats (expected values):')
  for (const [stat, value] of Object.entries(JADAMANTHA_HOLLAND.derivedStatsReference)) {
    console.log(`  ${stat.padEnd(15)} ${value}`)
  }
  console.log()

  console.log('Focuses:')
  for (const focus of JADAMANTHA_HOLLAND.focuses) {
    console.log(`  ${focus.name} (${focus.ability})`)
  }
  console.log()

  console.log('Talents:')
  for (const talent of JADAMANTHA_HOLLAND.talents) {
    console.log(`  ${talent.name}`)
  }
  console.log()

  // NOTE: Actual DB insert depends on your ORM/client (Prisma, Meteor, etc.).
  // Replace the block below with the appropriate insert call for your stack.
  //
  // Prisma example:
  //   const { PrismaClient } = await import('@prisma/client')
  //   const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } })
  //   const creature = await prisma.creature.create({ data: JADAMANTHA_HOLLAND })
  //   console.log(`Created creature with ID: ${creature.id}`)
  //   await prisma.$disconnect()
  //
  // Meteor/MongoDB example:
  //   const id = Creatures.insert(JADAMANTHA_HOLLAND)
  //   console.log(`Created creature with ID: ${id}`)

  console.log('[DRY RUN] Character definition ready for insert:')
  console.log(JSON.stringify(JADAMANTHA_HOLLAND, null, 2))
  console.log()
  console.log('Replace the dry-run section above with your actual DB insert call.')
}

createCharacter().catch(err => {
  console.error('Create failed:', err)
  process.exit(1)
})
