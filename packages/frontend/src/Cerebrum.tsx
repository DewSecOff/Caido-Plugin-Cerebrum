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

export default function Cerebrum() {
  const sdk = useSDK();
  
  const [detailHeight, setDetailHeight] = useState(window.innerHeight * 0.33);

  const STATUSES = ["Not touched", "Pending", "Finished", "Important"] as const;
  type Status = typeof STATUSES[number];
  const [statusFilter, setStatusFilter] = useState<Record<Status, boolean>>(
    STATUSES.reduce((acc, s) => ({ ...acc, [s]: true }), {} as Record<Status, boolean>)
  );

  // Texte de recherche
  const [search, setSearch] = useState<string>("");

  // Toutes les requêtes chargées depuis la base SQLite
  const [allRequests, setAllRequests] = useState<CerebrumEntry[]>([]);

  // Sous-ensemble filtré selon `search`
  const [filteredRequests, setFilteredRequests] = useState<CerebrumEntry[]>([]);

  // Requête sélectionnée pour le panneau de détails
  const [selectedRequest, setSelectedRequest] = useState<CerebrumEntry | null>(null);

  // 1) Fonction qui rapatrie toutes les requêtes depuis le backend
  const reloadAll = useCallback(async () => {
    try {
      const data = await sdk.backend.getAllRequests();
      setAllRequests(data);
      // applique immédiatement le filtre existant (ou vide)
      const q = search.trim().toLowerCase();
      setFilteredRequests(
        q
          ? data.filter(r =>
              r.method.toLowerCase().includes(q) ||
              r.host.toLowerCase().includes(q)   ||
              r.path.toLowerCase().includes(q)   ||
              r.url.toLowerCase().includes(q)    ||
              r.status.toString().includes(q)    ||
              r.pending.toLowerCase().includes(q)||
              r.note.toLowerCase().includes(q)
            )
          : data
      );
    } catch (err) {
      console.error("❌ Impossible de recharger les requêtes :", err);
      sdk.window.showToast("Erreur de chargement", { duration: 3000 });
    }
  }, [sdk, search]);

  // 2) Au premier montage, on charge directement les requêtes

  
sdk.backend.onEvent("actualise", (data) => {
  reloadAll();
});

  // 3) À chaque changement de hash, si on revient sur "#/cerebrum", on recharge aussi
  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === "#/cerebrum") {
        reloadAll();
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [reloadAll]);

  // 4) Filtrage en temps réel dès que `search` change
  useEffect(() => {
    const q = search.trim().toLowerCase();
    setFilteredRequests(
      allRequests
        // 1) on garde uniquement les statuts cochés
        .filter(r => statusFilter[r.pending as keyof typeof statusFilter])
        // 2) puis on applique la recherche
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

  // 5) Sélection d'une ligne
  const selectRequest = useCallback((r: CerebrumEntry) => {
    setSelectedRequest(r);
    window.dispatchEvent(new Event("cerebrum:clear-badge"));
  }, []);

  // 6) Suppression
  const deleteRequest = useCallback(async (id: string) => {
    await sdk.backend.deleteRequest(id);
    setAllRequests(prev => prev.filter(r => r.id !== id));
    setFilteredRequests(prev => prev.filter(r => r.id !== id));
    if (selectedRequest?.id === id) setSelectedRequest(null);
    sdk.window.showToast("Requête supprimée", { duration: 2000 });
  }, [sdk, selectedRequest]);

  // 7) Sauvegarde des notes/status
  const updateRequest = useCallback(async (req: CerebrumEntry) => {
    await sdk.backend.updateRequest({ id: req.id, note: req.note, pending: req.pending });
    setAllRequests(prev => prev.map(r => (r.id === req.id ? req : r)));
    setFilteredRequests(prev => prev.map(r => (r.id === req.id ? req : r)));
    sdk.window.showToast("Modifications enregistrées", { duration: 2000 });
  }, [sdk]);

  return (
    <div className="flex flex-col h-full">
      {/* Barre de recherche ré-stylée */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative max-w-md mx-auto">
          {/* Icône de loupe */}
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <i className="pi pi-search" />
          </span>
          {/* Input stylisé */}
          <InputText
            value={search}
            onChange={e => setSearch(e.currentTarget.value)}
            placeholder="Search"
            className="
              w-full
              pl-10 pr-4 py-2
              bg-white dark:bg-gray-800
              border border-gray-300 dark:border-gray-600
              rounded-lg
              text-gray-900 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-blue-500
              transition-colors
            "
         />
        </div>
      </div>
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
    {STATUSES.map((st) => (
      <label key={st} className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={statusFilter[st]}
          onChange={() =>
            setStatusFilter((prev) => ({ ...prev, [st]: !prev[st] }))
          }
          className="form-checkbox h-4 w-4 text-blue-500"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {st}
        </span>
      </label>
    ))}
  </div>

      {/* Tableau des requêtes */}
      <div className="flex-1 overflow-auto">
        <RequestTable
          requests={filteredRequests}
          onSelect={selectRequest}
          onDeleteRequest={deleteRequest}
        />
      </div>

      {/* Détails (1/3 de la hauteur, redimensionnable) */}
      {selectedRequest && (
        <Resizable
          axis="y"
          height={detailHeight}
          width={0}
          resizeHandles={["n"]}               /* nord = poignée en haut */
          handle={                           /* poignée personnalisée */
            <span className="custom-handle-n" />
          }
          onResize={(_e, { size }) => {
            setDetailHeight(size.height);
          }}
          minConstraints={[0, window.innerHeight * 0.2]}
          maxConstraints={[0, window.innerHeight * 0.8]}
        >
          <div
            className="relative border-t mt-2 overflow-auto"
            style={{ height: detailHeight }}
          >
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
