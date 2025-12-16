import React from 'react';
import { Settings, Cpu, Ratio, Camera, Hash } from 'lucide-react';
import { PromptConfig } from '../types';

interface ConfigPanelProps {
  config: PromptConfig;
  onChange: (config: PromptConfig) => void;
  disabled: boolean;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onChange, disabled }) => {
  const handleChange = (key: keyof PromptConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
        <Settings size={18} className="text-indigo-600" />
        <h3 className="font-semibold text-slate-800">Konfigurasi Generasi</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Model Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
            <Cpu size={14} /> Target AI Model
          </label>
          <select
            value={config.targetModel}
            onChange={(e) => handleChange('targetModel', e.target.value)}
            disabled={disabled}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 transition-colors cursor-pointer hover:bg-slate-50"
          >
            <option value="midjourney">Midjourney v6</option>
            <option value="stable_diffusion">Stable Diffusion XL</option>
            <option value="firefly">Adobe Firefly 3</option>
            <option value="dalle">DALL-E 3</option>
          </select>
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
            <Ratio size={14} /> Aspect Ratio
          </label>
          <select
            value={config.aspectRatio}
            onChange={(e) => handleChange('aspectRatio', e.target.value)}
            disabled={disabled}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 transition-colors cursor-pointer hover:bg-slate-50"
          >
            <option value="1:1">1:1 (Square)</option>
            <option value="16:9">16:9 (Cinematic)</option>
            <option value="4:3">4:3 (Standard)</option>
            <option value="3:2">3:2 (Classic Photo)</option>
            <option value="2:3">2:3 (Portrait)</option>
            <option value="9:16">9:16 (Story)</option>
          </select>
        </div>

        {/* Keyword Density */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
            <Hash size={14} /> Keyword Density
          </label>
          <select
            value={config.keywordDensity}
            onChange={(e) => handleChange('keywordDensity', e.target.value)}
            disabled={disabled}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 transition-colors cursor-pointer hover:bg-slate-50"
          >
            <option value="low">Low (15-20 tags)</option>
            <option value="standard">Standard (30-40 tags)</option>
            <option value="high">High (50+ tags)</option>
          </select>
        </div>

        {/* Technical Settings */}
        <div className="space-y-2">
           <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
            <Camera size={14} /> Detail Teknis
          </label>
          <div className="flex items-center h-[42px] px-1">
             <label className="inline-flex items-center cursor-pointer group">
              <input 
                type="checkbox" 
                checked={config.includeTechnical}
                onChange={(e) => handleChange('includeTechnical', e.target.checked)}
                disabled={disabled}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 group-hover:peer-checked:bg-indigo-700"></div>
              <span className="ms-3 text-sm font-medium text-slate-700 group-hover:text-slate-900">Include Specs</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};