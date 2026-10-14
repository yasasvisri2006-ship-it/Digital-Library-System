import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DataScienceReaderPage from '../pages/DataScienceReaderPage';
import { useAuth } from '../context/AuthContext';
import {
  fetchDataScienceFile,
  getDataScienceModules,
  getPublicDataScienceModules,
} from '../services/dataScience';
import { openPdfDocument } from '../services/pdfReader';

vi.mock('react-pageflip', () => ({
  default: ({ width, height, usePortrait }) => (
    <div
      data-testid="page-flip-book"
      data-landscape={String(width > height)}
      data-single-slide={String(usePortrait)}
    />
  ),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../services/dataScience', () => ({
  fetchDataScienceFile: vi.fn(),
  getDataScienceModules: vi.fn(),
  getPublicDataScienceModules: vi.fn(),
}));

vi.mock('../services/pdfReader', () => ({
  openPdfDocument: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('static presentation flipbook', () => {
  it('loads bundled slide pages directly without calling the API', async () => {
    const pdf = {
      numPages: 12,
      getPage: vi.fn().mockResolvedValue({
        getViewport: () => ({ width: 960, height: 540 }),
      }),
      destroy: vi.fn(),
    };
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['static preview']),
    });
    vi.stubGlobal('fetch', fetch);
    useAuth.mockReturnValue({ user: null });
    openPdfDocument.mockResolvedValue(pdf);

    render(
      <MemoryRouter initialEntries={['/modules/data-science/1/read/module-1-material-1']}>
        <Routes>
          <Route path="/modules/data-science/:moduleId/read/:materialId" element={<DataScienceReaderPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('page-flip-book')).toHaveAttribute('data-landscape', 'true');
    expect(screen.getByTestId('page-flip-book')).toHaveAttribute('data-single-slide', 'true');
    expect(screen.getByText('Page 1–2 of 12')).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      '/data-science/previews/module1/Data%20Analysis%20and%20Analytics.pdf',
    ));
    expect(getPublicDataScienceModules).not.toHaveBeenCalled();
    expect(getDataScienceModules).not.toHaveBeenCalled();
    expect(fetchDataScienceFile).not.toHaveBeenCalled();
  });
});
