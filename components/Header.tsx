import React from 'react';
import { Camera, Sparkles, Heart } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <Camera size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">StockPrompt Pro</h1>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">AI Assistant untuk Microstocker</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <a 
            href="https://trakteer.id/limitless7/tip" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-pink-600 bg-pink-50 hover:bg-pink-100 px-3 py-1.5 rounded-full transition-colors border border-pink-100"
            title="Dukung pengembangan aplikasi ini"
          >
            <Heart size={16} className="fill-pink-600" />
            <span className="hidden sm:inline">Dukungan</span>
          </a>

          <div className="hidden md:flex items-center gap-2 text-sm text-indigo-600 font-medium bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
            <Sparkles size={16} />
            <span>Gemini 2.5</span>
          </div>
        </div>
      </div>
    </header>
  );
};