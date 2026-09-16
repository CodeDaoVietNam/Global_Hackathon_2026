import React from "react";
import { EvidenceCard, EvidenceItemData } from "./EvidenceCard";
import { Layers, Sparkles } from "lucide-react";

interface Props {
  items: EvidenceItemData[];
  retrievalMode?: string;
}

export const EvidenceRail: React.FC<Props> = ({ items, retrievalMode = "hybrid" }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-teal-700" />
          Evidence Grounding ({items.length})
        </h3>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
          <Sparkles className="w-2.5 h-2.5 text-teal-600" />
          Mode: {retrievalMode}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-4 text-center border border-dashed border-slate-200 text-xs text-slate-500">
          No explicit card matches found. Reasoning based on cautious communication principles.
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <EvidenceCard key={item.card_id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};
