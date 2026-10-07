<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { listCfrs } from './api/cfrs';
import CfrForm from './components/CfrForm.vue';
import CfrList from './components/CfrList.vue';
import type { Cfr } from './types';

// State is local to App and passed down via props/events. Pinia/router would be
// overkill for one screen.
const cfrs = ref<Cfr[]>([]);
const loadError = ref('');

onMounted(async () => {
  try {
    cfrs.value = await listCfrs();
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load reports';
  }
});

// Use the server's response (with its created_at) rather than our own copy.
const onCreated = (cfr: Cfr) => cfrs.value.unshift(cfr);
</script>

<template>
  <main>
    <h1>Condition Found Reports</h1>
    <p v-if="loadError" class="error">{{ loadError }}</p>
    <div class="layout">
      <CfrForm @created="onCreated" />
      <CfrList :cfrs="cfrs" />
    </div>
  </main>
</template>
