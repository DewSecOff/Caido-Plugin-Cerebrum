<template>
  <div class="relative p-4 border-t border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 rounded">
    <!-- Header with title and close button -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-bold">Request Details</h2>
      <Button severity="danger" text rounded @click="$emit('close')" label="X" />
    </div>

    <!-- Optional metadata: HTTP response status -->
    <div class="mb-2 text-sm text-gray-600 dark:text-gray-300">
      <strong>Response Status:</strong> {{ request.status }}
    </div>

    <!-- Main content area with raw request and notes side-by-side -->
    <div class="flex gap-4 mb-4">
      <!-- Raw HTTP request (read-only) -->
      <div ref="rawBlock" class="w-3/4 flex flex-col">
        <label class="block mb-1 font-semibold">Raw Request</label>
        <Textarea
          v-model="reqRaw"
          readonly
          class="w-full resize-none h-full"
          :autoResize="false"
          :rows="computedRows"
        />
      </div>

      <!-- Notes section that mirrors the height of the raw request -->
      <div class="w-1/4 flex flex-col" :style="{ height: rawHeight + 'px' }">
        <label class="block mb-1 font-semibold">Note</label>
        <Textarea
          v-model="note"
          class="w-full resize-none h-full"
          :autoResize="false"
        />
      </div>
    </div>

    <!-- Footer with request status dropdown and save button -->
    <div class="flex items-center gap-4">
      <div class="flex-1">
        <label class="block mb-1 font-semibold">Status</label>
        <Dropdown v-model="pending" :options="pendingOptions" optionLabel="label" optionValue="value" class="w-full" />
      </div>
      <Button label="Save" class="mt-6" @click="save" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from "vue";
import Textarea from "primevue/textarea";
import Button from "primevue/button";
import Dropdown from "primevue/dropdown";

// Props passed into the component
const props = defineProps<{
  request: any;
}>();

// Events emitted by this component
const emit = defineEmits<{
  (e: "save-note", request: any): void;
  (e: "close"): void;
}>();

// Reactive state for the editable fields
const note = ref(props.request.note || "");
const pending = ref(props.request.pending || "Not touched");
const reqRaw = computed(() => props.request.reqRaw || "");

// Limit the number of rows displayed in the request textarea
const maxLines = 30;
const computedRows = computed(() => {
  const lines = reqRaw.value.split("\n").length;
  return Math.min(lines, maxLines);
});

// Dropdown options for request status
const pendingOptions = [
  { label: "Important", value: "Important" },
  { label: "Not touched", value: "Not touched" },
  { label: "Pending", value: "Pending" },
  { label: "Finished", value: "Finished" },
];

// Track rawBlock height to match note section height
const rawBlock = ref<HTMLElement | null>(null);
const rawHeight = ref(0);
let observer: ResizeObserver | null = null;

// Start observing the raw request block height
onMounted(() => {
  if (rawBlock.value) {
    observer = new ResizeObserver(() => {
      rawHeight.value = rawBlock.value?.offsetHeight || 0;
    });
    observer.observe(rawBlock.value);
  }
});

// Clean up observer on component unmount
onBeforeUnmount(() => {
  observer?.disconnect();
});

// Sync UI fields when request changes
watch(
  () => props.request,
  (newReq) => {
    note.value = newReq.note || "";
    pending.value = newReq.pending || "Not touched";
  },
  { immediate: true }
);

// Emit updated note and status to parent
const save = () => {
  if (!props.request?.id) return; // optional safeguard

  emit("save-note", {
    ...props.request,
    note: note.value,
    pending: pending.value,
  });
};
</script>

<style>
/* Ensures raw request text area is selectable */
.selectable-text {
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  cursor: text;
}
</style>
