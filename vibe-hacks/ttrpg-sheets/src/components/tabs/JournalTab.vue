<template>
  <div class="journal-tab">
    <!-- Session notes, character diary — same for all game systems -->
    <div class="placeholder">
      <p>Journal — session notes and character diary entries.</p>
      <p><em>Write notes here during play.</em></p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'JournalTab',
  props: {
    creature: { type: Object, default: null },
  },
}
</script>
