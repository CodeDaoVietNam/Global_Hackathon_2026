import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PracticeStudioPage } from "./PracticeStudioPage";

describe("PracticeStudioPage", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("contextcue_anonymous_learner_v2", "learner-from-context-lab");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ goal: "clarify_before_inferring", turns: [] }),
      }),
    );
  });

  it("loads a direct practice route with the learner ID used by Context Lab", async () => {
    render(
      <MemoryRouter initialEntries={["/sessions/thread-1/practice/practice-1"]}>
        <Routes>
          <Route path="/sessions/:threadId/practice/:practiceId" element={<PracticeStudioPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/v2/threads/thread-1/practice/practice-1",
        expect.objectContaining({
          headers: { "X-Learner-ID": "learner-from-context-lab" },
        }),
      );
    });
  });
});
