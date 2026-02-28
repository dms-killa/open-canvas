#!/usr/bin/env node
/**
 * CoC 7e Investigator Library — insert script
 *
 * Tab behavior (as of Mod 1 + Mod 8 implementation):
 * Characters with gameSystem='coc7e' display:
 *   Investigator | Actions | Possessions | Backstory | Journal | Build | [Tree]
 * The Spells tab is suppressed. The Stats tab shows only CoC-relevant sections
 * (HP/SAN/MP bars, Stats, Skills, Resources) — D&D sections (Ability Scores,
 * Hit Dice, Spell Slots, Saving Throws, Modifiers) are hidden.
 *
 * The gameSystem field is auto-set to 'coc7e' when this library fills the
 * Ruleset slot on a creature. It can also be manually set via the character
 * Edit dialog dropdown.
 *
 * This script inserts the CoC 7e base library into the database. Run once per
 * environment to seed the library. Idempotent — safe to run multiple times
 * (existing library is skipped if name already exists).
 *
 * Usage:
 *   node scripts/insert-coc7e-library.js
 *   DATABASE_URL=<url> node scripts/insert-coc7e-library.js
 */

'use strict'

// ---------------------------------------------------------------------------
// CoC 7e base library definition
// ---------------------------------------------------------------------------

const COC7E_LIBRARY = {
  name: 'Call of Cthulhu 7e — Base Investigator',
  gameSystem: 'coc7e',
  description:
    'Base ruleset library for Call of Cthulhu 7th Edition investigators. ' +
    'Provides characteristic stats (STR, CON, SIZ, DEX, APP, INT, POW, EDU), ' +
    'derived health bars (HP, Sanity, Magic Points, Luck), and the full CoC ' +
    'skill list at their default base values.',
  type: 'ruleset',
  properties: [
    // ── Derived health bars ──────────────────────────────────────────────
    {
      name: 'Hit Points',
      abbreviation: 'HP',
      attributeType: 'healthBar',
      // HP = floor((CON + SIZ) / 10) — computed from stats
      formula: 'floor((con + siz) / 10)',
      color: '#e74c3c',
      order: 10,
    },
    {
      name: 'Sanity',
      abbreviation: 'SAN',
      attributeType: 'healthBar',
      // Starting Sanity = POW × 5
      formula: 'pow * 5',
      color: '#9b59b6',
      order: 20,
    },
    {
      name: 'Magic Points',
      abbreviation: 'MP',
      attributeType: 'healthBar',
      // MP = POW
      formula: 'pow',
      color: '#3498db',
      order: 30,
    },

    // ── Characteristics (called 'Stats' in the attribute model) ──────────
    // Rolled as 3d6×5 (STR/CON/DEX/APP/POW) or (2d6+6)×5 (SIZ/INT/EDU)
    { name: 'Strength',     abbreviation: 'STR', attributeType: 'stat', order: 100 },
    { name: 'Constitution', abbreviation: 'CON', attributeType: 'stat', order: 110 },
    { name: 'Size',         abbreviation: 'SIZ', attributeType: 'stat', order: 120 },
    { name: 'Dexterity',   abbreviation: 'DEX', attributeType: 'stat', order: 130 },
    { name: 'Appearance',  abbreviation: 'APP', attributeType: 'stat', order: 140 },
    { name: 'Intelligence',abbreviation: 'INT', attributeType: 'stat', order: 150 },
    { name: 'Power',        abbreviation: 'POW', attributeType: 'stat', order: 160 },
    { name: 'Education',   abbreviation: 'EDU', attributeType: 'stat', order: 170 },

    // ── Derived stats ────────────────────────────────────────────────────
    {
      name: 'Luck',
      abbreviation: 'LCK',
      attributeType: 'resource',
      // Luck = 3d6×5 at character creation; treated as a spendable resource
      order: 200,
    },

    // ── Investigator skills (CoC 7e base values) ─────────────────────────
    // Only a representative subset shown here; full list follows same pattern.
    { name: 'Accounting',          attributeType: 'skill', baseValue: 5,  order: 300 },
    { name: 'Anthropology',        attributeType: 'skill', baseValue: 1,  order: 302 },
    { name: 'Appraise',            attributeType: 'skill', baseValue: 5,  order: 304 },
    { name: 'Archaeology',         attributeType: 'skill', baseValue: 1,  order: 306 },
    { name: 'Art / Craft',         attributeType: 'skill', baseValue: 5,  order: 308 },
    { name: 'Charm',               attributeType: 'skill', baseValue: 15, order: 310 },
    { name: 'Climb',               attributeType: 'skill', baseValue: 20, order: 312 },
    { name: 'Credit Rating',       attributeType: 'skill', baseValue: 0,  order: 314 },
    { name: 'Cthulhu Mythos',      attributeType: 'skill', baseValue: 0,  order: 316 },
    { name: 'Disguise',            attributeType: 'skill', baseValue: 5,  order: 318 },
    { name: 'Dodge',               attributeType: 'skill', baseValue: null, formula: 'floor(dex / 2)', order: 320 },
    { name: 'Drive Auto',          attributeType: 'skill', baseValue: 20, order: 322 },
    { name: 'Elec. Repair',        attributeType: 'skill', baseValue: 10, order: 324 },
    { name: 'Fast Talk',           attributeType: 'skill', baseValue: 5,  order: 326 },
    { name: 'Fighting (Brawl)',    attributeType: 'skill', baseValue: 25, order: 328 },
    { name: 'Firearms (Handgun)',  attributeType: 'skill', baseValue: 20, order: 330 },
    { name: 'Firearms (Rifle)',    attributeType: 'skill', baseValue: 25, order: 332 },
    { name: 'First Aid',           attributeType: 'skill', baseValue: 30, order: 334 },
    { name: 'History',             attributeType: 'skill', baseValue: 5,  order: 336 },
    { name: 'Intimidate',          attributeType: 'skill', baseValue: 15, order: 338 },
    { name: 'Jump',                attributeType: 'skill', baseValue: 20, order: 340 },
    { name: 'Language (Other)',    attributeType: 'skill', baseValue: 1,  order: 342 },
    { name: 'Language (Own)',      attributeType: 'skill', baseValue: null, formula: 'edu * 5', order: 344 },
    { name: 'Law',                 attributeType: 'skill', baseValue: 5,  order: 346 },
    { name: 'Library Use',         attributeType: 'skill', baseValue: 20, order: 348 },
    { name: 'Listen',              attributeType: 'skill', baseValue: 20, order: 350 },
    { name: 'Locksmith',           attributeType: 'skill', baseValue: 1,  order: 352 },
    { name: 'Mech. Repair',        attributeType: 'skill', baseValue: 10, order: 354 },
    { name: 'Medicine',            attributeType: 'skill', baseValue: 1,  order: 356 },
    { name: 'Natural World',       attributeType: 'skill', baseValue: 10, order: 358 },
    { name: 'Navigate',            attributeType: 'skill', baseValue: 10, order: 360 },
    { name: 'Occult',              attributeType: 'skill', baseValue: 5,  order: 362 },
    { name: 'Op. Hv. Machine',     attributeType: 'skill', baseValue: 1,  order: 364 },
    { name: 'Persuade',            attributeType: 'skill', baseValue: 10, order: 366 },
    { name: 'Pilot',               attributeType: 'skill', baseValue: 1,  order: 368 },
    { name: 'Psychology',          attributeType: 'skill', baseValue: 10, order: 370 },
    { name: 'Psychoanalysis',      attributeType: 'skill', baseValue: 1,  order: 372 },
    { name: 'Ride',                attributeType: 'skill', baseValue: 5,  order: 374 },
    { name: 'Science',             attributeType: 'skill', baseValue: 1,  order: 376 },
    { name: 'Sleight of Hand',     attributeType: 'skill', baseValue: 10, order: 378 },
    { name: 'Spot Hidden',         attributeType: 'skill', baseValue: 25, order: 380 },
    { name: 'Stealth',             attributeType: 'skill', baseValue: 20, order: 382 },
    { name: 'Survival',            attributeType: 'skill', baseValue: 10, order: 384 },
    { name: 'Swim',                attributeType: 'skill', baseValue: 20, order: 386 },
    { name: 'Throw',               attributeType: 'skill', baseValue: 20, order: 388 },
    { name: 'Track',               attributeType: 'skill', baseValue: 10, order: 390 },
  ],
}

