import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DataScienceWorkspacePage from '../pages/DataScienceWorkspacePage';
import { getPublicDataScienceModules } from '../services/dataScience';

vi.mock('../services/dataScience', () => ({
  getPublicDataScienceModules: vi.fn(),
}));

afterEach(cleanup);

describe('static Data Science modules', () => {
  it('lists all five modules without requesting the API', () => {
    render(
      <MemoryRouter initialEntries={['/modules/data-science']}>
        <Routes><Route path="/modules/data-science" element={<DataScienceWorkspacePage />} /></Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Data Science' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Open module/ })).toHaveLength(5);
    expect(screen.getByText('16 presentations')).toBeInTheDocument();
    expect(getPublicDataScienceModules).not.toHaveBeenCalled();
    expect(screen.queryByText(/Internal server error/i)).not.toBeInTheDocument();
  });

  it('lists all Module 1 PPTs as static open and download links', () => {
    render(
      <MemoryRouter initialEntries={['/modules/data-science/1']}>
        <Routes><Route path="/modules/data-science/:moduleId" element={<DataScienceWorkspacePage />} /></Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Module 01' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Presentations' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Open PPT/ })).toHaveLength(16);
    expect(screen.getAllByRole('link', { name: 'Download' })).toHaveLength(16);
    expect(screen.getByRole('link', { name: 'Open Introduction to Data Science', exact: true })).toHaveAttribute(
      'href',
      '/data-science/module1/Introduction%20to%20Data%20Science.pptx',
    );
    expect(getPublicDataScienceModules).not.toHaveBeenCalled();
  });

  it('shows an empty static module without calling the API', () => {
    render(
      <MemoryRouter initialEntries={['/modules/data-science/3']}>
        <Routes><Route path="/modules/data-science/:moduleId" element={<DataScienceWorkspacePage />} /></Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Module 03' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No presentations added yet' })).toBeInTheDocument();
    expect(getPublicDataScienceModules).not.toHaveBeenCalled();
  });

  it('lists the Module 2 presentations and PDF as static links', () => {
    render(
      <MemoryRouter initialEntries={['/modules/data-science/2']}>
        <Routes><Route path="/modules/data-science/:moduleId" element={<DataScienceWorkspacePage />} /></Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Module 02' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Open PPT/ })).toHaveLength(6);
    expect(screen.getAllByRole('link', { name: 'Download' })).toHaveLength(6);
    expect(screen.getByRole('link', { name: 'Open Dimensionality. PCA, LDA', exact: true })).toHaveAttribute(
      'href',
      '/data-science/module2/Dimensionality.%20PCA%2C%20LDA.pdf',
    );
    expect(getPublicDataScienceModules).not.toHaveBeenCalled();
  });
});
