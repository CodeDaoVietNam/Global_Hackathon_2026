import React, { useEffect, useState } from 'react';
import { X, PlusCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ContributedCardSubmission, ScenarioType } from '../types';
import { Button } from './ui/Button';

interface ContributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContributedCardSubmission) => Promise<void>;
}

export const ContributeModal: React.FC<ContributeModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<ContributedCardSubmission>({
    phrase: '',
    contextScenario: '',
    scenarioType: 'teamwork',
    relationship: 'peer-teammate',
    literalMeaning: '',
    perspective1: '',
    perspective2: '',
    whatNotToAssume: '',
    suggestedReply: '',
    contributorFaculty: 'Computing & Business (Singapore)'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phrase.trim()) return;

    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit(formData);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        setFormData({
          phrase: '',
          contextScenario: '',
          scenarioType: 'teamwork',
          relationship: 'peer-teammate',
          literalMeaning: '',
          perspective1: '',
          perspective2: '',
          whatNotToAssume: '',
          suggestedReply: '',
          contributorFaculty: 'Computing & Business (Singapore)'
        });
      }, 1400);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not queue this contribution.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div
        id="contribute-card-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contribute-title"
        className="w-full max-w-2xl bg-white rounded-2xl border border-[#e7e5e0] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#f1efe9] bg-[#faf9f6]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#f0fdfa] border border-[#ccfbf1] flex items-center justify-center text-[#0f766e]">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 id="contribute-title" className="text-base font-bold text-[#0f172a]">Share local context</h3>
              <p className="text-xs text-[#64748b]">Help us prepare a candidate card for community review</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close contribution form"
            className="p-1.5 text-[#94a3b8] hover:text-[#0f172a] rounded-lg hover:bg-[#f1efe9] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Responsible AI submission guideline */}
        <div className="px-6 py-2.5 bg-[#f0fdfa] border-b border-[#ccfbf1] flex items-center gap-2 text-xs text-[#0f766e]">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Submissions stay pending until a human review checks context, privacy, and possible stereotypes.</span>
        </div>

        {isSuccess ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#f0fdf4] border border-[#bbf7d0] text-[#16a34a] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-[#0f172a]">Queued for review</h4>
            <p className="text-xs text-[#64748b] max-w-md mx-auto">
              Thank you. This contribution is not part of the learning library until reviewers approve it.
            </p>
          </div>
        ) : (
          /* Form Content */
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider block">
                  Phrase or Expression *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 'no problem one' or 'confirm plus chop'"
                  value={formData.phrase}
                  onChange={(e) => setFormData({ ...formData, phrase: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#faf9f6] border border-[#e2e8f0] focus:bg-white focus:border-[#0f766e] text-xs sm:text-sm text-[#0f172a]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider block">
                  Scenario Filter
                </label>
                <select
                  value={formData.scenarioType}
                  onChange={(e) => setFormData({ ...formData, scenarioType: e.target.value as ScenarioType })}
                  className="w-full px-3 py-2 rounded-lg bg-[#faf9f6] border border-[#e2e8f0] focus:bg-white focus:border-[#0f766e] text-xs sm:text-sm text-[#0f172a]"
                >
                  <option value="teamwork">Teamwork</option>
                  <option value="feedback">Feedback</option>
                  <option value="singlish-idioms">Singlish & Idioms</option>
                  <option value="campus-life">Campus Life</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider block">
                Typical Academic Situation / Query
              </label>
              <input
                type="text"
                placeholder="e.g., 'Teammate said: confirm plus chop regarding our slide format'"
                value={formData.contextScenario}
                onChange={(e) => setFormData({ ...formData, contextScenario: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg bg-[#faf9f6] border border-[#e2e8f0] focus:bg-white focus:border-[#0f766e] text-xs sm:text-sm text-[#0f172a]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider block">
                Literal & Pragmatic Meaning
              </label>
              <textarea
                rows={2}
                placeholder="Explain the literal words and the particle/idiom origin clearly..."
                value={formData.literalMeaning}
                onChange={(e) => setFormData({ ...formData, literalMeaning: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg bg-[#faf9f6] border border-[#e2e8f0] focus:bg-white focus:border-[#0f766e] text-xs sm:text-sm text-[#0f172a] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider block">
                  Peer Perspective 1 (Common Nuance)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. In standard contexts, indicates complete certainty and reassurance..."
                  value={formData.perspective1}
                  onChange={(e) => setFormData({ ...formData, perspective1: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#faf9f6] border border-[#e2e8f0] focus:bg-white focus:border-[#0f766e] text-xs sm:text-sm text-[#0f172a] resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider block">
                  Peer Perspective 2 (Alternative Nuance)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. In humorous banter, playful emphasis that everything is locked down..."
                  value={formData.perspective2}
                  onChange={(e) => setFormData({ ...formData, perspective2: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#faf9f6] border border-[#e2e8f0] focus:bg-white focus:border-[#0f766e] text-xs sm:text-sm text-[#0f172a] resize-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#be123c] uppercase tracking-wider block">
                What Not to Assume (Coral Caution)
              </label>
              <input
                type="text"
                placeholder="e.g., Do not assume lack of academic rigor; it's a high-certainty guarantee..."
                value={formData.whatNotToAssume}
                onChange={(e) => setFormData({ ...formData, whatNotToAssume: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg bg-[#fff5f5] border border-[#fecdd3] focus:bg-white focus:border-[#e11d48] text-xs sm:text-sm text-[#0f172a]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider block">
                Suggested Respectful Follow-Up Response
              </label>
              <input
                type="text"
                placeholder="e.g., 'Great, thank you for confirming! I’ll note it in the project board.'"
                value={formData.suggestedReply}
                onChange={(e) => setFormData({ ...formData, suggestedReply: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg bg-[#faf9f6] border border-[#e2e8f0] focus:bg-white focus:border-[#0f766e] text-xs sm:text-sm text-[#0f172a]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#f1efe9]">
              {error && <p role="alert" className="mr-auto text-xs text-rose-700">{error}</p>}
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                id="btn-submit-peer-card"
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || !formData.phrase.trim()}
                icon={<PlusCircle className="w-4 h-4" />}
              >
                {isSubmitting ? 'Submitting…' : 'Queue for review'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
