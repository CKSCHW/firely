
'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Loader2, FileWarning } from 'lucide-react';

// Configure the worker to ensure it works correctly with Next.js by using a CDN.
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;


interface PdfViewerProps {
  url: string;
  duration: number; // Total duration for the whole PDF in seconds
  onError: () => void;
}

export default function PdfViewer({ url, duration, onError }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1); // Start from the first page
  }

  useEffect(() => {
    if (!numPages || numPages <= 1) {
      return; // No need to cycle for single-page PDFs or if numPages isn't known yet
    }

    // Calculate duration per page in milliseconds. Min of 1s per page.
    const pageDuration = Math.max(1000, (duration * 1000) / numPages);

    const interval = setInterval(() => {
      setPageNumber((prevPageNumber) => {
        if (prevPageNumber < numPages) {
          return prevPageNumber + 1;
        }
        // When it reaches the last page, it will stay there until the parent component
        // advances to the next content item.
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
    <div className="w-full h-full flex items-center justify-center overflow-hidden bg-white">
      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={(error) => {
          console.error('Error loading PDF document:', error.message);
          onError();
        }}
        loading={loadingMessage}
        error={errorMessage}
        className="flex justify-center items-center w-full h-full"
      >
        <Page
          pageNumber={pageNumber}
          renderTextLayer={false} // Improves performance on dumb displays
          renderAnnotationLayer={false} // Improves performance
          className="flex justify-center items-center"
          canvasClassName="max-w-full max-h-full object-contain"
          onRenderError={() => {
            console.error('Error rendering PDF page');
            onError();
          }}
          loading="" // Hide the default "Loading page..." text from react-pdf
        />
      </Document>
    </div>
  );
}
