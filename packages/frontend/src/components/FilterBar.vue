<template>
  <!-- Filter toolbar with status dropdown, search input, field selection, and apply button -->
  <div class="flex gap-2 p-2 items-center border-b border-surface-300 dark:border-surface-600 flex-wrap">
    
    <!-- Dropdown to filter by HTTP response status -->
    <Dropdown
      v-model="selectedStatus"
      :options="props.statusOptions"
      placeholder="Status"
      class="w-[120px]"
    />

    <!-- Input for free-text search -->
    <InputText v-model="search" placeholder="Search..." class="w-[250px]" />

    <!-- Multi-select dropdown to choose which fields are included in the search -->
    <MultiSelect
      v-model="selectedFields"
      :options="allFields"
      optionLabel="label"
      placeholder="Fields"
      class="w-[200px]"
      display="chip"
    />

    <!-- Apply button to emit selected filters -->
    <Button label="Apply" @click="onApply" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Dropdown from "primevue/dropdown";
import InputText from "primevue/inputtext";
import MultiSelect from "primevue/multiselect";
import Button from "primevue/button";

// Current selected status filter
const selectedStatus = ref<string>("All");

// Current search string
const search = ref("");

// Props: list of available status options (e.g. ["200", "404", "All"])
const props = defineProps<{
  statusOptions: string[];
}>();

// All available fields for filtering/searching
const allFields = [
  "id",
  "time",
  "method",
  "host",
  "path",
  "port",
  "status",
  "reqLength",
  "respLength",
  "pending",
  "note",
].map((f) => ({ label: f, value: f }));

// Currently selected fields to apply search on
const selectedFields = ref<{ label: string; value: string }[]>([
  { label: "id", value: "id" },
  { label: "time", value: "time" },
  { label: "method", value: "method" },
  { label: "host", value: "host" },
  { label: "path", value: "path" },
  { label: "port", value: "port" },
  { label: "status", value: "status" },
  { label: "reqLength", value: "reqLength" },
  { label: "respLength", value: "respLength" },
  { label: "pending", value: "pending" },
  { label: "note", value: "note" },
]);

// Emits updated filter values to the parent component
const emit = defineEmits<{
  (e: "update-filters", filters: { status?: string; search: string; fields: string[] }): void;
}>();

// Called when user clicks "Apply"
const onApply = () => {
  emit("update-filters", {
    status: selectedStatus.value === "All" ? undefined : selectedStatus.value,
    search: search.value,
    fields: selectedFields.value.map((f) => f.value),
  });
};
</script>
