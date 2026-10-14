import HTMLFlipBook from 'react-pageflip';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize,
  Minimize,
  Minus,
  Plus,
} from 'lucide-react';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchDataScienceFile, fetchPublicStaticDataSciencePreview, getDataScienceModules, getPublicDataScienceModules } from '../services/dataScience';
import { openPdfDocument } from '../services/pdfReader';
import { useAuth } from '../context/AuthContext';
import { dataScienceModules } from '../data/dataScienceModules';

const BookPage = forwardRef(function BookPage({ pdf, pageNumber, width, height }, ref) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const pageElement = ref?.current;
    if (!pageElement) return undefined;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '700px' });
    observer.observe(pageElement);
    return () => observer.disconnect();
  }, [ref]);

  useEffect(() => {
    if (!visible) return undefined;
    let active = true;
    let renderTask;
    async function paint() {
      try {
        const page = await pdf.getPage(pageNumber);
        if (!active || !canvasRef.current) return;
        const original = page.getViewport({ scale: 1 });
        const scale = Math.min((width - 38) / original.width, (height - 56) / original.height);
        const viewport = page.getViewport({ scale });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('A canvas context is not available.');
        canvas.width = Math.ceil(viewport.width * ratio);
        canvas.height = Math.ceil(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0],
        });
        await renderTask.promise;
      } catch {
        if (active) setError(true);
      }
    }
    paint();
    return () => {
      active = false;
      renderTask?.cancel();
    };
  }, [pdf, pageNumber, width, height, visible]);

  return (
    <div ref={ref} className="ds-book-page">
      {error ? <p className="ds-book-page-error">This page could not be rendered.</p> : <canvas ref={canvasRef} />}
      <span className="ds-book-page-number">{pageNumber}</span>
    </div>
  );
});

function PageThumbnail({ pdf, pageNumber, selected, onSelect }) {
  const buttonRef = useRef(null);
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return undefined;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '80px' });
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    let active = true;
    let renderTask;
    async function paintThumbnail() {
      try {
        const page = await pdf.getPage(pageNumber);
        if (!active || !canvasRef.current) return;
        const initialViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(98 / initialViewport.width, 122 / initialViewport.height) });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        renderTask = page.render({ canvas, canvasContext: context, viewport });
        await renderTask.promise;
      } catch {
        if (active) setVisible(false);
      }
    }
    paintThumbnail();
    return () => {
      active = false;
      renderTask?.cancel();
    };
  }, [visible, pdf, pageNumber]);

  return (
    <button ref={buttonRef} type="button" className={`ds-reader-thumbnail${selected ? ' is-selected' : ''}`} onClick={onSelect} aria-label={`Go to page ${pageNumber}`} aria-current={selected ? 'page' : undefined}>
      <canvas ref={canvasRef} />
      <span>Page {pageNumber}</span>
    </button>
  );
}

