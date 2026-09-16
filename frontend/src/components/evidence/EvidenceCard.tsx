import React from "react";
import { ProvenanceBadge } from "../provenance/ProvenanceBadge";
import { AlertCircle, Tag, BookOpen } from "lucide-react";

export interface EvidenceItemData {
  card_id: string;
  version: string;
  title: string;
  scenario_family: string;
  matched_fields: string[];
  evidence_status: string;
  evidence_limit: string;
  do_not_assume?: string;
  possible_interpretations?: any[];
}

interface Props {
  item: EvidenceItemData;
}

export const EvidenceCard: React.FC<Props> = ({ item }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-teal-300 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-slate-800 leading-snug">{item.title}</h4>
        <ProvenanceBadge provenance={item.evidence_status === "approved" ? "Community-reviewed" : "Synthetic seed"} size="sm" />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2.5">
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
          <BookOpen className="w-3 h-3" />
          {item.scenario_family}
        </span>
        {item.matched_fields.map((field) => (
          <span key={field} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-teal-50 text-teal-700">
            <Tag className="w-2.5 h-2.5" />
            {field}
          </span>
        ))}
      </div>

      {item.do_not_assume && (
        <div className="text-xs bg-amber-50/70 border border-amber-100 rounded-lg p-2.5 text-amber-900 mb-2">
          <span className="font-semibold flex items-center gap-1 text-amber-800 mb-0.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Do not assume:
          </span>
          {item.do_not_assume}
        </div>
      )}

      {item.evidence_limit && (
        <p className="text-[11px] text-slate-500 italic">
          Evidence scope: {item.evidence_limit}
        </p>
      )}
    </div>
  );
};
