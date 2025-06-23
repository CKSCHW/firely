
'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Loader2, FileWarning } from 'lucide-react';

// Configure the worker to ensure it works correctly with Next.js
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();


interface PdfViewerProps {
  url: string;
  onError: () => void;
}

export default function PdfViewer({ url, onError }: PdfViewerProps) {

  const loadingMessage = (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-white p-4 text-center">
      <Loader2 className="w-12 h-12 mb-4 animate-spin" />
      <p>Loading PDF...</p>
    </div>
  );

  const errorMessage = (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black text-yellow-400 p-4 text-center">
      <FileWarning className="w-16 h-16 mb-4" />
      <p className="text-xl font-semibold">Failed to load PDF</p>
      <p className="text-md max-w-xl break-words">{url}</p>
    </div>
  );
  
  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      <Document
        file={url}
        onLoadError={(error) => {
          console.error('Error loading PDF document:', error.message);
          onError();
        }}
        loading={loadingMessage}
        error={errorMessage}
        className="flex justify-center items-center w-full h-full"
      >
        <Page
          pageNumber={1} // For signage, we typically show the first page.
          renderTextLayer={false} // Improves performance on dumb displays
          renderAnnotationLayer={false} // Improves performance
          className="flex justify-center items-center"
          canvasClassName="max-w-full max-h-full object-contain"
          onRenderError={() => {
            console.error('Error rendering PDF page');
            onError();
          }}
        />
      </Document>
    </div>
  );
}
