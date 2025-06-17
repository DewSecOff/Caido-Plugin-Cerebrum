<template>
  <div class="flex flex-col h-full">
    <!-- Header section: filter bar and load button -->
    <div class="p-2 border-b border-surface-300 dark:border-surface-600 flex justify-between items-center">
      <FilterBar
        :status-options="statusOptions"
        @update-filters="applyFilters"
      />
      <Button label="Load Requests" @click="loadRequests" />
    </div>

    <!-- Table displaying filtered HTTP requests -->
    <div class="flex-1 overflow-auto">
      <RequestTable
        :requests="requests"
        :filters="filters"
        @select="selectRequest"
        @update-color="changeColor"
        @delete-request="deleteRequest"
      />
    </div>

    <!-- Details panel displayed when a request is selected -->
    <div v-if="selectedRequest" class="border-t mt-2">
      <RequestDetails
        v-if="selectedRequest"
        :request="selectedRequest"
        @save-note="updateRequest"
        @close="selectedRequest = null"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import FilterBar from "@/components/FilterBar.vue";
import RequestTable from "@/components/RequestTable.vue";
import RequestDetails from "@/components/RequestDetails.vue";
import { useSDK } from "@/plugins/sdk";
import Button from "primevue/button";

// Caido SDK access
const sdk = useSDK();

// All loaded requests
const requests = ref<any[]>([]);

// Filters applied to the request list
const filters = ref<{
  status?: string;
  search: string;
  fields: string[];
}>({
  status: undefined,
  search: "",
  fields: [
    "id", "time", "method", "host", "path", "port", "status",
    "reqLength", "respLength", "pending", "note"
  ]
});

// Request selected for detail view
const selectedRequest = ref<any | null>(null);

// Dynamically build status options for filtering
const statusOptions = computed(() => {
  const uniqueStatuses = new Set(requests.value.map(r => String(r.status)));
  return ["All", ...Array.from(uniqueStatuses).sort()];
});

// Load all requests from the backend
const loadRequests = async () => {
  //console.log("📥 Manual loading of requests");
  try {
    const result = await sdk.backend.getAllRequests();
    //console.log("🧪 Backend result:", result);
    requests.value = result;
  } catch (e) {
    console.error("❌ Failed to load requests:", e);
    sdk.window.showToast("Erreur lors du chargement des requêtes", {
      duration: 3000,
    });
  }
};

// Apply filter updates from the FilterBar
function applyFilters(newFilters: { status?: string; search: string; fields: string[] }) {
  filters.value = {
    ...filters.value,
    ...newFilters
  };
}

// Delete a request by ID and remove it from the list
const deleteRequest = async (id: string) => {
  await sdk.backend.deleteRequest(id);

  // Remove from local list
  requests.value = requests.value.filter((r) => r.id !== id);

  // 🔒 Deselect if the deleted request was selected
  if (selectedRequest.value?.id === id) {
    selectedRequest.value = null;
  }

  sdk.window.showToast("Requête supprimée", { duration: 2000 });
};

// Handle selection of a request row
const selectRequest = (req: any) => {
  selectedRequest.value = req;
};

// (Legacy) Update only the note in the request list
const updateNote = (updated: any) => {
  const index = requests.value.findIndex((r) => r.id === updated.id);
  if (index !== -1) {
    requests.value[index].note = updated.note;
    selectedRequest.value = requests.value[index];
  }
};

// Save updated note + pending status to backend and local cache
const updateRequest = async (req: any) => {
  await sdk.backend.updateRequest({
    id: req.id,
    note: req.note,
    pending: req.pending,
  });

  // Update local request list
  const index = requests.value.findIndex((r) => r.id === req.id);
  if (index !== -1) {
    requests.value[index] = { ...requests.value[index], ...req };
  }

  sdk.window.showToast("Request updated!", { duration: 2000 });
};

// Change color tag for a request (optional metadata use)
const changeColor = (requestId: string, color: string) => {
  const req = requests.value.find((r) => r.id === requestId);
  if (req) {
    req.color = color; // You can also store this in req.metadata.color if you prefer
  }
};
</script>
