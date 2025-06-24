'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import { Loader2, FileWarning } from 'lucide-react';

// The version should ideally match the installed package version.
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface PdfViewerProps {
  url: string;
  duration: number; // Total duration for the whole PDF in seconds
  onError: () => void;
}

const RENDER_SCALE = 2; // Render at a higher resolution for better quality on large screens

export default function PdfViewer({ url, duration, onError }: PdfViewerProps) {
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const convertPdfToImages = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      setError(null);
      setPageImages([]);
      setNumPages(0);

      try {
        const loadingTask = getDocument(url);
        const pdf: PDFDocumentProxy = await loadingTask.promise;
        if (!isMounted) return;
        setNumPages(pdf.numPages);
        
        // Loop through all pages to render them
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: RENDER_SCALE });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');

          if (!context) {
            throw new Error('Could not get 2D context from canvas');
          }
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };

          await page.render(renderContext).promise;
          if (!isMounted) return;

          // Using JPEG for smaller file sizes compared to PNG
          const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
          setPageImages((prevImages) => [...prevImages, imageUrl]);

          // After rendering the first page, we can hide the main loader
          if (i === 1) {
            setIsLoading(false);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error processing PDF:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load or convert PDF.';
        setError(errorMessage);
        onError(); // Notify parent of the error
        setIsLoading(false);
      }
    };

    if (url) {
      convertPdfToImages();
    } else {
        setIsLoading(false);
        setError("No PDF URL provided.");
        onError();
    }
    
    return () => {
      isMounted = false;
    }
  }, [url, onError]);

  // This effect handles cycling through the pages
  useEffect(() => {
    // Don't start slideshow for single-page PDFs or until numPages is known
    if (numPages <= 1) return;

    // Calculate duration per page, with a minimum of 1 second
    const pageDuration = Math.max(1000, (duration * 1000) / numPages);

    const interval = setInterval(() => {
      setCurrentPageIndex((prevIndex) => {
        // Stop advancing if we are at the last page of the entire PDF
        if (prevIndex >= numPages - 1) {
          clearInterval(interval);
          return prevIndex;
        }
        return prevIndex + 1;
      });
    }, pageDuration);

    return () => clearInterval(interval);
  }, [duration, numPages]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-700 p-4 text-center">
        <Loader2 className="w-12 h-12 mb-4 animate-spin text-primary" />
        <p>Preparing PDF document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200 text-red-600 p-4 text-center">
        <FileWarning className="w-16 h-16 mb-4" />
        <p className="text-xl font-semibold">Could not display PDF</p>
        <p className="text-md max-w-xl break-words">{error}</p>
      </div>
    );
  }
  
  const currentImageSrc = pageImages[currentPageIndex];

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden bg-white">
      {currentImageSrc ? (
         <Image
            key={currentPageIndex}
            src={currentImageSrc}
            alt={`PDF Page ${currentPageIndex + 1} of ${numPages}`}
            fill={true}
            style={{ objectFit: "contain" }}
            quality={90}
            priority // Prioritize loading the visible image
            className="animate-fadeIn"
            unoptimized // Data URIs are not optimized by Next.js image optimizer
          />
      ) : (
        // This case is hit if the slideshow advances to a page that hasn't been rendered yet
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-700 p-4 text-center">
          <Loader2 className="w-12 h-12 mb-4 animate-spin text-primary" />
          <p>Loading page {currentPageIndex + 1}...</p>
        </div>
      )}
    </div>
  );
}
