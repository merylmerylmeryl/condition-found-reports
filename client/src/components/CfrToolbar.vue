<script setup lang="ts">
import { ref, watch } from 'vue';
import { severities, sortKeys, statuses, type CfrQuery } from '../types';

// The parent owns the query; this component only edits it (v-model).
const query = defineModel<CfrQuery>({ required: true });
defineProps<{ exporting: boolean }>();
const emit = defineEmits<{ export: [] }>();

// Typing updates a local copy immediately (responsive input) but only pushes to the
// query after a pause, so we don't fire a request per keystroke.
const search = ref(query.value.q);
let timer: ReturnType<typeof setTimeout> | undefined;
watch(search, (v) => {
  clearTimeout(timer);
  timer = setTimeout(() => (query.value = { ...query.value, q: v.trim(), page: 1 }), 300);
});

// Any filter/sort change returns to page 1; staying on page 7 of a now-smaller
// result set would show an empty page.
const update = (patch: Partial<CfrQuery>) => (query.value = { ...query.value, ...patch, page: 1 });

function toggle<T extends string>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function reset() {
  search.value = '';
  clearTimeout(timer);
  query.value = { ...query.value, q: '', severity: [], status: [], page: 1 };
}
</script>

<template>
  <div class="card toolbar">
    <input v-model="search" class="search" type="search" placeholder="Search title, description, location…" aria-label="Search" />

    <div class="filters">
      <div class="group">
        <span class="group-label">Severity</span>
        <button
          v-for="s in severities"
          :key="s"
          type="button"
          class="chip"
          :class="{ active: query.severity.includes(s) }"
          :aria-pressed="query.severity.includes(s)"
          @click="update({ severity: toggle(query.severity, s) })"
        >
          {{ s }}
        </button>
      </div>
      <div class="group">
        <span class="group-label">Status</span>
        <button
          v-for="s in statuses"
          :key="s"
          type="button"
          class="chip"
          :class="{ active: query.status.includes(s) }"
          :aria-pressed="query.status.includes(s)"
          @click="update({ status: toggle(query.status, s) })"
        >
          {{ s.replace('_', ' ') }}
        </button>
      </div>
    </div>

    <div class="actions">
      <div class="sort">
        <label class="inline">
          Sort by
          <select :value="query.sort" @change="update({ sort: ($event.target as HTMLSelectElement).value as CfrQuery['sort'] })">
            <option v-for="k in sortKeys" :key="k" :value="k">{{ k.replace('_', ' ') }}</option>
          </select>
        </label>
        <button type="button" class="btn" @click="update({ order: query.order === 'asc' ? 'desc' : 'asc' })">
          {{ query.order === 'asc' ? '↑ Asc' : '↓ Desc' }}
        </button>
      </div>
      <div class="sort">
        <button type="button" class="btn ghost" @click="reset">Clear filters</button>
        <button type="button" class="btn primary" :disabled="exporting" @click="emit('export')">
          {{ exporting ? 'Exporting…' : 'Export PDF' }}
        </button>
      </div>
    </div>
  </div>
</template>
