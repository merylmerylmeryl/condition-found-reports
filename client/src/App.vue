<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { exportPdf, listCfrs } from './api/cfrs';
import CfrForm from './components/CfrForm.vue';
import CfrList from './components/CfrList.vue';
import CfrToolbar from './components/CfrToolbar.vue';
import type { CfrPage, CfrQuery } from './types';

// State is local to App and passed down via props/events. Pinia/router would be
// overkill for one screen.
const query = ref<CfrQuery>({ q: '', severity: [], status: [], sort: 'created_at', order: 'desc', page: 1, pageSize: 10 });
const result = ref<CfrPage>({ items: [], total: 0, page: 1, pageSize: 10 });
const loading = ref(false);
const error = ref('');
const exporting = ref(false);

// Only the latest request may write results. Without this, a slow earlier response
// (e.g. for "ab") could land after a newer one (for "abc") and show stale data.
let controller: AbortController | undefined;
async function load() {
  controller?.abort();
  const ctl = (controller = new AbortController());
  loading.value = true;
  try {
    result.value = await listCfrs(query.value, ctl.signal);
    error.value = '';
  } catch (e) {
    if ((e as Error).name === 'AbortError') return;
    error.value = e instanceof Error ? e.message : 'Failed to load reports';
  } finally {
    // Use this call's own controller: an aborted call must not clear the newer call's spinner.
    if (!ctl.signal.aborted) loading.value = false;
  }
}

// Reload whenever any part of the query changes. deep: query holds arrays.
watch(query, load, { deep: true });
onMounted(load);

// A new report may not belong on the current page/filters, so refetch from the server
// instead of splicing it into local state.
const onCreated = () => load();

async function onExport() {
  exporting.value = true;
  try {
    await exportPdf(query.value);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Export failed';
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <main>
    <h1>Condition Found Reports</h1>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="layout">
      <CfrForm @created="onCreated" />
      <div class="main-col">
        <CfrToolbar v-model="query" :exporting="exporting" @export="onExport" />
        <CfrList
          :cfrs="result.items"
          :total="result.total"
          :page="query.page"
          :page-size="query.pageSize"
          :loading="loading"
          @page="(p) => (query = { ...query, page: p })"
          @page-size="(n) => (query = { ...query, pageSize: n, page: 1 })"
        />
      </div>
    </div>
  </main>
</template>
