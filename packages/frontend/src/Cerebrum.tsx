// src/Cerebrum.tsx

import React, { useState, useEffect, useCallback } from "react";
import { InputText } from "primereact/inputtext";
import RequestTable from "./components/RequestTable";
import RequestDetails from "./components/RequestDetails";
import { useSDK } from "./plugins/sdk";
import type { BackendAPI, BackendEvents, CerebrumEntry } from "../../backend/src/index";
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';
import { Caido } from "@caido/sdk-frontend";

export type CaidoSDK = Caido<BackendAPI, BackendEvents>;

export interface CerebrumProps {
  initialRequests: CerebrumEntry[];
}


export default function Cerebrum({ initialRequests }: CerebrumProps) {
  const sdk = useSDK();

  // États
  const [allRequests, setAllRequests] = useState<CerebrumEntry[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Record<string, boolean>>({
    "Not touched": true,
    "Pending": true,
    "Finished": true,
    "Important": true,
  });
  const [filteredRequests, setFilteredRequests] = useState<CerebrumEntry[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CerebrumEntry | null>(null);
  const [detailHeight, setDetailHeight] = useState(window.innerHeight * 0.33);

  // Fonction de chargement
  const reloadAll = useCallback(async () => {
    try {
      const data = await sdk.backend.getAllRequests();
      setAllRequests(data);
    } catch (err) {
      console.error(err);
    }
  }, [sdk.backend]);

  // 1) Chargement initial
  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  // 2) Reload à chaque retour sur la page via hashchange
  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === "#/cerebrum") {
        reloadAll();
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [reloadAll]);

  // 3) Recharge automatique quand le backend émet un nouvel événement
  useEffect(() => {
    const handler = () => {
      reloadAll();
    };
    sdk.backend.onEvent("new-request", handler);
    return () => {
      sdk.backend.onEvent("new-request", handler);
    };
  }, [sdk.backend, reloadAll]);

  // 4) Filtrage search + status
  useEffect(() => {
    const q = search.trim().toLowerCase();
    setFilteredRequests(
      allRequests
        .filter(r => statusFilter[r.pending])
        .filter(r => {
          if (!q) return true;
          return (
            r.method.toLowerCase().includes(q) ||
            r.host.toLowerCase().includes(q)   ||
            r.path.toLowerCase().includes(q)   ||
            r.url.toLowerCase().includes(q)    ||
            r.status.toString().includes(q)    ||
            r.pending.toLowerCase().includes(q)||
            r.note.toLowerCase().includes(q)
          );
        })
    );
  }, [allRequests, search, statusFilter]);

  // Sélection
  const selectRequest = useCallback((r: CerebrumEntry) => {
    setSelectedRequest(r);
    window.dispatchEvent(new Event("cerebrum:clear-badge"));
  }, []);

  // Suppression
  const deleteRequest = useCallback(async (id: string) => {
    await sdk.backend.deleteRequest(id);
    setAllRequests(prev => prev.filter(r => r.id !== id));
    setFilteredRequests(prev => prev.filter(r => r.id !== id));
    if (selectedRequest?.id === id) setSelectedRequest(null);
    sdk.window.showToast("Requête supprimée", { duration: 2000 });
  }, [sdk, selectedRequest]);

  // Update note/pending
  const updateRequest = useCallback(async (req: CerebrumEntry) => {
    await sdk.backend.updateRequest({ id: req.id, note: req.note, pending: req.pending });
    setAllRequests(prev => prev.map(r => (r.id === req.id ? req : r)));
    setFilteredRequests(prev => prev.map(r => (r.id === req.id ? req : r)));
    sdk.window.showToast("Modifications enregistrées", { duration: 2000 });
  }, [sdk]);

  const STATUSES = ["Not touched", "Pending", "Finished", "Important"];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative max-w-md mx-auto flex items-center">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <i className="pi pi-search" />
          </span>
          <InputText
            value={search}
            onChange={e => setSearch(e.currentTarget.value)}
            placeholder="Search"
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-4">
          {STATUSES.map(st => (
            <label key={st} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={statusFilter[st]}
                onChange={() => setStatusFilter(prev => ({ ...prev, [st]: !prev[st] }))}
                className="form-checkbox h-4 w-4 text-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{st}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <RequestTable
          requests={filteredRequests}
          onSelect={selectRequest}
          onDeleteRequest={deleteRequest}
        />
      </div>

      {selectedRequest && (
        <Resizable
          axis="y"
          height={detailHeight}
          width={0}
          resizeHandles={["n"]}
          handle={<span className="custom-handle-n" />}
          onResize={(_e, { size }) => setDetailHeight(size.height)}
          minConstraints={[0, window.innerHeight * 0.2]}
          maxConstraints={[0, window.innerHeight * 0.8]}
        >
          <div className="relative border-t mt-2 overflow-auto" style={{ height: detailHeight }}>
            <RequestDetails
              request={selectedRequest}
              onSaveNote={updateRequest}
              onClose={() => setSelectedRequest(null)}
            />
          </div>
        </Resizable>
      )}
    </div>
  );
}
