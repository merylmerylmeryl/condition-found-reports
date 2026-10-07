<script setup lang="ts">
import type { Cfr } from '../types';

defineProps<{ cfrs: Cfr[] }>();

const fmt = (iso: string) => new Date(iso).toLocaleString();
</script>

<template>
  <section>
    <h2>Reports ({{ cfrs.length }})</h2>
    <p v-if="!cfrs.length">No reports yet.</p>
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
  </section>
</template>
