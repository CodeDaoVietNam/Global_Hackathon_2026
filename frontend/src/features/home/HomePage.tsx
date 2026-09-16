import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Compass,
  BookOpen,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Users,
  HelpCircle,
  CheckCircle,
  Volume2,
  AlertTriangle,
  Lightbulb,
  CornerDownRight
} from "lucide-react";

interface DecoderPreset {
  cue: string;
  phonetic: string;
  category: string;
  literal: string;
  campusIntent: string;
  riskLevel: "Low Risk" | "Moderate Risk" | "Context Sensitive";
  riskColor: string;
  exampleQuote: string;
  safeResponse: string;
}

const DECODER_PRESETS: DecoderPreset[] = [
  {
    cue: "can lah",
    phonetic: "/kæn lɑː/",
    category: "Teamwork & Commitment",
    literal: "It can be done (affirmative particle)",
    campusIntent: "Reassures that the request is feasible, but doesn't guarantee strict timeline without further agreement.",
    riskLevel: "Low Risk",
    riskColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
    exampleQuote: "“Can we finish the final presentation slides before 10pm tonight?” — “Can lah!”",
    safeResponse: "“Awesome, thank you! I'll review section 3 and merge by 9:30pm.”",
  },
  {
    cue: "bojio",
    phonetic: "/boʊ dʒiːoʊ/ (Hokkien)",
    category: "Humour & Informal Teasing",
    literal: "No invite / never invited me",
    campusIntent: "Lighthearted social banter indicating friendship and desire to be included; rarely a genuine complaint or grudge.",
    riskLevel: "Low Risk",
    riskColor: "text-sky-700 bg-sky-50 border-sky-200",
    exampleQuote: "Classmate sees your lunch photo at UTown canteen: “Wah bojio!”",
    safeResponse: "“Haha rushed lunch between lectures today! Let's definitely grab coffee next Tuesday?”",
  },
  {
    cue: "quite interesting",
    phonetic: "/kwaɪt ˈɪntrəstɪŋ/",
    category: "Feedback & Evaluation",
    literal: "Possessing interesting qualities",
    campusIntent: "Often used in tutor or senior peer critiques as gentle indirect feedback suggesting unconventional aspects needing revision.",
    riskLevel: "Context Sensitive",
    riskColor: "text-amber-700 bg-amber-50 border-amber-200",
    exampleQuote: "Tutor reviewing your methodology: “Your survey approach is quite interesting.”",
    safeResponse: "“Thank you Professor. Which specific assumption should we stress-test further?”",
  },
  {
    cue: "chope",
    phonetic: "/tʃoʊp/",
    category: "Campus Life & Norms",
    literal: "To stamp / mark / reserve",
    campusIntent: "Local custom of reserving a table using tissue packets or an umbrella while ordering food at busy canteens.",
    riskLevel: "Context Sensitive",
    riskColor: "text-teal-700 bg-teal-50 border-teal-200",
    exampleQuote: "At Frontier canteen during peak 12:30pm rush: a packet of tissue sits on the table.",
    safeResponse: "Recognize that the seat is occupied and look for another available booth.",
  },
];

