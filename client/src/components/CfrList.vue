<script setup lang="ts">
import { computed } from 'vue';
import type { Cfr } from '../types';

const props = defineProps<{ cfrs: Cfr[]; total: number; page: number; pageSize: number; loading: boolean }>();
const emit = defineEmits<{ page: [page: number]; pageSize: [size: number] }>();

const fmt = (iso: string) => new Date(iso).toLocaleString();
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
</script>

<template>
  <section :class="{ loading }">
    <h2>Reports ({{ total }})</h2>
    <p v-if="!cfrs.length && !loading">No reports match.</p>
    <ul>
      <li v-for="c in cfrs" :key="c.id">
        <div class="row">
          <strong>{{ c.title }}</strong>
          <span :class="['badge', c.severity]">{{ c.severity }}</span>
        </div>
        <div class="meta">{{ c.location }} · {{ c.status.replace('_', ' ') }} · {{ fmt(c.created_at) }}</div>
        <p v-if="c.description">{{ c.description }}</p>
      </li>
    </ul>

    <nav class="pager" aria-label="Pagination">
      <button :disabled="page <= 1" @click="emit('page', page - 1)">‹ Prev</button>
      <span>Page {{ page }} of {{ pageCount }}</span>
      <button :disabled="page >= pageCount" @click="emit('page', page + 1)">Next ›</button>
      <label>
        Per page
        <select :value="pageSize" @change="emit('pageSize', Number(($event.target as HTMLSelectElement).value))">
          <option v-for="n in [5, 10, 25, 50]" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
    </nav>
  </section>
</template>
