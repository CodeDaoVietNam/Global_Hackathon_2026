import React from "react";
import { Check, Compass, HelpCircle, MessageSquare, Play, Sparkles } from "lucide-react";

export type TrailStage = "understand" | "clarify" | "respond" | "practise" | "reflect";

interface Props {
  currentStage: TrailStage;
  completedStages?: TrailStage[];
  onSelectStage?: (stage: TrailStage) => void;
}

const STAGES: Array<{ id: TrailStage; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "understand", label: "Understand", icon: Compass },
  { id: "clarify", label: "Clarify", icon: HelpCircle },
  { id: "respond", label: "Respond", icon: MessageSquare },
  { id: "practise", label: "Practise", icon: Play },
  { id: "reflect", label: "Reflect", icon: Sparkles },
];

export const LearningTrail: React.FC<Props> = ({ currentStage, completedStages = [], onSelectStage }) => {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <nav aria-label="Learning Trail Progress" className="w-full bg-white border-b border-slate-200 py-3 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {STAGES.map((stage, idx) => {
          const isCompleted = completedStages.includes(stage.id) || idx < currentIndex;
          const isCurrent = stage.id === currentStage;
          const Icon = stage.icon;
          const canClick = onSelectStage && (isCompleted || isCurrent);

          return (
            <React.Fragment key={stage.id}>
              <button
                type="button"
                disabled={!canClick}
                onClick={() => canClick && onSelectStage?.(stage.id)}
                className={`flex items-center gap-2 text-xs sm:text-sm font-medium transition-all ${
                  canClick ? "cursor-pointer" : "cursor-default"
                } ${
                  isCurrent
                    ? "text-indigo-700 font-semibold"
                    : isCompleted
                    ? "text-slate-700 hover:text-indigo-600"
                    : "text-slate-400"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors ${
                    isCurrent
                      ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200"
                      : isCompleted
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isCompleted && !isCurrent ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Icon className="w-3.5 h-3.5" />}
                </span>
                <span className="hidden md:inline">{stage.label}</span>
              </button>

              {idx < STAGES.length - 1 && (
                <div
                  className={`flex-1 mx-2 sm:mx-4 h-0.5 rounded transition-colors ${
                    idx < currentIndex ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};
