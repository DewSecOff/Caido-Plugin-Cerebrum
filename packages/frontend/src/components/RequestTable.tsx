import React, { useRef, useState, useCallback } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ContextMenu } from "primereact/contextmenu";
import type { CerebrumEntry } from "../../../backend/src/index";
import "../styles/index.css";

// On ne considère que CerebrumEntry (qui contient reqRaw, etc.)
export type Request = CerebrumEntry;

export interface RequestTableProps {
  requests: Request[];
  onSelect: (req: Request) => void;
  onDeleteRequest: (id: string) => void;
}

export default function RequestTable({
  requests,
  onSelect,
  onDeleteRequest,
}: RequestTableProps) {
  const cm = useRef<ContextMenu>(null);
  const [selectedRow, setSelectedRow] = useState<Request | undefined>(undefined);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [contextRow, setContextRow] = useState<Request | undefined>(undefined);

  const formatDate = useCallback((iso: string) =>
    iso.replace("T", " ").replace(/\.000Z$/, ""),
  [],);

  const truncateNote = useCallback((note: string) => {
    if (!note) return "";
    return note.length > 5 ? note.slice(0, 5) + "..." : note;
  }, []);

  const contextItems = [
     {
      label: "🗑️ Delete",
      command: () => contextRow && onDeleteRequest(contextRow.id),
    },
  ];

  const onRowRightClick = (event: any) => {
    event.originalEvent.preventDefault();
    // On met à jour uniquement contextRow
     setContextRow(event.data);
     cm.current?.show(event.originalEvent);
  };

  const onRowClick = (event: any) => {
    setSelectedRow(event.data);
    onSelect(event.data);
  };

  const getPendingStyles = useCallback((pending: string): React.CSSProperties => {
    switch (pending) {
      case "Pending":
        return { color: "#000", backgroundColor: "#ffff00" };
      case "Finished":
        return { color: "#fff", backgroundColor: "#008000" };
      case "Important":
        return { color: "#fff", backgroundColor: "#ff0000" };
      default:
        return {};
    }
  }, []);

  return (
    <>
     <ContextMenu
        model={contextItems}
        ref={cm}
        appendTo={document.body}
        style={{
          position: "fixed",
          top: menuPos.y,
          left: menuPos.x,
          margin: 0,
          padding: "4px 8px",
          listStyle: "none",
          background: "#2d2d2d",
          color: "#fff",
          border: "1px solid #555",
          borderRadius: 4,
          zIndex: 10000,
          minWidth: 160,
        }}
      />

        <DataTable
  resizableColumns
  columnResizeMode="fit"
  value={requests}
  rowClassName={(rowData) => {
          switch (rowData.pending) {
            case "Pending":
              return "row-pending";
            case "Finished":
              return "row-finished";
            case "Important":
              return "row-important";
            default:
              return "bg-[#30333B] text-white";
          }
        }}
  onRowClick={onRowClick}
  selectionMode="single"            // sélection de ligne normale
  dataKey="id"
  onContextMenu={onRowRightClick}
  contextMenuSelection={selectedRow} // highlighted row dans votre menu
  className="w-full"
  selection={selectedRow}
  sortMode="multiple"
  tableStyle={{ tableLayout: 'fixed', width: '100%' }}
  removableSort
>
        <Column field="id" header="ID" sortable resizeable style={{ width: '3%' }}/>
        <Column
          field="time"
          header="Time"
          body={(row) => formatDate(row.time)}
          sortable
          sortField="time"
          resizeable
          style={{ width: '12%' }}
        />
        <Column field="method" header="Method" sortable resizeable style={{ width: '6%' }}/>
        <Column field="host" header="Host" sortable resizeable style={{ width: '14%' }}/>
        <Column
          header="Path"
          field="path"               // nécessaire pour le style par défaut
          sortField="url"            // on trie sur row.url (chemin + paramètres)
          sortable
          resizeable
          body={(row: Request) => {
            if (!row.url) return row.path;
            try {
              const u = new URL(row.url);
              return `${u.pathname}${u.search}`;
            } catch {
              return row.path;
            }
          }}
        />
        <Column field="port" header="Port" sortable resizeable style={{ width: '5%' }}/>
        <Column field="reqLength" header="Req Length" sortable resizeable style={{ width: '6%' }}/>

        {/* Champ « Pending » si vous le gardez */}
        <Column
          field="pending"
          header="Pending"
          body={(row) => row.pending}
          sortable
          resizeable
          style={{ width: '8%' }}
        />

        <Column
          field="note"
          header="Note"
          style={{ width: '4%' }}
          resizeable
          body={(row) => (
            <span className="truncate block max-w-[80px]" title={row.note}>
              {row.note}
            </span>
          )}
        />
      </DataTable>
    </>
  );
}
