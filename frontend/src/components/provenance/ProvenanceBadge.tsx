import React from "react";
import { ShieldCheck, Clock, Sparkles, AlertCircle } from "lucide-react";

export type ProvenanceType = "Synthetic seed" | "Pending contribution" | "Awaiting community review" | "Community-reviewed" | string;

interface Props {
  provenance: ProvenanceType;
  size?: "sm" | "md";
}

export const ProvenanceBadge: React.FC<Props> = ({ provenance = "Synthetic seed", size = "md" }) => {
  const norm = (provenance || "synthetic").toLowerCase();
  const isSm = size === "sm";

  if (norm.includes("community") || norm.includes("approved")) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 ${
          isSm ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1"
        }`}
        title="Verified by Singapore campus human reviewer"
      >
        <ShieldCheck className={isSm ? "w-3 h-3 text-emerald-600" : "w-3.5 h-3.5 text-emerald-600"} />
        Community-reviewed
      </span>
    );
  }

  if (norm.includes("awaiting")) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-sky-50 text-sky-800 border border-sky-200 ${
          isSm ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1"
        }`}
        title="Meets multi-perspective readiness; queued for human review"
      >
        <Clock className={isSm ? "w-3 h-3 text-sky-600" : "w-3.5 h-3.5 text-sky-600"} />
        Awaiting review
      </span>
    );
  }

  if (norm.includes("pending") || norm.includes("collecting")) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-50 text-amber-800 border border-amber-200 ${
          isSm ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1"
        }`}
        title="Candidate contribution collecting perspectives"
      >
        <AlertCircle className={isSm ? "w-3 h-3 text-amber-600" : "w-3.5 h-3.5 text-amber-600"} />
        Pending contribution
      </span>
    );
  }

  // Default: Synthetic seed
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${
        isSm ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1"
      }`}
      title="Research-informed prototype card; not verified peer testimony"
    >
      <Sparkles className={isSm ? "w-3 h-3 text-slate-500" : "w-3.5 h-3.5 text-slate-500"} />
      Synthetic seed
    </span>
  );
};
