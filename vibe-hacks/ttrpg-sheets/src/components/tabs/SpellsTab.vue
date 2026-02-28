<template>
  <div class="spells-tab">
    <!-- D&D 5e only — this tab is omitted from the CoC tab list entirely. -->
    <div class="placeholder">
      <p>Spells — spell list, prepared spells, and spell slots.</p>
      <p><em>Add spells via the Build tab.</em></p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SpellsTab',
  props: {
    creature: { type: Object, default: null },
  },
}
</script>
