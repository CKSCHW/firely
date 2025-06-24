'use client';

import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, FileWarning } from 'lucide-react';

// Configure the worker from a stable CDN URL
// This is necessary for react-pdf to work in a Next.js environment
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;


interface PdfViewerProps {
  url: string;
  duration: number; // Total duration for the whole PDF in seconds
  onError: () => void;
}

export default function PdfViewer({ url, duration, onError }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // The state and effect for containerWidth have been removed to use a simpler CSS-based approach.

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1); // Start from the first page
  }

  useEffect(() => {
    if (!numPages || numPages <= 1) {
      return;
    }

    // Calculate duration per page, ensuring it's at least 1 second
    const pageDuration = Math.max(1000, (duration * 1000) / numPages);

    const interval = setInterval(() => {
      setPageNumber((prevPageNumber) => {
        if (prevPageNumber < numPages) {
          return prevPageNumber + 1;
        }
        // When it reaches the last page, it will just stay there until the parent component advances.
        // The parent component's timer will handle moving to the next content item.
        clearInterval(interval);
        return prevPageNumber;
      });
    }, pageDuration);

    return () => clearInterval(interval);
  }, [numPages, duration]);

  const loadingMessage = (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-700 p-4 text-center">
      <Loader2 className="w-12 h-12 mb-4 animate-spin text-primary" />
      <p>Lade PDF...</p>
    </div>
  );

  const errorMessage = (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200 text-red-600 p-4 text-center">
      <FileWarning className="w-16 h-16 mb-4" />
      <p className="text-xl font-semibold">PDF konnte nicht geladen werden</p>
      <p className="text-md max-w-xl break-words">{url}</p>
    </div>
  );

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden bg-white">
      <Document
        key={url}
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={(error) => {
          console.error(`Error loading PDF document from URL: ${url}. Message:`, error.message);
          onError();
        }}
        loading={loadingMessage}
        error={errorMessage}
        className="flex justify-center items-center w-full h-full"
      >
        <Page
            key={`page_${pageNumber}`}
            pageNumber={pageNumber}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            onRenderError={() => {
              console.error('Error rendering PDF page');
              onError();
            }}
            loading="" // We have a main loader for the document
            // No 'width' prop. Instead, use CSS to ensure the page fits the container.
            // This is like 'object-fit: contain' for the PDF page.
            className="max-h-full max-w-full"
          />
      </Document>
    </div>
  );
}
