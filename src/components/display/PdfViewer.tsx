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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const convertPdfToImages = async () => {
      setIsLoading(true);
      setError(null);
      setPageImages([]);

      try {
        const loadingTask = getDocument(url);
        const pdf: PDFDocumentProxy = await loadingTask.promise;
        
        const images: string[] = [];
        // Loop through all pages
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
          // Using JPEG for smaller file sizes compared to PNG
          images.push(canvas.toDataURL('image/jpeg', 0.9));
        }
        
        setPageImages(images);
      } catch (err) {
        console.error('Error processing PDF:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load or convert PDF.';
        setError(errorMessage);
        onError(); // Notify parent of the error
      } finally {
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
  }, [url, onError]);

  // This effect handles cycling through the generated images
  useEffect(() => {
    if (pageImages.length <= 1) return;

    // Calculate duration per page, with a minimum of 1 second
    const pageDuration = Math.max(1000, (duration * 1000) / pageImages.length);

    const interval = setInterval(() => {
      setCurrentPageIndex((prevIndex) => {
        // Stop at the last page; parent timer will advance to the next content item.
        if (prevIndex >= pageImages.length - 1) {
          clearInterval(interval);
          return prevIndex;
        }
        return prevIndex + 1;
      });
    }, pageDuration);

    return () => clearInterval(interval);
  }, [pageImages, duration]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-700 p-4 text-center">
        <Loader2 className="w-12 h-12 mb-4 animate-spin text-primary" />
        <p>Converting PDF to images...</p>
      </div>
    );
  }

  if (error || pageImages.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200 text-red-600 p-4 text-center">
        <FileWarning className="w-16 h-16 mb-4" />
        <p className="text-xl font-semibold">Could not display PDF</p>
        <p className="text-md max-w-xl break-words">{error || `No images were generated from PDF at ${url}`}</p>
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
            alt={`PDF Page ${currentPageIndex + 1}`}
            fill={true}
            style={{ objectFit: "contain" }}
            quality={90}
            priority // Prioritize loading the visible image
            className="animate-fadeIn"
            unoptimized // Data URIs are not optimized by Next.js image optimizer
          />
      ) : (
        // This case should ideally not be hit if loading/error states are handled correctly
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-700 p-4 text-center">
          <Loader2 className="w-12 h-12 mb-4 animate-spin text-primary" />
          <p>Loading page image...</p>
        </div>
      )}
    </div>
  );
}
