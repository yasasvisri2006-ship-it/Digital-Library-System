import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DataScienceWorkspacePage from '../pages/DataScienceWorkspacePage';
import {
  getPublicDataScienceModules,
  uploadPublicDataScienceMaterial,
} from '../services/dataScience';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('../components/DataScienceDocumentCover', () => ({
  default: ({ material }) => <span>{material.originalFileName}</span>,
}));

vi.mock('../services/dataScience', () => ({
  getPublicDataScienceModules: vi.fn(),
  deleteDataScienceMaterial: vi.fn(),
  deleteDataScienceModule: vi.fn(),
  fetchDataScienceFile: vi.fn(),
  updateDataScienceMaterial: vi.fn(),
  updateDataScienceModule: vi.fn(),
  uploadPublicDataScienceMaterial: vi.fn(),
}));

afterEach(cleanup);

describe('public Data Science module access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists the existing five public modules without asking visitors to sign in', async () => {
    getPublicDataScienceModules.mockResolvedValue(Array.from({ length: 5 }, (_, index) => ({
      id: `module-${index + 1}`,
      number: index + 1,
      title: `Module ${String(index + 1).padStart(2, '0')}`,
      materials: [],
      canManage: false,
    })));

    render(
      <MemoryRouter initialEntries={['/modules/data-science']}>
        <Routes><Route path="/modules/data-science" element={<DataScienceWorkspacePage />} /></Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Data Science' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Open module/ })).toHaveLength(5);
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add module/i })).not.toBeInTheDocument();
  });

  it('opens published study materials and allows anonymous uploads', async () => {
    const moduleId = '00000000-0000-4000-8000-000000000093';
    getPublicDataScienceModules.mockResolvedValue([{
      id: moduleId,
      number: 1,
      title: 'Module 01',
      isPublic: true,
      canManage: false,
      materials: [{
        id: '00000000-0000-4000-8000-000000000094',
        title: 'Published presentation',
        originalFileName: 'presentation.pptx',
        fileType: 'PPTX',
        uploadedAt: '2026-10-13T10:00:00.000Z',
        isPublished: true,
        canRead: true,
      }],
    }]);

    render(
      <MemoryRouter initialEntries={[`/modules/data-science/${moduleId}`]}>
        <Routes><Route path="/modules/data-science/:moduleId" element={<DataScienceWorkspacePage />} /></Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Module 01' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Published presentation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Read Book/ })).toHaveAttribute(
      'href',
      `/modules/data-science/${moduleId}/read/00000000-0000-4000-8000-000000000094`,
    );
    expect(screen.getByRole('heading', { name: /upload/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Choose a file/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /publish/i })).not.toBeInTheDocument();
    await waitFor(() => expect(getPublicDataScienceModules).toHaveBeenCalled());
  });

  it('uploads and publishes a visitor-selected PPT without sign-in', async () => {
    const moduleId = '00000000-0000-4000-8000-000000000093';
    getPublicDataScienceModules.mockResolvedValue([{
      id: moduleId,
      number: 1,
      title: 'Module 01',
      isPublic: true,
      canManage: false,
      materials: [],
    }]);
    uploadPublicDataScienceMaterial.mockResolvedValue({ isPublished: true, previewError: null });
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={[`/modules/data-science/${moduleId}`]}>
        <Routes><Route path="/modules/data-science/:moduleId" element={<DataScienceWorkspacePage />} /></Routes>
      </MemoryRouter>,
    );

    const selectedFile = new File(['real selected pptx bytes'], 'lecture-slides.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });
    await user.upload(await screen.findByLabelText(/Choose a file/), selectedFile);
    fireEvent.submit(screen.getByRole('button', { name: 'Upload Material' }).closest('form'));

    expect(uploadPublicDataScienceMaterial).toHaveBeenCalledWith(moduleId, 'lecture-slides', selectedFile);
    expect(await screen.findByText('Study material uploaded and published for public reading.')).toBeInTheDocument();
  });
});
