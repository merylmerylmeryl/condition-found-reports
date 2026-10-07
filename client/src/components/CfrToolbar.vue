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
  <div class="toolbar">
    <input v-model="search" type="search" placeholder="Search title, description, location…" aria-label="Search" />

    <fieldset>
      <legend>Severity</legend>
      <label v-for="s in severities" :key="s" class="chip">
        <input type="checkbox" :checked="query.severity.includes(s)" @change="update({ severity: toggle(query.severity, s) })" />
        {{ s }}
      </label>
    </fieldset>

    <fieldset>
      <legend>Status</legend>
      <label v-for="s in statuses" :key="s" class="chip">
        <input type="checkbox" :checked="query.status.includes(s)" @change="update({ status: toggle(query.status, s) })" />
        {{ s.replace('_', ' ') }}
      </label>
    </fieldset>

    <div class="controls">
      <label>
        Sort by
        <select :value="query.sort" @change="update({ sort: ($event.target as HTMLSelectElement).value as CfrQuery['sort'] })">
          <option v-for="k in sortKeys" :key="k" :value="k">{{ k.replace('_', ' ') }}</option>
        </select>
      </label>
      <button type="button" @click="update({ order: query.order === 'asc' ? 'desc' : 'asc' })">
        {{ query.order === 'asc' ? '↑ Asc' : '↓ Desc' }}
      </button>
      <button type="button" @click="reset">Clear filters</button>
      <button type="button" :disabled="exporting" @click="emit('export')">
        {{ exporting ? 'Exporting…' : 'Export PDF' }}
      </button>
    </div>
  </div>
</template>
