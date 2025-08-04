import { useEffect, useRef, useState } from "react";
import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import { HTTPEditor } from "./httpeditor/HTTPEditor";
import type { CerebrumEntry } from "../../../backend/src/index";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "../styles/index.css";

export interface RequestDetailsProps {
  request: CerebrumEntry;
  onSaveNote: (req: CerebrumEntry) => void;
  onClose: () => void;
}

export default function RequestDetails({
  request,
  onSaveNote,
  onClose,
}: RequestDetailsProps) {
  const [note, setNote] = useState(request.note);
  const [pending, setPending] = useState(request.pending);
  const [isEditing, setIsEditing] = useState(false);
 const textareaRef = useRef<any>(null);

  useEffect(() => {
    setNote(request.note);
    setPending(request.pending);
  }, [request]);

  const handleSave = () => {
    onSaveNote({ ...request, note, pending });
  };

  const statusOptions = [
    { label: "Not touched", value: "Not touched", activeBg: "#6B7280", activeText: "#FFFFFF" }, // gray-500
    { label: "Pending",     value: "Pending",     activeBg: "#FACC15", activeText: "#000000" }, // yellow-400
    { label: "Finished",    value: "Finished",    activeBg: "#16A34A", activeText: "#FFFFFF" }, // green-600
    { label: "Important",   value: "Important",   activeBg: "#DC2626", activeText: "#FFFFFF" }, // red-600
    ];

  return (
    <div className="p-4 bg-white dark:bg-surface-800 rounded h-full flex flex-col">
      {/* Header: gauche = titre, droite = Note */}
      <div className="flex items-center mb-4">
        <h2 className="text-lg font-bold flex-1">Request Details</h2>
        <h2 className="text-lg font-bold flex-1 text-left">&nbsp;&nbsp;&nbsp;Note</h2>
      </div>

      {/* Contenu principal */}
      <div className="flex flex-1 h-full gap-4 overflow-hidden">
        {/* Gauche : éditeur HTTP */}
        <div className="flex-1 border rounded overflow-hidden h-full">
          <HTTPEditor
            type="request"
            value={request.reqRaw}
            style={{ height: "100%" }}
            removeHeader
            removeFooter
          />
        </div>

        {/* Droite : note, status, save */}
        <div className="flex flex-col flex-1 h-full">
          {/* Note → 6 parts sur 8 (75%) */}
          <div className="flex-6 p-2 overflow-auto h-full">
            {isEditing ? (
              <InputTextarea
                ref={textareaRef}
                value={note}
                onChange={(e) => setNote(e.currentTarget.value)}
                onBlur={() => setIsEditing(false)}
                rows={10}
                className="
                  w-full h-full resize-none bg-gray-100 dark:bg-gray-700 rounded p-2 border border-white
                "
              />
            ) : (
              <div
                className="markdown-body prose prose-sm max-w-none cursor-text w-full overflow-y-auto rounded p-2 border border-white"
                onClick={() => setIsEditing(true)}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {note || "_Empty_"}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Status (1/8 de la hauteur) */}
          <div className="flex-1 p-2 flex">
            <div className="flex w-full h-full gap-2">
              {statusOptions.map((opt) => {
                const isActive = pending === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setPending(opt.value)}
                    className="flex-1 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: isActive ? opt.activeBg : "transparent",
                      color:            isActive ? opt.activeText : "#FFFFFF",
                      border:           "1px solid rgba(255,255,255,0.7)",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save (1/8 de la hauteur) */}
           <div className="flex-1 p-2">
            <Button label="Save" onClick={handleSave} className="w-full save-button" />
          </div>
        </div>
      </div>
    </div>
  );
}