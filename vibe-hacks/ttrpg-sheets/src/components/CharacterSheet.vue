<template>
  <div class="character-sheet">
    <!-- Tab bar: driven by visibleTabs, recomputes when creature.gameSystem changes -->
    <nav class="tab-bar" role="tablist">
      <button
        v-for="tab in visibleTabs"
        :key="tab.id"
        role="tab"
        :aria-selected="activeTab === tab.id"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        <i :class="tab.icon" aria-hidden="true" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <!-- Tab content: renders the active tab component -->
    <div class="tab-content" role="tabpanel">
      <component
        :is="activeTabComponent"
        :creature="creature"
      />
    </div>
  </div>
</template>

<script>
/**
 * CharacterSheet.vue
 *
 * Top-level character sheet. Reads creature.gameSystem to decide which tabs
 * to display (Mod 1 + Mod 8 wire-up).
 *
 * Supported game systems:
 *   undefined / 'dnd5e' — full D&D 5e tab set (default)
 *   'coc7e'             — Call of Cthulhu 7e investigator sheet
 *
 * To add a new system: add an entry to systemTabs below. No other changes needed.
 */

import StatsTab    from './tabs/StatsTab.vue'
import ActionsTab  from './tabs/ActionsTab.vue'
import SpellsTab   from './tabs/SpellsTab.vue'
import InventoryTab from './tabs/InventoryTab.vue'
import FeaturesTab from './tabs/FeaturesTab.vue'
import JournalTab  from './tabs/JournalTab.vue'
import BuildTab    from './tabs/BuildTab.vue'
import TreeTab     from './tabs/TreeTab.vue'

export default {
  name: 'CharacterSheet',

  components: {
    StatsTab,
    ActionsTab,
    SpellsTab,
    InventoryTab,
    FeaturesTab,
    JournalTab,
    BuildTab,
    TreeTab,
  },

  props: {
    creature: {
      type: Object,
      default: null,
    },
  },

  data() {
    return {
      activeTab: 'stats',
    }
  },

  computed: {
    visibleTabs() {
      const system = this.creature?.gameSystem

      // System-specific tab overrides (Mod 8: data-driven tabs; Mod 1: gameSystem read)
      // Each entry: { id, label, icon, component, show }
      // 'show: false' entries are filtered out, so conditionals stay here and stay readable.
      const systemTabs = {
        coc7e: [
          { id: 'stats',     label: 'Investigator', icon: 'mdi-account',           component: 'StatsTab',     show: true },
          { id: 'actions',   label: 'Actions',       icon: 'mdi-lightning-bolt',    component: 'ActionsTab',   show: true },
          { id: 'inventory', label: 'Possessions',   icon: 'mdi-briefcase',         component: 'InventoryTab', show: true },
          { id: 'features',  label: 'Backstory',     icon: 'mdi-book-account',      component: 'FeaturesTab',  show: true },
          { id: 'journal',   label: 'Journal',        icon: 'mdi-book-open-variant', component: 'JournalTab',   show: true },
          { id: 'build',     label: 'Build',          icon: 'mdi-wrench',            component: 'BuildTab',     show: true },
          { id: 'tree',      label: 'Tree',           icon: 'mdi-file-tree',         component: 'TreeTab',      show: !!this.creature?.settings?.showTreeTab },
        ],
      }

      // Return system-specific tabs if defined, otherwise fall back to D&D default
      if (system && systemTabs[system]) {
        return systemTabs[system].filter(tab => tab.show)
      }

      // Default D&D 5e tab set (existing behavior, unchanged)
      return [
        { id: 'stats',     label: 'Stats',     icon: 'mdi-chart-box',         component: 'StatsTab',     show: true },
        { id: 'actions',   label: 'Actions',   icon: 'mdi-lightning-bolt',     component: 'ActionsTab',   show: true },
        { id: 'spells',    label: 'Spells',    icon: 'mdi-fire',               component: 'SpellsTab',    show: !this.creature?.settings?.hideSpellsTab },
        { id: 'inventory', label: 'Inventory', icon: 'mdi-cube',               component: 'InventoryTab', show: true },
        { id: 'features',  label: 'Features',  icon: 'mdi-text',               component: 'FeaturesTab',  show: true },
        { id: 'journal',   label: 'Journal',   icon: 'mdi-book-open-variant',  component: 'JournalTab',   show: true },
        { id: 'build',     label: 'Build',     icon: 'mdi-wrench',             component: 'BuildTab',     show: true },
        { id: 'tree',      label: 'Tree',      icon: 'mdi-file-tree',          component: 'TreeTab',      show: !!this.creature?.settings?.showTreeTab },
      ].filter(tab => tab.show)
    },

    activeTabComponent() {
      // Resolve which component name to render
      const tab = this.visibleTabs.find(t => t.id === this.activeTab)
      return tab?.component ?? this.visibleTabs[0]?.component ?? null
    },
  },

  watch: {
    visibleTabs(newTabs) {
      // When visibleTabs recomputes (e.g. creature.gameSystem changed via Edit dialog),
      // fall back to the first tab if the previously active tab is no longer visible.
      // This is the reactive guard for mid-session game system switching.
      const stillVisible = newTabs.find(t => t.id === this.activeTab)
      if (!stillVisible && newTabs.length > 0) {
        this.activeTab = newTabs[0].id
      }
    },
  },
}
</script>

<style scoped>
.character-sheet {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tab-bar {
  display: flex;
  gap: 2px;
  border-bottom: 2px solid #444;
  padding: 0 8px;
  background: #1e1e1e;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  color: #aaa;
  cursor: pointer;
  font-size: 0.875rem;
  transition: color 0.15s, border-color 0.15s;
}

.tab-btn:hover {
  color: #fff;
}

.tab-btn.active {
  color: #fff;
  border-bottom-color: #c09;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
</style>
