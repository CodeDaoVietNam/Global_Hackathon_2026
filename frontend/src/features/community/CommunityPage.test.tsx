import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { CommunityPage } from './CommunityPage';
import * as communityApi from '../../services/api/community';

vi.mock('../../services/api/community', () => ({
  listCandidates: vi.fn(),
  findSimilarCandidates: vi.fn(),
  submitContribution: vi.fn(),
  addPerspective: vi.fn(),
}));

describe('CommunityPage', () => {
  const mockCandidates = [
    {
      candidate_id: 'cand-101',
      cue: 'Seen but no reply for 3 hours',
      scenario: 'Sent project question on Telegram group',
      scenario_family: 'Teamwork',
      status: 'collecting_perspectives',
      perspectives_count: 1,
      created_at: '2026-03-01T10:00:00Z',
      perspectives: [
        {
          perspective_id: 'persp-1',
          interpretation: 'They may be in a lecture or lab session.',
          created_at: '2026-03-01T10:05:00Z',
        },
      ],
      readiness: {
        ready: false,
        distinct_contributors: 1,
        has_do_not_assume: true,
        has_counterexample: false,
        has_safe_action: true,
        has_evidence_scope: true,
        reasons: ['Need at least 2 distinct contributors'],
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(communityApi.listCandidates).mockResolvedValue(mockCandidates as any);
    vi.mocked(communityApi.findSimilarCandidates).mockResolvedValue([]);
  });

  it('renders existing candidates with provenance and status tags', async () => {
    render(<CommunityPage />);

    expect(screen.getByText(/Community Context & Perspectives/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Seen but no reply for 3 hours/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Teamwork')).toBeInTheDocument();
    expect(screen.getByText(/Collecting perspectives/i)).toBeInTheDocument();
  });

  it('prevents submission and displays privacy warning if sensitive data is entered', async () => {
    render(<CommunityPage />);

    await waitFor(() => {
      expect(screen.getByText(/Seen but no reply for 3 hours/i)).toBeInTheDocument();
    });

    // Switch to contribute tab
    fireEvent.click(screen.getByRole('button', { name: /Contribute Context/i }));

    await waitFor(() => {
      expect(screen.getByText(/Contribute a Campus Cue or Interaction/i)).toBeInTheDocument();
    });

    const cueInput = screen.getByPlaceholderText(/e\.g\. can lah, bojio, chope\.\.\./i);
    const scenarioInput = screen.getByPlaceholderText(/Describe where and how this occurred/i);
    const interpretationInput = screen.getByPlaceholderText(/What did this mean in this context\?/i);

    // Enter sensitive email in scenario
    fireEvent.change(cueInput, { target: { value: 'Teammate ghosted me' } });
    fireEvent.change(scenarioInput, { target: { value: 'Please contact prof at prof.tan@nus.edu.sg immediately.' } });
    fireEvent.change(interpretationInput, { target: { value: 'They might be unavailable right now.' } });

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /Submit Candidate Contribution/i });
    fireEvent.click(submitBtn);

    // Verify privacy warning is shown
    await waitFor(() => {
      expect(screen.getByText(/Please resolve privacy flags before submitting/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Please remove email addresses from the submission/i)).toBeInTheDocument();
    // Verify submit API was NOT called
    expect(communityApi.submitContribution).not.toHaveBeenCalled();
  });

  it('submits clean contribution and shows anonymous receipt', async () => {
    vi.mocked(communityApi.submitContribution).mockResolvedValue({
      contribution_id: 'contrib-abc',
      candidate_id: 'cand-xyz',
      status: 'collecting_perspectives',
      provenance: 'Pending contribution',
      readiness: {
        ready: false,
        missing_requirements: ['need_distinct_contributors'],
        perspective_count: 1,
        distinct_contributors: 1,
      },
      created_at: '2026-03-01T10:00:00Z',
    });

    render(<CommunityPage />);

    await waitFor(() => {
      expect(screen.getByText(/Seen but no reply for 3 hours/i)).toBeInTheDocument();
    });

    // Switch to contribute tab
    fireEvent.click(screen.getByRole('button', { name: /Contribute Context/i }));

    await waitFor(() => {
      expect(screen.getByText(/Contribute a Campus Cue or Interaction/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. can lah, bojio, chope\.\.\./i), {
      target: { value: 'Leaving on read during rush hour' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Describe where and how this occurred/i), {
      target: { value: 'Teammate left the group message on read at 6pm.' },
    });
    fireEvent.change(screen.getByPlaceholderText(/What did this mean in this context\?/i), {
      target: { value: 'Could be commuting on MRT and unable to type comfortably.' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Do not assume all deliverables or timelines are fully locked in\.\.\./i), {
      target: { value: 'Do not assume intentional disrespect.' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Send a brief message confirming the exact time\.\.\./i), {
      target: { value: 'Wait for 2 hours before a polite ping.' },
    });

    const submitBtn = screen.getByRole('button', { name: /Submit Candidate Contribution/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Contribution Submitted Successfully!/i)).toBeInTheDocument();
    });

    expect(screen.getByText('contrib-abc')).toBeInTheDocument();
  });
});
