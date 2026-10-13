// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

describe('PDF.js document reader', () => {
  it('opens the real Data Science study PDF and exposes its page count and page geometry', async () => {
    const file = readFileSync(path.resolve(process.cwd(), '../server/content/resources/ds101-study-notes.pdf'));
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(file) }).promise;

    expect(pdf.numPages).toBeGreaterThan(0);
    const firstPage = await pdf.getPage(1);
    expect(firstPage.getViewport({ scale: 1 }).width).toBeGreaterThan(0);

    await pdf.destroy();
  });
});
