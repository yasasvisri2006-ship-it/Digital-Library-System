import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import ResumePage from '../pages/ResumePage';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

afterEach(cleanup);

it('shows a profile-based resume starter without publishing it', async () => {
  api.get.mockResolvedValue({
    data: {
      data: {
        resume: {
          displayName: 'Peta Yasasvisri',
          email: 'student@example.test',
          skills: [],
          education: [{
            institution: 'Mohan Babu University',
            qualification: 'B.Tech',
            field: 'CSE (DS)',
            details: 'Current standing: 3rd Year · 5th Semester',
          }],
          internships: [],
          achievements: [],
          publicSections: [],
          isPublic: false,
        },
        projects: [],
        certificates: [],
      },
    },
  });
  render(<ResumePage />);

  expect(await screen.findByRole('heading', { name: 'My Resume' })).toBeInTheDocument();
  expect(screen.getByDisplayValue('Peta Yasasvisri')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Mohan Babu University')).toBeInTheDocument();
  expect(screen.getByDisplayValue('B.Tech')).toBeInTheDocument();
  expect(screen.getByDisplayValue('CSE (DS)')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Peta Yasasvisri' })).toBeInTheDocument();
  expect(screen.getByLabelText('Enable my public portfolio page')).not.toBeChecked();
});

it('publishes only the resume sections selected as safe for public sharing', async () => {
  const user = userEvent.setup();
  api.get.mockResolvedValue({
    data: {
      data: {
        resume: {
          displayName: 'Peta Yasasvisri',
          email: 'student@example.test',
          phone: '',
          location: '',
          skills: [],
          education: [{ institution: 'Mohan Babu University', qualification: 'B.Tech', field: 'CSE (DS)' }],
          internships: [],
          achievements: [],
          publicSections: [],
          isPublic: false,
          publicSlug: 'public-resume-slug',
        },
        projects: [],
        certificates: [],
      },
    },
  });
  api.put.mockResolvedValue({
    data: {
      data: {
        resume: {
          isPublic: true,
          publicSections: ['education', 'social'],
          publicSlug: 'public-resume-slug',
        },
      },
    },
  });
  render(<ResumePage />);

  await user.click(await screen.findByRole('button', { name: 'Publish resume publicly' }));

  expect(api.put).toHaveBeenCalledWith('/portfolio/resume', expect.objectContaining({
    isPublic: true,
    publicSections: ['education', 'social'],
    email: 'student@example.test',
  }));
  expect(await screen.findByRole('status')).toHaveTextContent('Anyone with the link can view it without signing in.');
  expect(screen.getByLabelText('Enable my public portfolio page')).toBeChecked();
  expect(screen.getByLabelText('Public portfolio URL')).toHaveValue(`${window.location.origin}/portfolio/public-resume-slug`);
  expect(screen.queryByRole('button', { name: 'Publish resume publicly' })).not.toBeInTheDocument();
});

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

it('uploads a PDF resume and displays a private open and download option', async () => {
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
  api.post.mockResolvedValue({
    data: { data: { resume: { fileName: 'my-resume.pdf', fileSize: 12, fileUrl: '/portfolio/resume/file' } } },
  });
  render(<ResumePage />);

  const file = new File(['%PDF-1.4\nresume'], 'my-resume.pdf', { type: 'application/pdf' });
  await user.upload(await screen.findByLabelText('Upload PDF'), file);

  expect(api.post).toHaveBeenCalledWith('/portfolio/resume/file', expect.any(FormData));
  expect(await screen.findByText('my-resume.pdf')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Resume uploaded privately.');
});
