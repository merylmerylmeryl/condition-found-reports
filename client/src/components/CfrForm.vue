<script setup lang="ts">
import { reactive, ref } from 'vue';
import { createCfr } from '../api/cfrs';
import { severities, type Cfr, type Severity } from '../types';

const emit = defineEmits<{ created: [cfr: Cfr] }>();

const blank = () => ({ title: '', description: '', location: '', severity: 'low' as Severity });
const form = reactive(blank());
const submitting = ref(false);
const error = ref('');

// The id is generated when the form is first shown and only replaced after a
// successful save. If the request times out and the user clicks again, the SAME id is
// resent, so the server rejects the duplicate (409) instead of storing two reports.
let id = crypto.randomUUID();

async function submit() {
  submitting.value = true;
  error.value = '';
  try {
    const cfr = await createCfr({ id, ...form });
    emit('created', cfr);
    Object.assign(form, blank());
    id = crypto.randomUUID();
  } catch (e) {
    // 409 here means an earlier attempt with this id actually succeeded.
    error.value = e instanceof Error ? e.message : 'Something went wrong';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form @submit.prevent="submit">
    <h2>New report</h2>
    <label>Title <input v-model="form.title" required maxlength="200" /></label>
    <label>Location on ship <input v-model="form.location" required maxlength="200" placeholder="e.g. Deck 3, frame 42" /></label>
    <label>
      Severity
      <select v-model="form.severity">
        <option v-for="s in severities" :key="s" :value="s">{{ s }}</option>
      </select>
    </label>
    <label>Description <textarea v-model="form.description" rows="4" /></label>
    <p v-if="error" class="error">{{ error }}</p>
    <button :disabled="submitting">{{ submitting ? 'Saving…' : 'Submit report' }}</button>
  </form>
</template>
