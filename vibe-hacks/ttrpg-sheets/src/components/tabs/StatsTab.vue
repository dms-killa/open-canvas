<template>
  <div class="stats-tab">

    <!-- ── Health Bars ──────────────────────────────────────────────── -->
    <!-- Shown for all systems. CoC uses HP, SAN, MP as healthBar props. -->
    <section v-if="healthBars.length" class="stat-section">
      <h3 class="section-heading">Health</h3>
      <div class="property-grid">
        <health-bar-row
          v-for="bar in healthBars"
          :key="bar._id"
          :property="bar"
          :creature="creature"
        />
      </div>
    </section>

    <!-- ── Ability Scores ───────────────────────────────────────────── -->
    <!--
      D&D-only section. Suppressed for CoC (no 'ability' type properties exist).
      Suppression approach chosen: Option A (explicit system allowlist) preferred
      over Option B (hide if empty) because:
        1. Intent is self-documenting — SYSTEM_ATTRIBUTE_SECTIONS shows exactly
           which types each system owns.
        2. Adding a new system only requires editing one constant.
        3. D&D characters still get "hide if empty" protection via the
           abilityScores.length check — belts AND suspenders.
    -->
    <section
      v-if="sectionAllowed('ability') && abilityScores.length"
      class="stat-section"
    >
      <h3 class="section-heading">Ability Scores</h3>
      <div class="ability-grid">
        <ability-score-card
          v-for="prop in abilityScores"
          :key="prop._id"
          :property="prop"
          :creature="creature"
        />
      </div>
    </section>

    <!-- ── Stats ───────────────────────────────────────────────────── -->
    <!-- Shown for all systems. CoC: STR, CON, SIZ, DEX, APP, INT, POW, EDU -->
    <section v-if="stats.length" class="stat-section">
      <h3 class="section-heading">Stats</h3>
      <div class="property-grid">
        <stat-row
          v-for="prop in stats"
          :key="prop._id"
          :property="prop"
          :creature="creature"
        />
      </div>
    </section>

    <!-- ── Modifiers ────────────────────────────────────────────────── -->
    <!-- D&D-only: proficiency bonus, initiative, speed, etc. -->
    <section
      v-if="sectionAllowed('modifier') && modifiers.length"
      class="stat-section"
    >
      <h3 class="section-heading">Modifiers</h3>
      <div class="property-grid">
        <stat-row
          v-for="prop in modifiers"
          :key="prop._id"
          :property="prop"
          :creature="creature"
        />
      </div>
    </section>

    <!-- ── Hit Dice ─────────────────────────────────────────────────── -->
    <!-- D&D-only section. -->
    <section
      v-if="sectionAllowed('hitDice') && hitDice.length"
      class="stat-section"
    >
      <h3 class="section-heading">Hit Dice</h3>
      <div class="property-grid">
        <hit-die-row
          v-for="prop in hitDice"
          :key="prop._id"
          :property="prop"
          :creature="creature"
        />
      </div>
    </section>

    <!-- ── Resources ────────────────────────────────────────────────── -->
    <!-- Shown for all systems. CoC uses resources for things like Luck. -->
    <section v-if="resources.length" class="stat-section">
      <h3 class="section-heading">Resources</h3>
      <div class="property-grid">
        <resource-row
          v-for="prop in resources"
          :key="prop._id"
          :property="prop"
          :creature="creature"
        />
      </div>
    </section>

    <!-- ── Spell Slots ──────────────────────────────────────────────── -->
    <!-- D&D-only section. -->
    <section
      v-if="sectionAllowed('spellSlot') && spellSlots.length"
      class="stat-section"
    >
      <h3 class="section-heading">Spell Slots</h3>
      <div class="property-grid">
        <spell-slot-row
          v-for="prop in spellSlots"
          :key="prop._id"
          :property="prop"
          :creature="creature"
        />
      </div>
    </section>

    <!-- ── Saving Throws ────────────────────────────────────────────── -->
    <!-- D&D-only section. CoC has no saving throws (uses resistance rolls instead). -->
    <section
      v-if="sectionAllowed('savingThrow') && savingThrows.length"
      class="stat-section"
    >
      <h3 class="section-heading">Saving Throws</h3>
      <div class="property-grid">
        <skill-row
          v-for="prop in savingThrows"
          :key="prop._id"
          :property="prop"
          :creature="creature"
        />
      </div>
    </section>

    <!-- ── Skills ───────────────────────────────────────────────────── -->
    <!--
      Shown for all systems.
      D&D: Acrobatics, Arcana, …
      CoC: Accounting, Anthropology, Appraise, Archaeology, …
    -->
    <section v-if="skills.length" class="stat-section">
      <h3 class="section-heading">Skills</h3>
      <div class="property-grid">
        <skill-row
          v-for="prop in skills"
          :key="prop._id"
          :property="prop"
          :creature="creature"
        />
      </div>
    </section>

    <!-- ── Empty state ──────────────────────────────────────────────── -->
    <div v-if="!properties.length" class="empty-state">
      No stats yet. Add properties via the Build tab.
    </div>

  </div>
