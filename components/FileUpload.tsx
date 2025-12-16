import React, { useCallback, useState, useRef } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, X, Loader2, AlertCircle, Layers } from 'lucide-react';
import { SupportedMimeType } from '../types';

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
  onClear?: () => void;
  isProcessing: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelect, onClear, isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setError(null);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateAndProcessFiles = useCallback((fileList: FileList | File[]) => {
    setError(null);
    const validTypes: SupportedMimeType[] = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const validFiles: File[] = [];
    let hasInvalid = false;

    Array.from(fileList).forEach(file => {
      if (validTypes.includes(file.type as SupportedMimeType)) {
        validFiles.push(file);
      } else {
        hasInvalid = true;
      }
    });

    if (hasInvalid) {
      setError("Beberapa file dilewati karena format tidak didukung (Gunakan JPG, PNG, WEBP, PDF).");
    }

    if (validFiles.length > 0) {
      onFilesSelect(validFiles);
    }
  }, [onFilesSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFiles(e.dataTransfer.files);
    }
  }, [validateAndProcessFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFiles(e.target.files);
    }
  }, [validateAndProcessFiles]);

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    if (onClear) {
      onClear();
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 ease-in-out cursor-pointer group overflow-hidden min-h-[240px] flex flex-col items-center justify-center
          ${error 
            ? 'border-orange-300 bg-orange-50' 
            : isDragging 
              ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' 
              : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50 bg-white'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleInputChange}
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          disabled={isProcessing}
        />

        {/* Loading Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm cursor-wait">
            <div className="bg-white p-3 rounded-full shadow-lg border border-indigo-100 mb-3 animate-bounce">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-indigo-600 animate-pulse">Processing Batch...</p>
          </div>
        )}

        <div className="flex flex-col items-center justify-center text-center space-y-4 relative z-20 pointer-events-none">
          {error ? (
             <div className="animate-in fade-in zoom-in duration-300">
             <div className="bg-orange-100 p-4 rounded-full inline-block text-orange-600 mb-2">
               <AlertCircle size={32} />
             </div>
             <p className="text-lg font-medium text-orange-800">Perhatian</p>
             <p className="text-sm text-orange-600 mt-1 max-w-md">{error}</p>
             <p className="text-xs text-slate-400 mt-4">Klik untuk menambahkan file yang valid</p>
           </div>
          ) : (
            <>
              <div className={`
                p-4 rounded-full transition-colors duration-300
                ${isDragging ? 'bg-indigo-200 text-indigo-700' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'}
              `}>
                <Layers size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-medium text-slate-900">
                  Upload Banyak File Sekaligus
                </p>
                <p className="text-sm text-slate-500">
                  Drag & drop multiple images or PDFs here
                </p>
                <p className="text-xs text-slate-400 pt-2">
                  JPG, PNG, WEBP, PDF supported
                </p>
              </div>
            </>
          )}
        </div>
        
        {onClear && !isProcessing && (
           <button 
             onClick={clearFile}
             className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors p-2 z-30"
             title="Reset"
           >
             <X size={20} />
           </button>
        )}
      </div>
    </div>
  );
};