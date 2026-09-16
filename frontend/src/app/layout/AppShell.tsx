import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { PrimaryNav } from "./PrimaryNav";
import { MobileNav } from "./MobileNav";
import { checkReviewerSession } from "../../services/api/reviewer";

export const AppShell: React.FC = () => {
  const [hasReviewer, setHasReviewer] = useState(false);

  useEffect(() => {
    checkReviewerSession().then(setHasReviewer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#faf7f2] text-slate-800">
      <PrimaryNav hasReviewerSession={hasReviewer} />
      <main className="flex-1 pb-16 md:pb-8">
        <Outlet />
      </main>
      <MobileNav hasReviewerSession={hasReviewer} />
    </div>
  );
};
