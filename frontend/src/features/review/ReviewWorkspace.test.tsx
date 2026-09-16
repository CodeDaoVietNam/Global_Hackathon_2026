import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ReviewWorkspace } from './ReviewWorkspace';
import * as reviewerApi from '../../services/api/reviewer';

vi.mock('../../services/api/reviewer', () => ({
  checkReviewerSession: vi.fn(),
  reviewerLogin: vi.fn(),
  reviewerLogout: vi.fn(),
  getReviewQueue: vi.fn(),
  getReviewCandidateDetail: vi.fn(),
  applyReviewDecision: vi.fn(),
  getCardVersions: vi.fn(),
}));

describe('ReviewWorkspace', () => {
  const mockCandidates = [
    {
      candidate_id: 'cand-review-1',
      version: 2,
      cue: 'leaving on read during lecture',
      scenario: 'Sent message in CS2040 Telegram chat during lecture hours',
      scenario_family: 'Teamwork',
      status: 'ready_for_review',
      relationship: 'classmate',
      channel: 'chat',
      formality: 'casual',
      counterexample: 'If urgent, they will reply immediately.',
      safe_action: 'Wait for lecture to end.',
      evidence_scope: 'NUS undergraduate tutorials.',
      perspectives: [
        {
          perspective_id: 'p-1',
          anonymous_contributor_id: 'anon-1',
          interpretation: 'Attending lab or lecture.',
          created_at: '2026-03-01T10:00:00Z',
        },
        {
          perspective_id: 'p-2',
          anonymous_contributor_id: 'anon-2',
          interpretation: 'Laptop battery dead.',
          created_at: '2026-03-01T10:05:00Z',
        },
      ],
      readiness: {
        ready: true,
        distinct_contributors: 2,
        has_do_not_assume: true,
        has_counterexample: true,
        has_safe_action: true,
        has_evidence_scope: true,
        reasons: [],
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form when unauthenticated and displays error on invalid token', async () => {
    vi.mocked(reviewerApi.checkReviewerSession).mockResolvedValue(false);
    vi.mocked(reviewerApi.reviewerLogin).mockRejectedValue(new Error('Invalid token'));

    render(<ReviewWorkspace />);

    await waitFor(() => {
      expect(screen.getByText(/Reviewer Authentication/i)).toBeInTheDocument();
    });

    const tokenInput = screen.getByPlaceholderText(/e\.g\. reviewer-secret-token/i);
    fireEvent.change(tokenInput, { target: { value: 'wrong-token' } });

    const loginBtn = screen.getByRole('button', { name: /Sign In to Workspace/i });
    fireEvent.click(loginBtn);

    await waitFor(() => {
      expect(screen.getByText(/Invalid token/i)).toBeInTheDocument();
    });

    expect(reviewerApi.reviewerLogin).toHaveBeenCalledWith('wrong-token');
  });

  it('renders review queue when authenticated and allows candidate inspection and approval', async () => {
    vi.mocked(reviewerApi.checkReviewerSession).mockResolvedValue(true);
    vi.mocked(reviewerApi.getReviewQueue).mockResolvedValue(mockCandidates as any);
    vi.mocked(reviewerApi.applyReviewDecision).mockResolvedValue({
      status: 'approved',
      version: 3,
      published_card_id: 'sg-teamwork-cand-r',
    });
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<ReviewWorkspace />);

    await waitFor(() => {
      expect(screen.getByText(/^Reviewer Workspace$/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/leaving on read during lecture/i)).toBeInTheDocument();

    // Select the candidate
    const candidateItem = screen.getByText(/leaving on read during lecture/i);
    fireEvent.click(candidateItem);

    // Verify candidate detail panel appears with perspectives
    await waitFor(() => {
      expect(screen.getByText(/Perspectives \(2\)/i)).toBeInTheDocument();
    });

    // Click Approve button
    const approveBtn = screen.getByRole('button', { name: /Approve as Community-Reviewed/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(reviewerApi.applyReviewDecision).toHaveBeenCalledWith(
        'cand-review-1',
        expect.objectContaining({
          decision: 'approve',
          expected_candidate_version: 2,
        })
      );
    });
  });
});
