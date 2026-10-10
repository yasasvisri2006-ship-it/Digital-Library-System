import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import ResumePage from '../pages/ResumePage';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: { get: vi.fn() },
}));

afterEach(cleanup);

it('loads the resume and opens the browser print flow for PDF export', async () => {
  const user = userEvent.setup();
  api.get.mockResolvedValue({
    data: {
      data: {
        resume: { displayName: 'Test Student', skills: [], education: [], internships: [], achievements: [], publicSections: [] },
        projects: [],
        certificates: [],
      },
    },
  });
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  render(<ResumePage />);

  expect(await screen.findByRole('heading', { name: 'My Resume' })).toBeInTheDocument();
  await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Export / Print PDF' }));

  expect(api.get).toHaveBeenCalledWith('/portfolio/resume', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(print).toHaveBeenCalledOnce();
});
