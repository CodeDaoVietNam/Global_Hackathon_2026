import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { HomePage } from "../features/home/HomePage";
import { ExplorePage } from "../features/explore/ExplorePage";
import { ContextLabPage } from "../features/context-lab/ContextLabPage";
import { PracticeStudioPage } from "../features/practice/PracticeStudioPage";
import { LearningPage } from "../features/learning/LearningPage";
import { CommunityPage } from "../features/community/CommunityPage";
import { ReviewWorkspace } from "../features/review/ReviewWorkspace";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "home", element: <Navigate to="/" replace /> },
      { path: "explore", element: <ExplorePage /> },
      { path: "context-lab", element: <ContextLabPage /> },
      { path: "sessions/:threadId", element: <ContextLabPage /> },
      { path: "practice", element: <PracticeStudioPage /> },
      { path: "sessions/:threadId/practice/:practiceId", element: <PracticeStudioPage /> },
      { path: "learning", element: <LearningPage /> },
      { path: "community", element: <CommunityPage /> },
      { path: "community/candidates/:candidateId", element: <CommunityPage /> },
      { path: "review", element: <ReviewWorkspace /> },
      { path: "review/candidates/:candidateId", element: <ReviewWorkspace /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
