<template>
  <div class="features-tab">
    <!--
      D&D: 'Features' — class features, racial traits, feats
      CoC: 'Backstory' (label overridden in CharacterSheet.vue tab config)
            — occupation, personal description, ideology, significant people,
              meaningful locations, treasured possessions, traits, injuries
    -->
    <div class="placeholder">
      <p>Features / Backstory — character traits, background, and special abilities.</p>
      <p><em>Add features via the Build tab.</em></p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FeaturesTab',
  props: {
    creature: { type: Object, default: null },
  },
}
</script>