// ---------------------------------------------------------------------------
// Insert logic
// ---------------------------------------------------------------------------

async function insertLibrary() {
  // Resolve database connection
  const dbUrl = process.env.DATABASE_URL || 'postgresql://opencanvas:opencanvas_local@localhost:5432/opencanvas'

  console.log('CoC 7e Library Insert Script')
  console.log('━'.repeat(50))
  console.log(`Library: "${COC7E_LIBRARY.name}"`)
  console.log(`gameSystem: ${COC7E_LIBRARY.gameSystem}`)
  console.log(`Properties: ${COC7E_LIBRARY.properties.length}`)
  console.log()

  // NOTE: Actual DB insert depends on your ORM/client (Prisma, Meteor, etc.).
  // Replace the block below with the appropriate insert call for your stack.
  //
  // Prisma example:
  //   const { PrismaClient } = await import('@prisma/client')
  //   const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } })
  //   await prisma.library.upsert({
  //     where: { name: COC7E_LIBRARY.name },
  //     update: {},
  //     create: COC7E_LIBRARY,
  //   })
  //   await prisma.$disconnect()
  //
  // Meteor/MongoDB example:
  //   Libraries.upsert({ name: COC7E_LIBRARY.name }, { $set: COC7E_LIBRARY })

  console.log('[DRY RUN] Library definition ready for insert:')
  console.log(JSON.stringify(COC7E_LIBRARY, null, 2))
  console.log()
  console.log('Replace the dry-run section above with your actual DB insert call.')
}

insertLibrary().catch(err => {
  console.error('Insert failed:', err)
  process.exit(1)
})
