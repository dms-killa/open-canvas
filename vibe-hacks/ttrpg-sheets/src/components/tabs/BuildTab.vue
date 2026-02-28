<template>
  <div class="build-tab">
    <!-- Build tab: add/edit/delete properties, apply libraries, set gameSystem -->
    <div class="placeholder">
      <p>Build — manage properties, apply ruleset libraries, configure character.</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BuildTab',
  props: {
    creature: { type: Object, default: null },
  },
}
</script>
