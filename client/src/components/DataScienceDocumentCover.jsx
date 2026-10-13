import { FileText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { fetchDataScienceFile } from '../services/dataScience';
import { openPdfDocument } from '../services/pdfReader';

export default function DataScienceDocumentCover({ moduleId, material }) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [renderFailed, setRenderFailed] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '120px' });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !material.canRead || material.fileType === 'TXT' || material.fileType === 'IPYNB') return undefined;
    let active = true;
    let documentTask;
    let renderTask;
    async function renderCover() {
      try {
        const file = await fetchDataScienceFile(moduleId, material.id, true);
        documentTask = await openPdfDocument(await file.arrayBuffer());
        const page = await documentTask.getPage(1);
        if (!active || !canvasRef.current) return;
        const initialViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(138 / initialViewport.width, 164 / initialViewport.height);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        renderTask = page.render({ canvas, canvasContext: context, viewport });
        await renderTask.promise;
      } catch {
        if (active) setRenderFailed(true);
      }
    }
    renderCover();
    return () => {
      active = false;
      renderTask?.cancel();
      documentTask?.destroy();
    };
  }, [visible, moduleId, material]);

  return (
    <span ref={wrapperRef} className={`ds-document-cover ds-cover-${material.fileType.toLowerCase()}`}>
      {material.canRead && !renderFailed && material.fileType !== 'TXT' && material.fileType !== 'IPYNB' && <canvas ref={canvasRef} aria-hidden="true" />}
      {(!material.canRead || renderFailed || material.fileType === 'TXT' || material.fileType === 'IPYNB') && (
        <>
          <span className="ds-cover-mark"><FileText size={24} /></span>
          <span className="ds-cover-kind">{material.fileType} · STUDY MATERIAL</span>
          <strong>{material.title}</strong>
          <span className="ds-cover-file">{material.originalFileName}</span>
        </>
      )}
      {material.canRead && <span className="ds-cover-label">DOCUMENT COVER PREVIEW</span>}
    </span>
  );
}
