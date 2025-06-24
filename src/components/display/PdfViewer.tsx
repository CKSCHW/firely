
'use client';

import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Loader2, FileWarning } from 'lucide-react';

interface PdfViewerProps {
  url: string;
  duration: number; // Total duration for the whole PDF in seconds
  onError: () => void;
}

export default function PdfViewer({ url, duration, onError }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | undefined>();
  const [isWorkerLoaded, setIsWorkerLoaded] = useState(false);

  useEffect(() => {
    // Configure worker only on the client side inside a useEffect hook.
    // This prevents server-side rendering errors.
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
      setIsWorkerLoaded(true);
    } catch (error) {
      console.error("Failed to set PDF worker source:", error);
      onError();
    }
  }, [onError]);


  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1); // Start from the first page
  }

  useEffect(() => {
    if (!numPages || numPages <= 1) {
      return;
    }

    const pageDuration = Math.max(1000, (duration * 1000) / numPages);

    const interval = setInterval(() => {
      setPageNumber((prevPageNumber) => {
        if (prevPageNumber < numPages) {
          return prevPageNumber + 1;
        }
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
  
  if (!isWorkerLoaded) {
    return loadingMessage; // Show loading until worker is configured
  }

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
        {containerWidth && (
          <Page
            key={`page_${pageNumber}`}
            pageNumber={pageNumber}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            onRenderError={() => {
              console.error('Error rendering PDF page');
              onError();
            }}
            loading=""
            width={containerWidth}
          />
        )}
      </Document>
    </div>
  );
}
