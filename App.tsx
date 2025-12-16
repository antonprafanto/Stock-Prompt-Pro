import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { BatchResults } from './components/BatchResults';
import { ConfigPanel } from './components/ConfigPanel';
import { DisclaimerModal } from './components/DisclaimerModal';
import { generateStockMetadata, refineMetadata } from './services/geminiService';
import { AnalysisState, PromptConfig, StockMetadata, BatchItem } from './types';
import { convertPdfToImages } from './utils/pdfUtils';
import { MessageCircle, Heart, Coffee, Loader2 } from 'lucide-react';

// Simple ID generator if uuid is not available in environment
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export default function App() {
  const [state, setState] = useState<AnalysisState>({
    items: [],
    isProcessing: false,
    activeItemId: null,
  });

  const [promptConfig, setPromptConfig] = useState<PromptConfig>({
    targetModel: 'midjourney',
    aspectRatio: '16:9',
    includeTechnical: true,
    keywordDensity: 'standard',
  });

  const [isRefining, setIsRefining] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isPreparingFiles, setIsPreparingFiles] = useState(false);

  useEffect(() => {
    // Check if user has accepted the disclaimer previously
    const hasAccepted = localStorage.getItem('stockprompt_sharia_accepted');
    if (!hasAccepted) {
      setShowDisclaimer(true);
    }
  }, []);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('stockprompt_sharia_accepted', 'true');
    setShowDisclaimer(false);
  };

  const handleOpenDisclaimer = () => {
    setShowDisclaimer(true);
  };

  const processBatchQueue = async (itemsToProcess: BatchItem[]) => {
    setState(prev => ({ ...prev, isProcessing: true }));

    // Process sequentially to be safe with rate limits, though parallel is possible
    for (const item of itemsToProcess) {
      // Update status to processing
      setState(prev => ({
        ...prev,
        items: prev.items.map(i => i.id === item.id ? { ...i, status: 'processing' } : i)
      }));

      try {
        const result = await generateStockMetadata(item.file, promptConfig);
        
        setState(prev => ({
          ...prev,
          items: prev.items.map(i => i.id === item.id ? { 
            ...i, 
            status: 'completed', 
            data: result 
          } : i)
        }));
      } catch (error: any) {
        setState(prev => ({
          ...prev,
          items: prev.items.map(i => i.id === item.id ? { 
            ...i, 
            status: 'error', 
            error: error.message || "Failed to process" 
          } : i)
        }));
      }
    }

    setState(prev => ({ ...prev, isProcessing: false }));
  };

  const handleFilesSelect = async (files: File[]) => {
    setIsPreparingFiles(true);
    const finalFiles: File[] = [];

    // Pre-process PDFs: Convert to images (one per page)
    try {
      for (const file of files) {
        if (file.type === 'application/pdf') {
          try {
            const images = await convertPdfToImages(file);
            finalFiles.push(...images);
          } catch (e) {
            console.error("Skipping bad PDF", e);
            // Fallback: push original file if conversion fails (Gemini might handle it, though less effectively for Multi-page)
            finalFiles.push(file); 
          }
        } else {
          finalFiles.push(file);
        }
      }

      const newItems: BatchItem[] = finalFiles.map(file => ({
        id: generateId(),
        file,
        status: 'pending',
        data: null,
        error: null
      }));

      setState(prev => {
        const updatedItems = [...prev.items, ...newItems];
        return {
          ...prev,
          items: updatedItems,
          // If no active item, set the first new one as active
          activeItemId: prev.activeItemId || newItems[0].id
        };
      });

      // Start processing only the new items
      processBatchQueue(newItems);
    } catch (error) {
      console.error("File preparation error", error);
    } finally {
      setIsPreparingFiles(false);
    }
  };

  const handleClear = () => {
    setState({
      items: [],
      isProcessing: false,
      activeItemId: null,
    });
  };

  const handleSelectItem = (id: string) => {
    setState(prev => ({ ...prev, activeItemId: id }));
  };

  const handleUpdateItem = (id: string, newData: StockMetadata) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, data: newData } : item)
    }));
  };

  const handleRefineItem = async (id: string, instruction: string, newAspectRatio: string) => {
    const item = state.items.find(i => i.id === id);
    if (!item || !item.data) return;

    setIsRefining(true);

    try {
      const refineConfig: PromptConfig = {
        ...promptConfig,
        aspectRatio: newAspectRatio
      };

      const refinedResult = await refineMetadata(item.data, instruction, refineConfig);

      // Update the specific item
      setState(prev => ({
        ...prev,
        items: prev.items.map(i => i.id === id ? { ...i, data: refinedResult } : i)
      }));

      // Update global config if needed, though strictly we might only want to update local
      setPromptConfig(prev => ({ ...prev, aspectRatio: newAspectRatio }));

    } catch (error) {
      console.error("Refine failed", error);
      // Optional: set a temporary error state or notification
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {showDisclaimer && <DisclaimerModal onAccept={handleAcceptDisclaimer} />}
      
      {/* Global Loader for PDF Processing */}
      {isPreparingFiles && (
        <div className="fixed inset-0 z-[70] bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-indigo-100 flex flex-col items-center animate-in zoom-in-95">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
            <h3 className="text-lg font-bold text-slate-800">Mengekstrak Halaman PDF...</h3>
            <p className="text-sm text-slate-500">Mohon tunggu sebentar, kami sedang memisahkan halaman.</p>
          </div>
        </div>
      )}
      
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 flex-grow w-full">
        
        {/* Hero / Intro Section (only show if list is empty) */}
        {state.items.length === 0 && (
          <div className="text-center mb-16 mt-10 animate-in fade-in slide-in-from-top-4 duration-700">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              Buat Aset Stock <span className="text-indigo-600">Best-Seller</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">
              Upload multiple images or PDFs. Our AI generates high-converting prompts and metadata for Adobe Stock & Shutterstock instantly.
            </p>
          </div>
        )}

        {/* Configuration Panel */}
        <ConfigPanel 
          config={promptConfig} 
          onChange={setPromptConfig} 
          disabled={state.isProcessing || isRefining || isPreparingFiles}
        />

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 mb-8">
          <FileUpload 
            onFilesSelect={handleFilesSelect} 
            isProcessing={state.isProcessing || isPreparingFiles} 
            onClear={state.items.length > 0 ? handleClear : undefined}
          />
        </div>

        {/* Batch Results View */}
        {state.items.length > 0 && (
          <BatchResults 
            items={state.items}
            activeItemId={state.activeItemId}
            onSelectItem={handleSelectItem}
            config={promptConfig}
            onUpdateItem={handleUpdateItem}
            onRefineItem={handleRefineItem}
            isRefining={isRefining}
          />
        )}
      </main>

      {/* Footer Support Section */}
      <footer className="bg-white border-t border-slate-200 mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div>
              <p className="text-sm font-bold text-slate-900">StockPrompt Pro</p>
              <p className="text-xs text-slate-500 mt-1">
                Membantu Microstocker menghasilkan aset berkualitas dengan AI.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
               <a 
                href="https://wa.me/62811553393" 
                target="_blank"
                rel="noopener noreferrer" 
                className="group flex items-center gap-2 text-sm text-slate-600 hover:text-green-600 transition-colors"
              >
                <div className="bg-green-100 p-2 rounded-full text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                   <MessageCircle size={16} />
                </div>
                <span>Saran & Kritik: 0811553393</span>
              </a>

              <a 
                 href="https://trakteer.id/limitless7/tip" 
                 target="_blank"
                 rel="noopener noreferrer"
                 className="group flex items-center gap-2 text-sm text-slate-600 hover:text-pink-600 transition-colors"
              >
                 <div className="bg-pink-100 p-2 rounded-full text-pink-600 group-hover:bg-pink-600 group-hover:text-white transition-colors">
                    <Coffee size={16} />
                 </div>
                 <span>Traktir Pengembang</span>
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
            <p>&copy; {new Date().getFullYear()} StockPrompt Pro. All rights reserved.</p>
            <button 
              onClick={handleOpenDisclaimer}
              className="hover:text-indigo-600 transition-colors underline"
            >
              Baca Disclaimer & Peringatan
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}