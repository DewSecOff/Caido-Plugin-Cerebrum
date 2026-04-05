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
    { label: "Not touched", value: "Not touched", activeBg: "#6B7280", activeText: "#FFFFFF" },
    { label: "Pending",     value: "Pending",     activeBg: "#D97706", activeText: "#FFFFFF" },
    { label: "Finished",    value: "Finished",    activeBg: "#16A34A", activeText: "#FFFFFF" },
    { label: "Important",   value: "Important",   activeBg: "#DC2626", activeText: "#FFFFFF" },
  ];

  return (
    <div className="p-4 bg-white dark:bg-surface-800 rounded h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center mb-4">
        <h2 className="text-lg font-bold" style={{ flex: 2 }}>Request / Response</h2>
        <h2 className="text-lg font-bold flex-1 text-left">&nbsp;&nbsp;&nbsp;Note</h2>
      </div>

      {/* Main content */}
      <div className="flex flex-1 h-full gap-4 overflow-hidden">

        {/* Left: Request editor */}
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 pl-1">Request</span>
          <div className="flex-1 border rounded overflow-hidden">
            <HTTPEditor
              type="request"
              value={request.reqRaw}
              style={{ height: "100%" }}
              removeHeader
              removeFooter
            />
          </div>
        </div>

        {/* Center: Response editor */}
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 pl-1">Response</span>
          <div className="flex-1 border rounded overflow-hidden">
            {request.resRaw ? (
              <HTTPEditor
                type="response"
                value={request.resRaw}
                style={{ height: "100%" }}
                removeHeader
                removeFooter
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm italic">
                No response captured
              </div>
            )}
          </div>
        </div>

        {/* Right: note, status, save */}
        <div className="flex flex-col flex-1 h-full">
          {/* Note */}
          <div className="flex-6 p-2 overflow-auto h-full">
            {isEditing ? (
              <InputTextarea
                ref={textareaRef}
                value={note}
                onChange={(e) => setNote(e.currentTarget.value)}
                onBlur={() => setIsEditing(false)}
                rows={10}
                className="
                  w-full h-full resize-none
                  bg-gray-800 text-gray-100
                  rounded p-2 border border-gray-600
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

          {/* Status */}
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

          {/* Save */}
          <div className="flex-1 p-2">
            <Button label="Save" onClick={handleSave} className="w-full save-button" />
          </div>
        </div>

      </div>
    </div>
  );
}