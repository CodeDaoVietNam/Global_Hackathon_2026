import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Compass, BookOpen, User, Users, Shield, Sparkles } from "lucide-react";

interface Props {
  hasReviewerSession?: boolean;
}

export const PrimaryNav: React.FC<Props> = ({ hasReviewerSession }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { to: "/explore", label: "Explore", icon: BookOpen },
    { to: "/context-lab", label: "Context Lab", icon: Compass },
    { to: "/learning", label: "My Learning", icon: User },
    { to: "/community", label: "Community", icon: Users },
  ];

  if (hasReviewerSession) {
    navItems.push({ to: "/review", label: "Review Workspace", icon: Shield });
  }

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-sm ring-1 ring-indigo-500/30 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4.5 h-4.5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 tracking-tight text-base">ContextCue</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700">V2</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 hidden sm:flex">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Singapore Campus Companion</span>
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.to || currentPath.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-white text-indigo-600 shadow-xs ring-1 ring-indigo-500/10"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