function saveDownload(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

export default function DataScienceReaderPage() {
  const { moduleId, materialId } = useParams();
  const { user } = useAuth();
  const readerRef = useRef(null);
  const shellRef = useRef(null);
  const [module, setModule] = useState(null);
  const [material, setMaterial] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [text, setText] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageWidth, setPageWidth] = useState(440);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadBusy, setDownloadBusy] = useState(false);

  useEffect(() => {
    function updateSize() {
      const mobile = window.innerWidth < 880;
      setPageWidth(mobile
        ? Math.max(280, Math.min(500, window.innerWidth - 44))
        : Math.max(300, Math.min(450, (window.innerWidth - 390) / 2)));
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!document) return undefined;
    function handleFullscreenChange() {
      setFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    let active = true;
    let pdfDocument;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const staticModule = dataScienceModules.find((item) => item.id === moduleId);
        const staticMaterial = staticModule?.materials.find((item) => item.id === materialId);
        if (staticModule && staticMaterial) {
          setModule(staticModule);
          setMaterial(staticMaterial);
          const file = await fetchPublicStaticDataSciencePreview(moduleId, staticMaterial.originalFileName);
          if (!active) return;
          pdfDocument = await openPdfDocument(await file.arrayBuffer());
          if (active) setPdf(pdfDocument);
          return;
        }

        let modules = await getPublicDataScienceModules();
        const foundModule = modules.find((item) => item.id === moduleId);
        let foundMaterial = foundModule?.materials.find((item) => item.id === materialId);
        if ((!foundModule || !foundMaterial) && user?.role === 'student') {
          modules = await getDataScienceModules();
        }
        const resolvedModule = modules.find((item) => item.id === moduleId);
        foundMaterial = resolvedModule?.materials.find((item) => item.id === materialId);
        if (!resolvedModule || !foundMaterial) throw new Error('This published study material was not found.');
        if (!active) return;
        setModule(resolvedModule);
        setMaterial(foundMaterial);
        if (!foundMaterial.canRead && foundMaterial.previewError) throw new Error(foundMaterial.previewError);
        const isPublic = resolvedModule.isPublic && foundMaterial.isPublished;
        const file = await fetchDataScienceFile(moduleId, materialId, true, isPublic);
        if (!active) return;
        if (file.type === 'application/pdf' || foundMaterial.fileType === 'PDF') {
          pdfDocument = await openPdfDocument(await file.arrayBuffer());
          if (active) setPdf(pdfDocument);
        } else if (['TXT', 'IPYNB'].includes(foundMaterial.fileType)) {
          const contents = await file.text();
          setText(foundMaterial.fileType === 'IPYNB' ? JSON.stringify(JSON.parse(contents), null, 2) : contents);
        } else {
          throw new Error('This document does not yet have a browser preview. Download the original to open it.');
        }
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || requestError.message || 'The document could not be opened.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
      pdfDocument?.destroy();
    };
  }, [moduleId, materialId, user?.role]);

  const onFlip = useCallback((event) => setCurrentPage(Number(event.data)), []);
  const pageCount = pdf?.numPages || 0;
  const isMobile = window.innerWidth < 880;
  const pageHeight = Math.round(pageWidth * 1.38);

  function turnPage(direction) {
    const flipBook = readerRef.current?.pageFlip();
    if (!flipBook) return;
    if (direction < 0) flipBook.flipPrev();
    else flipBook.flipNext();
  }

  function goToPage(pageNumber) {
    readerRef.current?.pageFlip().flip(pageNumber - 1);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shellRef.current?.requestFullscreen();
    } catch {
      setError('Fullscreen is unavailable in this browser or page context.');
    }
  }

  async function downloadOriginal() {
    if (!material) return;
    setDownloadBusy(true);
    setError('');
    try {
      if (material.url) {
        const response = await fetch(material.url);
        if (!response.ok) throw new Error('The original file could not be downloaded.');
        saveDownload(await response.blob(), material.originalFileName);
        return;
      }
      const original = await fetchDataScienceFile(moduleId, materialId, false, module.isPublic && material.isPublished);
      saveDownload(original, material.originalFileName);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The original file could not be downloaded.');
    } finally {
      setDownloadBusy(false);
    }
  }

  useEffect(() => {
    function handleKeydown(event) {
      if (event.key === 'ArrowRight') turnPage(1);
      if (event.key === 'ArrowLeft') turnPage(-1);
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  return (
    <main ref={shellRef} className="ds-reader-shell">
      <header className="ds-reader-toolbar">
        <Link to={`/modules/data-science/${moduleId}`} className="ds-reader-back"><ArrowLeft size={16} /><span>Back to Module</span></Link>
        <div className="ds-reader-document-title">{material?.title || 'Data Science reader'}<span>{material?.originalFileName || ''}</span></div>
        <div className="ds-reader-header-actions">
          <button type="button" onClick={downloadOriginal} disabled={!material || downloadBusy}><Download size={15} /> <span>Download Original</span></button>
          <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>{fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}</button>
          <Link to={`/modules/data-science/${moduleId}`} aria-label="Close reader" title="Close reader">×</Link>
        </div>
      </header>

      {error && <p className="ds-reader-message is-error" role="alert">{error}</p>}
      {loading ? <div className="ds-reader-loading" role="status">Preparing your document...</div> : error ? (
        <div className="ds-reader-loading" role="status">Preview unavailable. Use Download Original or return to the module.</div>
      ) : (
        <div className="ds-reader-body">
          {pdf && <aside className="ds-reader-toc" aria-label="Page thumbnails">
            <h2>Pages <span>{pageCount}</span></h2>
            <div className="ds-reader-thumbnail-list">{Array.from({ length: pageCount }, (_, index) => (
              <PageThumbnail
                key={index + 1}
                pdf={pdf}
                pageNumber={index + 1}
                selected={index + 1 >= currentPage + 1 && index + 1 <= Math.min(currentPage + (isMobile ? 1 : 2), pageCount)}
                onSelect={() => goToPage(index + 1)}
              />
            ))}</div>
          </aside>}

          <section className="ds-reader-document" aria-label="Document reader">
            {pdf ? (
              <div className="ds-book-stage">
                <div className="ds-book-zoom" style={{ transform: `scale(${zoom})` }}>
                  <HTMLFlipBook
                    key={`${pageWidth}-${pageHeight}`}
                    ref={readerRef}
                    width={pageWidth}
                    height={pageHeight}
                    size="fixed"
                    minWidth={pageWidth}
                    maxWidth={pageWidth}
                    minHeight={pageHeight}
                    maxHeight={pageHeight}
                    showCover={false}
                    usePortrait={isMobile}
                    drawShadow
                    maxShadowOpacity={0.28}
                    flippingTime={780}
                    mobileScrollSupport
                    onFlip={onFlip}
                    className="ds-page-flip-book"
                  >
                    {Array.from({ length: pageCount }, (_, index) => (
                      <BookPage key={index + 1} pdf={pdf} pageNumber={index + 1} width={pageWidth} height={pageHeight} />
                    ))}
                  </HTMLFlipBook>
                </div>
              </div>
            ) : (
              <article className="ds-text-document">
                <span>{material?.fileType} · {module?.title}</span>
                <h1>{material?.title}</h1>
                <pre>{text}</pre>
              </article>
            )}

            <div className="ds-reader-controls">
              {pdf && <div className="ds-page-navigation">
                <button type="button" aria-label="Previous page" onClick={() => turnPage(-1)} disabled={currentPage <= 0}><ChevronLeft size={17} /> Previous</button>
                <span>Page {pageCount ? currentPage + 1 : 0}{!isMobile && pageCount > 1 ? `–${Math.min(currentPage + 2, pageCount)}` : ''} of {pageCount}</span>
                <button type="button" aria-label="Next page" onClick={() => turnPage(1)} disabled={currentPage >= pageCount - (isMobile ? 1 : 2)}><span>Next</span><ChevronRight size={17} /></button>
              </div>}
              <div className="ds-zoom-controls" aria-label="Zoom controls">
                <button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.7, Math.round((value - 0.1) * 10) / 10))} disabled={zoom <= 0.7}><Minus size={15} /></button>
                <span>{Math.round(zoom * 100)}%</span>
                <button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(1.5, Math.round((value + 0.1) * 10) / 10))} disabled={zoom >= 1.5}><Plus size={15} /></button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
