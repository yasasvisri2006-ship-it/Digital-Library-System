import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export function openPdfDocument(buffer) {
  return pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
}
