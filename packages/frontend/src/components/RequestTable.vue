<template>
  <!-- Context menu shown on right-click -->
  <ContextMenu ref="contextMenu" :model="contextItems" />

  <!-- Request table displaying HTTP traffic with selectable rows -->
  <DataTable
    :value="filtered"
    :rowStyle="getRowStyle"
    @row-click="onSelect"
    selectionMode="single"
    dataKey="id"
    @row-contextmenu="onRowRightClick"
  >
    <!-- Column definitions -->
    <Column field="id" header="ID" />
    <Column header="Time">
      <template #body="slotProps">
        {{ formatDate(slotProps.data.time) }}
      </template>
    </Column>
    <Column field="method" header="Method" />
    <Column field="host" header="Host" />
    <Column field="path" header="Path" />
    <Column field="port" header="Port" />
    <Column field="status" header="Status" />
    <Column field="reqLength" header="Req Length" />
    <Column field="respLength" header="Resp Length" />
    <Column field="pending" header="Pending" />
    <Column header="Note">
      <template #body="slotProps">
        <span class="truncate block max-w-[80px]" title="slotProps.data.note">
          {{ truncateNote(slotProps.data.note) }}
        </span>
      </template>
    </Column>
  </DataTable>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import ContextMenu from "primevue/contextmenu";
import Button from "primevue/button";
import { useSDK } from "@/plugins/sdk"; // Optional use of SDK if needed

// Props passed into the component
const props = defineProps<{
  requests: any[];
  filters: {
    status?: string;
    search: string;
    fields: string[];
  };
}>();

// Modify the date displayed
function formatDate(iso: string): string {
  return iso.replace("T", " ").replace(/\.000Z$/, "");
}

// Modify the note displayed
function truncateNote(note: string): string {
  if (!note) return "";
  return note.length > 5 ? note.slice(0, 5) + "..." : note;
}

// Emit custom events to parent
const emit = defineEmits<{
  (e: "select", request: any): void;
  (e: "delete-request", id: string): void;
  // (e: "send-to-replay", payload: { raw: string; isTls: boolean }): void;
}>();

const sdk = useSDK();

// Determine row background color based on 'pending' status
const getRowStyle = (request: any) => {
  switch (request.pending) {
    case "Pending":
      return { backgroundColor: "#facc15", color: "#000000" }; // Yellow
    case "Finished":
      return { backgroundColor: "#1e9e40", color: "#000000" }; // Green
    case "Important":
      return { backgroundColor: "#ff0000", color: "#ffffff" }; // Red
    default:
      return {};
  }
};

// Context menu logic
const contextMenu = ref();
const selectedRow = ref<any>(null);

// Show context menu on right-click
const onRowRightClick = (event: any) => {
  selectedRow.value = event.data;
  contextMenu.value.show(event.originalEvent);
};

// Context menu items
const contextItems = [
  {
    label: "🗑️ Delete request",
    command: () => {
      if (selectedRow.value) {
        emit("delete-request", selectedRow.value.id);
      }
    },
  },
  /*
  {
    label: "📤 Send to Replay",
    command: () => {
      if (selectedRow.value) {
        emit("send-to-replay", {
          raw: selectedRow.value.reqRaw,
          isTls: selectedRow.value.isTls,
        });
      }
    },
  },
  */
];

// Computed list of filtered requests based on search and status
const filtered = computed(() => {
  const { status, search, fields } = props.filters;
  const loweredSearch = search.trim().toLowerCase();

  return props.requests.filter((r) => {
    if (status && String(r.status) !== status) return false;
    if (!loweredSearch) return true;
    if (!fields || fields.length === 0) return true;

    return fields.some((field) => {
      const value = r[field];
      const valueStr = value !== null && value !== undefined ? String(value).toLowerCase() : "";
      return valueStr.includes(loweredSearch);
    });
  });
});

// Emit selected row to parent when clicked
const onSelect = (event: any) => {
  emit("select", event.data);
};
</script>