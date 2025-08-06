// src/components/HTTPEditor.tsx

import React, { useEffect, useRef, useState } from "react";
import {
  HTTPRequestEditor,
  HTTPResponseEditor,
} from "@caido/sdk-frontend/src/types/editor";
import { useSDK } from "../../plugins/sdk";

interface HTTPEditorProps {
  value: string;
  type: "request" | "response";
  style?: React.CSSProperties;
  onChange?: (value: string) => void;
  removeFooter?: boolean;
  removeHeader?: boolean;
}

type EditorType = HTTPRequestEditor | HTTPResponseEditor;

export const HTTPEditor: React.FC<HTTPEditorProps> = ({
  value,
  type,
  style,
  onChange,
  removeFooter = false,
  removeHeader = false,
}) => {
  const sdk = useSDK();
  // Utiliser un initialValue null pour useRef afin d'éviter l'erreur TS
  const editorRef = useRef<EditorType | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hash, setHash] = useState(window.location.hash);

  const setValue = (val: string) => {
    const view = editorRef.current?.getEditorView();
    if (!view) return;
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: val,
      },
    });
    onChange?.(val);
  };

  const initializeEditor = () => {
    if (!containerRef.current) return;
    const newEditor =
      type === "request"
        ? sdk.ui.httpRequestEditor()
        : sdk.ui.httpResponseEditor();

    editorRef.current = newEditor;
    containerRef.current.appendChild(newEditor.getElement());
    setValue(value);

    const card = newEditor.getEditorView()?.dom?.closest(".c-card");
    if (card) {
      if (removeFooter) card.querySelector(".c-card__footer")?.remove();
      if (removeHeader) card.querySelector(".c-card__header")?.remove();
    }
    return newEditor;
  };

  useEffect(() => {
    const newEditor = initializeEditor();
    return () => {
      if (containerRef.current && newEditor) {
        containerRef.current.removeChild(newEditor.getElement());
      }
    };
  }, [sdk, type, hash]);

  useEffect(() => {
    if (editorRef.current) setValue(value);
  }, [value]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const newHash = window.location.hash;
      if (newHash !== hash) setHash(newHash);
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
    });
    return () => observer.disconnect();
  }, [hash]);

  return <div style={{ height: "100%", ...style }} ref={containerRef} />;
};