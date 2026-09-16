import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchLibraryCards, LibraryCardItem, LibraryFilters, LibraryResponse } from "../../services/api/library";
import { ProvenanceBadge } from "../../components/provenance/ProvenanceBadge";
import { Search, Filter, Compass, ArrowRight, BookOpen, Tag, X, Layers, Volume2 } from "lucide-react";

export const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<LibraryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<LibraryFilters>({
    query: "",
    scenario_family: "",
    relationship: "",
    channel: "",
    formality: "",
    evidence_level: "",
  });

  const [selectedCard, setSelectedCard] = useState<LibraryCardItem | null>(null);

  const loadCards = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchLibraryCards(filters);
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load cards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, [filters.scenario_family, filters.relationship, filters.channel, filters.formality, filters.evidence_level]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCards();
  };

  const clearFilter = (key: keyof LibraryFilters) => {
    setFilters((prev) => ({ ...prev, [key]: "" }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Scenario Discovery Library
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Browse verified community context cards and research-backed campus scenarios.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <input
            type="text"
            value={filters.query || ""}
            onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
            placeholder="Search cues, e.g. bojio, can lah..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>
      </div>

      {/* Quick Category Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">Popular:</span>
        {[
          { label: "All Scenarios", family: "" },
          { label: "🤝 Group Work", family: "Teamwork" },
          { label: "😄 Humour & Banter", family: "Humour" },
          { label: "📝 Feedback & Grading", family: "Feedback" },
          { label: "🏫 Campus Etiquette", family: "Campus Life" },
        ].map((tag) => (
          <button
            key={tag.label}
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, scenario_family: tag.family }))}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
              (filters.scenario_family || "") === tag.family
                ? "bg-indigo-600 text-white border-indigo-700 shadow-2xs font-semibold"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1 space-y-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              Filter Scenarios
            </h3>
            {(filters.scenario_family || filters.relationship || filters.channel || filters.formality || filters.evidence_level) && (
              <button
                onClick={() => setFilters({ query: filters.query })}
                className="text-[11px] font-semibold text-indigo-600 hover:underline"
              >
                Reset all
              </button>
            )}
          </div>

          {/* Scenario Family Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Scenario Family</label>
            <div className="space-y-1">
              {["", "Teamwork", "Humour", "Feedback", "Campus Life"].map((family) => {
                const isSelected = (filters.scenario_family || "").toLowerCase() === family.toLowerCase();
                const count = family ? data?.facets?.scenario_family?.[family] || 0 : data?.total || 0;
                return (
                  <button
                    key={family || "all"}
                    onClick={() => setFilters((prev) => ({ ...prev, scenario_family: family }))}
                    className={`w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg transition-colors text-left ${
                      isSelected
                        ? "bg-indigo-50 text-indigo-900 font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{family || "All families"}</span>
                    <span className="text-[10px] text-slate-400">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Formality Filter */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-700 block">Formality</label>
            <div className="flex flex-wrap gap-1.5">
              {["", "casual", "formal"].map((f) => {
                const isSelected = (filters.formality || "").toLowerCase() === f.toLowerCase();
                return (
                  <button
                    key={f || "all"}
                    onClick={() => setFilters((prev) => ({ ...prev, formality: f }))}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 font-medium"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {f ? f.charAt(0).toUpperCase() + f.slice(1) : "Any"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Evidence Level Filter */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-700 block">Evidence Status</label>
            <div className="space-y-1">
              {["", "Community-reviewed", "Synthetic seed"].map((lvl) => {
                const isSelected = (filters.evidence_level || "").toLowerCase() === lvl.toLowerCase();
                return (
                  <button
                    key={lvl || "all"}
                    onClick={() => setFilters((prev) => ({ ...prev, evidence_level: lvl }))}
                    className={`w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg transition-colors text-left ${
                      isSelected
                        ? "bg-indigo-50 text-indigo-900 font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{lvl || "All evidence types"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Cards Grid */}
        <section className="lg:col-span-3 space-y-4">
          {/* Active Filter Chips */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-500">
              Showing <strong className="text-slate-800">{data?.cards.length || 0}</strong> of{" "}
              {data?.total || 0} scenarios
            </span>

            {filters.scenario_family && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                {filters.scenario_family}
                <X className="w-3 h-3 cursor-pointer" onClick={() => clearFilter("scenario_family")} />
              </span>
            )}
            {filters.formality && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                {filters.formality}
                <X className="w-3 h-3 cursor-pointer" onClick={() => clearFilter("formality")} />
              </span>
            )}
            {filters.evidence_level && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                {filters.evidence_level}
                <X className="w-3 h-3 cursor-pointer" onClick={() => clearFilter("evidence_level")} />
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-white rounded-2xl border border-slate-200 p-5 h-44 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs">
              {error}
            </div>
          ) : data?.cards.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
              <Layers className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No scenarios found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No cards match your filter criteria. Try adjusting or clearing your filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.cards.map((card) => (
                <div
                  key={card.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-indigo-400 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                          {card.scenario_family}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {card.title}
                        </h3>
                      </div>
                      <ProvenanceBadge provenance={card.provenance} size="sm" />
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-3">
                      {card.scenario}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-100 font-mono text-[11px]">
                        <span>“{card.expression}”</span>
                        <button
                          type="button"
                          title="Listen to pronunciation"
                          onClick={(e) => {
                            e.stopPropagation();
                            if ('speechSynthesis' in window) {
                              window.speechSynthesis.cancel();
                              const u = new SpeechSynthesisUtterance(card.expression);
                              u.rate = 0.9;
                              window.speechSynthesis.speak(u);
                            }
                          }}
                          className="hover:text-amber-700 text-amber-900/60 p-0.5 rounded cursor-pointer"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      </div>
                      {card.relationship && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {card.relationship}
                        </span>
                      )}
                      {card.channel && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {card.channel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedCard(card)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() =>
                        navigate(
                          `/context-lab?prefill=${encodeURIComponent(card.scenario)}&cue=${encodeURIComponent(
                            card.expression
                          )}`
                        )
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white text-xs font-semibold transition-colors"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      Analyze in Lab
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Card Detail Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  {selectedCard.scenario_family}
                </span>
                <h3 className="text-lg font-bold text-slate-900">{selectedCard.title}</h3>
              </div>
              <button
                onClick={() => setSelectedCard(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ProvenanceBadge provenance={selectedCard.provenance} />

            <div className="space-y-2 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">Scenario Context:</p>
              <p className="bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                {selectedCard.scenario}
              </p>
            </div>

            {selectedCard.do_not_assume && (
              <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
                <strong>Do not assume:</strong> {selectedCard.do_not_assume}
              </div>
            )}

            {selectedCard.safe_action && (
              <div className="text-xs bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-900">
                <strong>Recommended safe action:</strong> {selectedCard.safe_action}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedCard(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const card = selectedCard;
                  setSelectedCard(null);
                  navigate(
                    `/context-lab?prefill=${encodeURIComponent(card.scenario)}&cue=${encodeURIComponent(
                      card.expression
                    )}`
                  );
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
              >
                <Compass className="w-3.5 h-3.5" />
                Analyze this scenario in Lab
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
