import React, { useMemo } from 'react';
import { BatchItem, StockMetadata, PromptConfig } from '../types';
import { ResultCard } from './ResultCard';
import { CheckCircle2, CircleDashed, AlertCircle, FileText, Image as ImageIcon, Loader2, Layers, FileSpreadsheet } from 'lucide-react';

interface BatchResultsProps {
  items: BatchItem[];
  activeItemId: string | null;
  onSelectItem: (id: string) => void;
  config: PromptConfig;
  onUpdateItem: (id: string, data: StockMetadata) => void;
  onRefineItem: (id: string, instruction: string, newAspectRatio: string) => Promise<void>;
  isRefining: boolean;
}

export const BatchResults: React.FC<BatchResultsProps> = ({
  items,
  activeItemId,
  onSelectItem,
  config,
  onUpdateItem,
  onRefineItem,
  isRefining
}) => {
  const activeItem = useMemo(() => 
    items.find(item => item.id === activeItemId) || items[0], 
    [items, activeItemId]
  );

  const completedCount = items.filter(i => i.status === 'completed').length;

  const handleExportCSV = () => {
    const completedItems = items.filter(i => i.status === 'completed' && i.data);
    if (completedItems.length === 0) return;

    const headers = ['Filename', 'Title', 'Description', 'Keywords', 'Category', 'AI Prompt', 'Technical Settings'];
    const rows = completedItems.map(item => {
      const d = item.data!;
      // Escape quotes for CSV
      const escape = (text: string) => `"${(text || '').replace(/"/g, '""')}"`;
      
      return [
        escape(item.file.name),
        escape(d.title),
        escape(d.description),
        escape(d.keywords.join(', ')),
        escape(d.category),
        escape(d.ai_prompt),
        escape(d.technical_settings || '')
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stockprompt_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: BatchItem['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={18} className="text-green-500" />;
      case 'processing': return <Loader2 size={18} className="text-indigo-500 animate-spin" />;
      case 'error': return <AlertCircle size={18} className="text-red-500" />;
      default: return <CircleDashed size={18} className="text-slate-300" />;
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') return <FileText size={16} />;
    return <ImageIcon size={16} />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom-8 duration-500">
      
      {/* Sidebar List */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Layers size={18} className="text-indigo-600" />
              <span>File Queue ({items.length})</span>
            </h3>
            {completedCount > 0 && (
              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-medium transition-colors shadow-sm"
                title="Download all completed as CSV"
              >
                <FileSpreadsheet size={14} />
                <span>CSV</span>
              </button>
            )}
          </div>
          <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                className={`w-full text-left p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-center gap-3
                  ${activeItem?.id === item.id ? 'bg-indigo-50/60 border-indigo-100' : ''}
                `}
              >
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                  ${item.status === 'error' ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'}
                `}>
                  {getFileIcon(item.file.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${activeItem?.id === item.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                    {item.file.name}
                  </p>
                  <p className="text-xs text-slate-400 capitalize">
                    {item.status === 'processing' ? 'Generating...' : item.status}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  {getStatusIcon(item.status)}
                </div>
              </button>
            ))}
            {items.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">
                No files in queue
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Detail */}
      <div className="lg:col-span-8">
        {activeItem ? (
          <>
            {activeItem.status === 'completed' && activeItem.data ? (
              <div key={activeItem.id} className="animate-in fade-in duration-300">
                <ResultCard
                  data={activeItem.data}
                  config={config}
                  onUpdate={(newData) => onUpdateItem(activeItem.id, newData)}
                  onRefine={(instruction, ratio) => onRefineItem(activeItem.id, instruction, ratio)}
                  isRefining={isRefining}
                  file={activeItem.file}
                />
              </div>
            ) : activeItem.status === 'processing' ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center h-[400px] flex flex-col items-center justify-center">
                 <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                 <h3 className="text-lg font-semibold text-slate-800">Generating Metadata...</h3>
                 <p className="text-slate-500 max-w-xs mx-auto mt-2">
                   Analyzing {activeItem.file.name} to create optimized stock assets.
                 </p>
              </div>
            ) : activeItem.status === 'error' ? (
              <div className="bg-white rounded-xl border border-red-200 p-12 text-center h-[300px] flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-lg font-semibold text-red-800">Processing Failed</h3>
                <p className="text-red-600 max-w-md mx-auto mt-2">
                  {activeItem.error || "Unknown error occurred while processing this file."}
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl h-[300px] flex items-center justify-center text-slate-400">
                Pending...
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <p className="text-slate-500">Select a file from the list to view details.</p>
          </div>
        )}
      </div>
    </div>
  );
};