</template>

<script>
/**
 * StatsTab.vue
 *
 * Renders character stats grouped by attributeType. Section visibility is
 * controlled by two factors (belt-and-suspenders approach):
 *
 *   1. SYSTEM_ATTRIBUTE_SECTIONS allowlist — explicit declaration of which
 *      attribute types each game system uses.
 *   2. Non-empty check — a section only renders if the creature actually has
 *      properties of that type (prevents empty section headers).
 *
 * For D&D characters (gameSystem === undefined or 'dnd5e'), all sections are
 * allowed (null allowlist = no filter).
 *
 * For CoC 7e characters, D&D-specific sections (ability, hitDice, spellSlot,
 * modifier, savingThrow) are suppressed regardless of whether they're empty.
 * The non-empty check is then redundant but left in place for safety.
 */

// Explicit declaration of which attribute types each game system uses.
// null means "show all" (D&D default — no filter applied).
// Omitted types will never render for that system, even if data is present.
const SYSTEM_ATTRIBUTE_SECTIONS = {
  coc7e: ['healthBar', 'stat', 'skill', 'resource', 'utility'],
  // omits: 'ability', 'hitDice', 'spellSlot', 'modifier', 'savingThrow'
  //
  // D&D 5e (undefined) → null → all sections shown (filtered only by empty check)
}

export default {
  name: 'StatsTab',

  props: {
    creature: {
      type: Object,
      default: null,
    },
  },

  computed: {
    gameSystem() {
      return this.creature?.gameSystem
    },

    // Allowed attribute types for the current game system.
    // null = no restriction (show all, subject to non-empty check).
    allowedAttributeTypes() {
      return SYSTEM_ATTRIBUTE_SECTIONS[this.gameSystem] ?? null
    },

    properties() {
      return this.creature?.properties ?? []
    },

    healthBars() {
      return this.properties.filter(p => p.attributeType === 'healthBar')
    },
    abilityScores() {
      return this.properties.filter(p => p.attributeType === 'ability')
    },
    stats() {
      return this.properties.filter(p => p.attributeType === 'stat')
    },
    modifiers() {
      return this.properties.filter(p => p.attributeType === 'modifier')
    },
    hitDice() {
      return this.properties.filter(p => p.attributeType === 'hitDice')
    },
    resources() {
      return this.properties.filter(p => p.attributeType === 'resource')
    },
    spellSlots() {
      return this.properties.filter(p => p.attributeType === 'spellSlot')
    },
    savingThrows() {
      return this.properties.filter(p => p.attributeType === 'savingThrow')
    },
    skills() {
      return this.properties.filter(p => p.attributeType === 'skill')
    },
  },

  methods: {
    /**
     * Returns true if the given attribute type is permitted for the current
     * game system. When allowedAttributeTypes is null (D&D default), all types
     * are permitted.
     */
    sectionAllowed(attributeType) {
      const allowed = this.allowedAttributeTypes
      return allowed === null || allowed.includes(attributeType)
    },
  },
}
</script>

<style scoped>
.stats-tab {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stat-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-heading {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #888;
  border-bottom: 1px solid #333;
  padding-bottom: 4px;
  margin: 0;
}

.property-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
}

.ability-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

@media (max-width: 600px) {
  .ability-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 32px 16px;
  font-style: italic;
}
</style>
