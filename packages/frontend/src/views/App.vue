<script setup lang="ts">
import { ref, onMounted } from "vue";
import CerebrumView from "@/views/CerebrumView.vue";
import { useSDK } from "@/plugins/sdk";

// Initialize Caido SDK
const sdk = useSDK();

// Holds currently selected request (currently unused)
const selectedRequest = ref<any>(null);

// Function to fetch the currently selected request in Caido (disabled)
const fetchSelectedRequest = async () => {
  // const request = await sdk.selection.getSelectedRequest();
  // selectedRequest.value = request;
};

// Called once when the component is mounted
onMounted(() => {
  // fetchSelectedRequest();
  // setInterval(fetchSelectedRequest, 1000); // Poll every second
});
</script>

<template>
  <!-- Main view for organizing and viewing HTTP requests -->
  <CerebrumView />
</template>
