<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Cfr } from '../types';

const props = defineProps<{ cfrs: Cfr[]; total: number; page: number; pageSize: number; loading: boolean }>();
const emit = defineEmits<{ page: [page: number]; pageSize: [size: number] }>();

const root = ref<HTMLElement>();
const fmt = (iso: string) => new Date(iso).toLocaleString();
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
const from = computed(() => (props.total ? (props.page - 1) * props.pageSize + 1 : 0));
const to = computed(() => Math.min(props.page * props.pageSize, props.total));

// First, last and a window around the current page; '…' fills the gaps.
const pages = computed<(number | '…')[]>(() => {
  const last = pageCount.value;
  const keep = new Set([1, last, props.page - 1, props.page, props.page + 1].filter((n) => n >= 1 && n <= last));
  const out: (number | '…')[] = [];
  let prev = 0;
  for (const n of [...keep].sort((a, b) => a - b)) {
    if (n - prev > 1) out.push('…');
    out.push(n);
    prev = n;
  }
  return out;
});

// The pager sits below a long list; without this the viewport stays at the bottom after
// clicking and the change is easy to miss.
watch(
  () => props.page,
  () => root.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
);
</script>

<template>
  <section ref="root" :class="{ loading }">
    <header class="list-head">
      <h2>Reports</h2>
      <span class="count">Showing {{ from }}–{{ to }} of {{ total }}</span>
    </header>
    <p v-if="!cfrs.length && !loading" class="empty">No reports match.</p>
    <ul>
      <li v-for="c in cfrs" :key="c.id">
        <div class="row">
          <strong>{{ c.title }}</strong>
          <span :class="['badge', c.severity]">{{ c.severity }}</span>
        </div>
        <div class="meta">{{ c.location }} · {{ c.status.replace('_', ' ') }} · {{ fmt(c.created_at) }}</div>
        <p v-if="c.description" class="desc">{{ c.description }}</p>
        <!-- Shown beside, never instead of, the reporter's values. Rendered with {{ }} (escaped text),
             since the summary derives from user-written text. -->
        <div v-if="c.ai_suggestion" class="ai">
          <span class="ai-label">AI suggestion</span>
          <span :class="['badge', c.ai_suggestion.severity]">{{ c.ai_suggestion.severity }}</span>
          <span class="ai-category">{{ c.ai_suggestion.category }}</span>
          <span v-if="c.ai_suggestion.severity !== c.severity" class="ai-diff" title="The AI's severity differs from the severity you chose">differs from reported</span>
          <span class="ai-summary">{{ c.ai_suggestion.summary }}</span>
        </div>
      </li>
    </ul>

    <nav class="pager" aria-label="Pagination">
      <div class="pages">
        <button class="btn" :disabled="page <= 1" @click="emit('page', page - 1)">‹ Prev</button>
        <template v-for="(p, i) in pages" :key="i">
          <span v-if="p === '…'" class="gap">…</span>
          <button v-else class="btn page" :class="{ active: p === page }" :aria-current="p === page ? 'page' : undefined" @click="emit('page', p)">
            {{ p }}
          </button>
        </template>
        <button class="btn" :disabled="page >= pageCount" @click="emit('page', page + 1)">Next ›</button>
      </div>
      <label class="per-page">
        Per page
        <select :value="pageSize" @change="emit('pageSize', Number(($event.target as HTMLSelectElement).value))">
          <option v-for="n in [5, 10, 25, 50]" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
    </nav>
  </section>
</template>