export const HomePage: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<DecoderPreset>(DECODER_PRESETS[0]);
  const [playingAudio, setPlayingAudio] = useState(false);

  const handlePlayAudio = (cue: string) => {
    if (!('speechSynthesis' in window)) return;
    setPlayingAudio(true);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cue);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.onend = () => setPlayingAudio(false);
    utterance.onerror = () => setPlayingAudio(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-5 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-900 text-xs font-semibold shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>Singapore Intercultural Learning Companion</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
          Interpret ambiguous communication, <br className="hidden sm:inline" />
          <span className="text-indigo-600 font-serif italic font-normal">clarify before you assume.</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Entering an academic or campus community in Singapore? ContextCue grounds unfamiliar local cues, informal phrasing, and indirect feedback in multi-perspective evidence so you can respond with confidence.
        </p>

        <div className="pt-2 flex flex-wrap gap-3 justify-center">
          <Link
            to="/context-lab"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            Analyze a Situation
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm border border-slate-200 shadow-2xs transition-all"
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Explore Scenarios
          </Link>
        </div>
      </section>

      {/* Interactive Cue Decoder (Mini-Sandbox) */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              Interactive Campus Cue Decoder
            </span>
            <h2 className="text-xl font-bold text-slate-900">Try Decoding Singapore Expressions</h2>
          </div>
          <p className="text-xs text-slate-500 max-w-xs sm:text-right">
            Select a common phrase below to see its nuance and practice response:
          </p>
        </div>

        {/* Preset Selector Tabs */}
        <div className="flex flex-wrap gap-2">
          {DECODER_PRESETS.map((p) => {
            const isSelected = selectedPreset.cue === p.cue;
            return (
              <button
                key={p.cue}
                onClick={() => setSelectedPreset(p)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xs scale-102"
                    : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>“{p.cue}”</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? "bg-indigo-700 text-indigo-100" : "bg-white text-slate-500"}`}>
                  {p.category.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Decoded Output Card */}
        <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-5 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <h3 className="text-2xl font-black text-slate-900">“{selectedPreset.cue}”</h3>
                <button
                  type="button"
                  title="Play pronunciation"
                  onClick={() => handlePlayAudio(selectedPreset.cue)}
                  className={`p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition-colors ${
                    playingAudio ? "animate-pulse text-indigo-600 bg-indigo-50" : ""
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-slate-500">{selectedPreset.phonetic}</span>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${selectedPreset.riskColor}`}>
                {selectedPreset.riskLevel}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200/60 space-y-1">
                <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">Example Dialogue</span>
                <p className="text-slate-800 italic">{selectedPreset.exampleQuote}</p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200/60 space-y-1.5">
                <span className="font-bold text-indigo-700 text-[11px] uppercase tracking-wider">Actual Campus Intent</span>
                <p className="text-slate-700 leading-relaxed">{selectedPreset.campusIntent}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-2xl border border-indigo-200/80 p-4 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                Recommended Response
              </span>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded">Low Risk</span>
            </div>

            <p className="text-xs text-slate-800 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              {selectedPreset.safeResponse}
            </p>

            <Link
              to={`/context-lab?prefill=${encodeURIComponent(selectedPreset.exampleQuote)}&cue=${encodeURIComponent(selectedPreset.cue)}`}
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              Analyze in Context Lab
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5-Step Learning Method Bento Grid */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm space-y-6">
        <div className="text-center space-y-1.5 max-w-xl mx-auto">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">The ContextCue Method</span>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">A Repeatable Mental Model for Communication</h2>
          <p className="text-xs text-slate-500">Structured cognitive steps to navigate ambiguous cues with empathy and precision.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-2">
          {[
            {
              step: "01",
              title: "Understand",
              subtitle: "Extract Explicit Facts",
              desc: "Isolate exact quotes and observable behavior without premature cultural assumptions.",
              icon: Compass,
            },
            {
              step: "02",
              title: "Clarify",
              subtitle: "Spot Missing Context",
              desc: "Identify what is unverified: relationship depth, digital nuance, or unspoken stress.",
              icon: HelpCircle,
            },
            {
              step: "03",
              title: "Respond",
              subtitle: "Choose Low-Risk Path",
              desc: "Compare alternative interpretations and select a polite clarification strategy.",
              icon: MessageSquare,
            },
            {
              step: "04",
              title: "Practise",
              subtitle: "Adaptive Simulation",
              desc: "Test your reply in an interactive 3-turn role-play with explicit partner assumptions.",
              icon: Sparkles,
            },
            {
              step: "05",
              title: "Reflect",
              subtitle: "Transfer the Skill",
              desc: "Store your personal reflection verbatim and build verified communication criteria.",
              icon: CheckCircle,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-slate-50/80 rounded-2xl p-4.5 border border-slate-200/60 flex flex-col justify-between hover:border-indigo-300 transition-colors group relative overflow-hidden"
              >
                <div className="absolute top-2 right-3 font-serif text-3xl font-extrabold text-slate-200 select-none group-hover:text-indigo-200/60 transition-colors">
                  {item.step}
                </div>
                <div className="space-y-2 z-10">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-indigo-600 shadow-2xs">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    <p className="text-[11px] font-semibold text-indigo-700">{item.subtitle}</p>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured Dilemmas */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Featured Campus Situations</h2>
            <p className="text-xs text-slate-500">Real academic scenarios faced by international students in Singapore</p>
          </div>
          <Link to="/explore" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
            Browse library <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              cue: "can lah",
              scenario: "Your project teammate replies 'can lah' when you ask if the slide deck will be completed by tonight.",
              family: "Teamwork",
              tag: "Undergraduate Projects",
            },
            {
              cue: "bojio",
              scenario: "A classmate saw your lunch photo in the group chat and commented 'bojio'. You've only known them for a week.",
              family: "Humour",
              tag: "Group Chat Etiquette",
            },
            {
              cue: "quite interesting",
              scenario: "During presentation feedback, your tutor remarked that your methodology is 'quite interesting'.",
              family: "Feedback",
              tag: "Academic Presentations",
            },
          ].map((sc, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-all">
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    {sc.family}
                  </span>
                  <span className="text-xs font-mono text-slate-400 font-semibold">“{sc.cue}”</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">{sc.tag}</span>
                <p className="text-xs text-slate-700 leading-relaxed">{sc.scenario}</p>
              </div>

              <Link
                to={`/context-lab?prefill=${encodeURIComponent(sc.scenario)}&cue=${encodeURIComponent(sc.cue)}`}
                className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 text-xs font-semibold border border-slate-200 transition-colors"
              >
                Analyze this scenario <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Community Governance Notice Banner */}
      <section className="rounded-3xl border border-slate-900/[0.07] bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-1.5 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold">Peer Knowledge with Human Verification</h3>
          </div>
          <p className="text-xs text-slate-200/90 max-w-xl leading-relaxed">
            All community context submissions are scanned for zero privacy leakage, require $\ge 2$ distinct perspectives, and must be approved by campus reviewers before entering AI retrieval.
          </p>
        </div>

        <Link
          to="/community"
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition-all shadow-xs"
        >
          <Users className="w-4 h-4 text-indigo-600" />
          Contribute Context
        </Link>
      </section>
    </div>
  );
};
