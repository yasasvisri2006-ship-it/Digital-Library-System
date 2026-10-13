import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import api from '../services/api';
import { getEducationalMaterials } from '../services/educationalMaterials';
import { learningTools } from '../data/learningTools';
import CodingPracticePage from '../pages/CodingPracticePage';
import CloudLearningPage from '../pages/CloudLearningPage';
import EducationalSectionPage from '../pages/EducationalSectionPage';
import ModulesPage from '../pages/ModulesPage';
import SubjectsPage from '../pages/SubjectsPage';
import ToolDetailPage from '../pages/ToolDetailPage';
import ToolsPage from '../pages/ToolsPage';
import PublicPortfolioPage from '../pages/PublicPortfolioPage';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('../services/educationalMaterials', () => ({
  getEducationalMaterials: vi.fn(),
}));

afterEach(cleanup);

describe('public read-only learning pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockRejectedValue(new Error('Personal endpoints must not be called while signed out.'));
    getEducationalMaterials.mockImplementation(async (section) => [{
      slug: `sample-${section}`,
      section,
      title: `Sample ${section} learning resource`,
      description: 'Public read-only material.',
      subjectName: null,
      semester: null,
      moduleNumber: null,
      category: 'LEARNING RESOURCE',
      content: { example: 'print("learn")' },
      sourceUrl: null,
      fileUrl: null,
      fileName: null,
    }]);
  });

  async function renderRoute(path, element, routePattern = path) {
    const result = render(
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path={routePattern} element={element} /></Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(api.get).not.toHaveBeenCalled());
    return result;
  }

  it('opens an explicitly published resume portfolio without signing in', async () => {
    api.get.mockResolvedValue({
      data: {
        data: {
          portfolio: {
            resume: {
              displayName: 'Peta Yasasvisri',
              summary: '',
              contact: null,
              education: [{
                institution: 'Mohan Babu University',
                qualification: 'B.Tech',
                field: 'CSE (DS)',
                details: 'Current standing: 3rd Year · 5th Semester',
              }],
              skills: [],
              internships: [],
              achievements: [],
              social: {
                linkedInUrl: 'https://linkedin.com/in/peta-yasasvisri-reddy-28763b379/',
                githubUrl: 'https://github.com/yasasvisri2006-ship-it',
              },
            },
            projects: [],
            certificates: [],
          },
        },
      },
    });
    render(
      <MemoryRouter initialEntries={['/portfolio/public-resume']}>
        <Routes><Route path="/portfolio/:slug" element={<PublicPortfolioPage />} /></Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Peta Yasasvisri' })).toBeInTheDocument();
    expect(screen.getByText('Mohan Babu University')).toBeInTheDocument();
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/public/portfolio/public-resume', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('shows the read-only subject curriculum without requiring a student account', async () => {
    await renderRoute('/my-subjects', <SubjectsPage />);
    expect(screen.getByRole('heading', { name: 'My Subjects' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Suggested Data Science curriculum' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add subject/i })).not.toBeInTheDocument();
  });

  it('shows only the Data Science workspace card on Modules while preserving My Learning and Lab Experiments', async () => {
    await renderRoute('/modules', <ModulesPage />);
    expect(screen.getByRole('heading', { name: 'Learning Modules' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Data Science/ })).toHaveLength(1);
    for (const subject of ['Python', 'SQL', 'Data Analysis', 'Machine Learning', 'Data Visualization', 'Power BI', 'AWS Cloud', 'Project Work']) {
      expect(screen.queryByText(subject, { exact: true })).not.toBeInTheDocument();
    }
    expect(getEducationalMaterials).not.toHaveBeenCalled();
    cleanup();

    await renderRoute('/my-learning', <EducationalSectionPage />);
    expect(await screen.findByRole('heading', { name: 'My Learning' })).toBeInTheDocument();
    cleanup();

    await renderRoute('/lab-experiments', <EducationalSectionPage />);
    expect(await screen.findByRole('heading', { name: 'Lab Experiments' })).toBeInTheDocument();
  });

  it('shows tools, cloud notes, and coding resources without private progress requests', async () => {
    const user = userEvent.setup();
    await renderRoute('/tools', <ToolsPage />);
    expect(await screen.findByRole('heading', { name: 'Practical tool examples' })).toBeInTheDocument();
    cleanup();

    await renderRoute('/cloud-aws', <CloudLearningPage />);
    expect(await screen.findByRole('heading', { name: 'AWS learning notes and safe practice' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'AWS course progress' })).not.toBeInTheDocument();
    cleanup();

    await renderRoute('/coding-practice', <CodingPracticePage />);
    expect(await screen.findByRole('heading', { name: 'Guided problem bank' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add problem' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Python code editor' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Editor language' })).toHaveValue('PYTHON');
    expect(screen.getByRole('button', { name: 'Run Code' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Output' })).toBeInTheDocument();
    expect(screen.getByText(/sent to the administrator-configured Judge0 sandbox/)).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Python code editor' }), 'print("Hello, World!")');
    api.post.mockResolvedValue({
      data: {
        data: {
          execution: {
            stdout: 'Hello, World!\n',
            stderr: '',
            exitCode: null,
            status: 'Accepted',
            error: null,
            outputTruncated: false,
          },
        },
      },
    });
    await user.click(screen.getByRole('button', { name: 'Run Code' }));
    expect(await screen.findByText('Hello, World!')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/learning/coding/execute', {
      language: 'PYTHON',
      code: 'print("Hello, World!")',
    });
    await user.click(screen.getByRole('button', { name: 'Clear Output' }));
    expect(screen.getByText(/Output will appear here/)).toBeInTheDocument();
  });

  it('opens a public tool guide while keeping its saved notes private', async () => {
    const tool = learningTools[0];
    await renderRoute(`/tools/${tool.key}`, <ToolDetailPage />, '/tools/:toolKey');
    expect(screen.getByRole('heading', { name: tool.title })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Progress & notes' })).not.toBeInTheDocument();
  });
});
