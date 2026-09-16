import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { ExplorePage } from './ExplorePage';
import * as libraryApi from '../../services/api/library';

vi.mock('../../services/api/library', () => ({
  fetchLibraryCards: vi.fn(),
}));

describe('ExplorePage', () => {
  const mockLibraryData = {
    cards: [
      {
        id: 'sg-seed-01',
        title: 'Can lah confirmation',
        expression: 'can lah',
        scenario: 'Teammate says "can lah" to project task schedule',
        scenario_family: 'Teamwork',
        relationship: 'classmate',
        channel: 'chat',
        formality: 'casual',
        provenance: 'Synthetic seed',
        do_not_assume: 'Do not assume uncertainty.',
        safe_action: 'Proceed with the proposed schedule.',
        evidence_scope: 'Singapore undergraduate group chats.',
        tags: ['singapore', 'campus', 'teamwork'],
      },
      {
        id: 'sg-comm-02',
        title: 'Seen without immediate reply',
        expression: 'leaving on read',
        scenario: 'Sent urgent project update at 6:30pm',
        scenario_family: 'Teamwork',
        relationship: 'teammate',
        channel: 'chat',
        formality: 'casual',
        provenance: 'Community-reviewed',
        do_not_assume: 'Do not assume intentional ghosting.',
        safe_action: 'Wait 2 hours before gentle reminder.',
        evidence_scope: 'Singapore campus communications.',
        tags: ['community', 'reviewed', 'teamwork'],
      },
    ],
    total: 2,
    cursor: 0,
    limit: 20,
    facets: {
      scenario_family: { Teamwork: 2 },
      relationship: { classmate: 1, teammate: 1 },
      channel: { chat: 2 },
      formality: { casual: 2 },
      evidence_level: { synthetic: 1, community: 1 },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(libraryApi.fetchLibraryCards).mockResolvedValue(mockLibraryData as any);
  });

  it('renders library header, cards, and provenance badges', async () => {
    render(
      <MemoryRouter>
        <ExplorePage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Scenario Discovery Library/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Can lah confirmation')).toBeInTheDocument();
      expect(screen.getByText('Seen without immediate reply')).toBeInTheDocument();
    });

    // Verify badges
    expect(screen.getAllByText(/Synthetic seed/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Community-reviewed/i).length).toBeGreaterThan(0);
  });

  it('filters cards by search query', async () => {
    render(
      <MemoryRouter>
        <ExplorePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Can lah confirmation')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search cues, e\.g\. bojio, can lah\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'leaving on read' } });
    fireEvent.submit(searchInput.closest('form')!);

    await waitFor(() => {
      expect(libraryApi.fetchLibraryCards).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'leaving on read' })
      );
    });
  });
});
