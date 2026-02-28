<template>
  <div class="inventory-tab">
    <!--
      D&D: 'Inventory'
      CoC: 'Possessions' (label overridden in CharacterSheet.vue tab config)
    -->
    <div class="placeholder">
      <p>Possessions / Inventory — equipment, weapons, and carried items.</p>
      <p><em>Add items via the Build tab.</em></p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'InventoryTab',
  props: {
    creature: { type: Object, default: null },
  },
}
</script>
