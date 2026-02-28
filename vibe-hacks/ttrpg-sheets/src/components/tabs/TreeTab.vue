<template>
  <div class="tree-tab">
    <!--
      Tree tab: optional, shown only when creature.settings.showTreeTab is true.
      Renders a hierarchical view of all properties (useful for power users).
    -->
    <div class="placeholder">
      <p>Tree — hierarchical view of all character properties.</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TreeTab',
  props: {
    creature: { type: Object, default: null },
  },
}
</script>
