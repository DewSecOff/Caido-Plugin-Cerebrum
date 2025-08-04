// src/components/FilterBar.tsx
// src/components/FilterBar.tsx
import { InputText } from "primereact/inputtext";

export default function FilterBar({ onUpdateQuery }: { onUpdateQuery: (q: string) => void }) {
  return (
    <InputText
      placeholder='ex: req.cont:"login" and resp.code:eq:200'
      className="w-full"
      onChange={e => onUpdateQuery(e.currentTarget.value)}
    />
  );
}