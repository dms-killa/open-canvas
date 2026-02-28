<template>
  <div class="actions-tab">
    <!-- Actions: attacks, special actions, bonus actions, reactions -->
    <!-- Label is 'Actions' for D&D, also 'Actions' for CoC (unchanged) -->
    <div class="placeholder">
      <p>Actions tab — attacks, special abilities, and reactions.</p>
      <p><em>Add actions via the Build tab.</em></p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ActionsTab',
  props: {
    creature: { type: Object, default: null },
  },
}
</script>
