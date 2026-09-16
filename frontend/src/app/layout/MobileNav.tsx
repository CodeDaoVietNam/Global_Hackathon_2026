import React from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, Compass, User, Users, Shield } from "lucide-react";

interface Props {
  hasReviewerSession?: boolean;
}

export const MobileNav: React.FC<Props> = ({ hasReviewerSession }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { to: "/explore", label: "Explore", icon: BookOpen },
    { to: "/context-lab", label: "Lab", icon: Compass },
    { to: "/learning", label: "Learning", icon: User },
    { to: "/community", label: "Community", icon: Users },
  ];

  if (hasReviewerSession) {
    navItems.push({ to: "/review", label: "Review", icon: Shield });
  }

  return (
    <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 shadow-lg">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.to || currentPath.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                isActive ? "text-indigo-600 font-semibold" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
