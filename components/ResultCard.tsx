import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Tag, Type, Image as ImageIcon, Sliders, Layers, X, Plus, Sparkles, Loader2, RefreshCw, Download, FileJson, FileText, ClipboardCopy, MousePointerClick, Eye, Wand2, ArrowDownAZ, ArrowUpNarrowWide } from 'lucide-react';
import { StockMetadata, PromptConfig } from '../types';
import { identifyPointInterest, generateImagePreview, generateSeoVariations } from '../services/geminiService';

interface ResultCardProps {
  data: StockMetadata;
  config: PromptConfig;
  onUpdate: (data: StockMetadata) => void;
  onRefine: (instruction: string, newAspectRatio: string) => Promise<void>;
  isRefining?: boolean;
  file?: File;
}

interface VisualPoint {
  x: number;
  y: number;
  loading: boolean;
  suggestions: string[];
}

interface SeoVariations {
  descriptive: { title: string, description: string };
  conceptual: { title: string, description: string };
  commercial: { title: string, description: string };
}

export const ResultCard: React.FC<ResultCardProps> = ({ data, config, onUpdate, onRefine, isRefining, file }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [refineInstruction, setRefineInstruction] = useState('');
  const [refineAspectRatio, setRefineAspectRatio] = useState(config.aspectRatio);
  
  // Visual Tagger State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activePoint, setActivePoint] = useState<VisualPoint | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Preview Gen State
  const [generatedPreviewUrl, setGeneratedPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // SEO Variations State
  const [seoVariations, setSeoVariations] = useState<SeoVariations | null>(null);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);

  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setImagePreview(null);
    }
  }, [file]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const generateTextContent = () => {
    return `TITLE: ${data.title}
DESCRIPTION: ${data.description}

PROMPT (${data.used_model || 'AI'}):
${data.ai_prompt}

KEYWORDS:
${data.keywords.join(', ')}

CATEGORY: ${data.category}
${data.technical_settings ? `TECHNICAL: ${data.technical_settings}` : ''}`;
  };

  const handleCopyAll = () => {
    copyToClipboard(generateTextContent(), 'all_content');
  };

  const handleDownloadJSON = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock_metadata_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTXT = () => {
    const textContent = generateTextContent();
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock_metadata_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ ...data, ai_prompt: e.target.value });
  };

  const removeKeyword = (indexToRemove: number) => {
    const updatedKeywords = data.keywords.filter((_, index) => index !== indexToRemove);
    onUpdate({ ...data, keywords: updatedKeywords });
  };

  const addKeyword = (keyword: string) => {
    const cleanKw = keyword.trim();
    if (cleanKw && !data.keywords.includes(cleanKw)) {
      onUpdate({ ...data, keywords: [...data.keywords, cleanKw] });
      setNewKeyword('');
    }
  };

  const sortKeywords = (type: 'alpha' | 'length') => {
    const sorted = [...data.keywords];
    if (type === 'alpha') {
      sorted.sort((a, b) => a.localeCompare(b));
    } else {
      sorted.sort((a, b) => a.length - b.length);
    }
    onUpdate({ ...data, keywords: sorted });
  };

  const handleRefineSubmit = async () => {
    if (!refineInstruction.trim()) return;
    await onRefine(refineInstruction, refineAspectRatio);
    setRefineInstruction('');
    // Clear previous preview as prompt has changed
    setGeneratedPreviewUrl(null); 
  };

  const handleGeneratePreview = async () => {
    if (!data.ai_prompt) return;
    setIsGeneratingPreview(true);
    setGeneratedPreviewUrl(null);
    try {
      const url = await generateImagePreview(data.ai_prompt, refineAspectRatio);
      setGeneratedPreviewUrl(url);
    } catch (e) {
      console.error("Preview error", e);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleGenerateSeo = async () => {
    setIsGeneratingSeo(true);
    setSeoVariations(null);
    try {
      const variations = await generateSeoVariations(data);
      setSeoVariations(variations);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingSeo(false);
    }
  };

  const applySeoVariation = (variation: { title: string, description: string }) => {
    onUpdate({ ...data, title: variation.title, description: variation.description });
    setSeoVariations(null); // Close suggestions after selection
  };

  // Visual Tagger Logic
  const handleImageClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current || !file) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate percentages for the AI (0-100)
    const xPercent = Math.round((x / rect.width) * 100);
    const yPercent = Math.round((y / rect.height) * 100);

    // Set active point (loading)
    setActivePoint({
      x: (x / rect.width) * 100, // keep as percentage for CSS
      y: (y / rect.height) * 100,
      loading: true,
      suggestions: []
    });

    try {
      const suggestions = await identifyPointInterest(file, xPercent, yPercent);
      setActivePoint(prev => prev ? { ...prev, loading: false, suggestions } : null);
    } catch (error) {
      console.error(error);
      setActivePoint(null);
    }
  };

  const closeVisualPoint = () => setActivePoint(null);

  const getModelLabel = () => {
    switch(data.used_model) {
      case 'midjourney': return 'Midjourney v6';
      case 'stable_diffusion': return 'Stable Diffusion XL';
      case 'firefly': return 'Adobe Firefly';
      case 'dalle': return 'DALL-E 3';
      default: return 'Generative AI';
    }
  };

  const CopyButton = ({ text, fieldId, className }: { text: string, fieldId: string, className?: string }) => (
    <button
      onClick={() => copyToClipboard(text, fieldId)}
      className={`
        p-1.5 rounded-md transition-all duration-200 border
        ${copiedField === fieldId 
          ? 'bg-green-50 text-green-600 border-green-200' 
          : 'bg-white text-slate-400 hover:text-indigo-600 border-slate-200 hover:border-indigo-200'}
        ${className}
      `}
      title="Copy to clipboard"
    >
      {copiedField === fieldId ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Export / Actions Toolbar */}
      <div className="flex flex-wrap gap-3">
        <button 
          onClick={handleDownloadJSON}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
        >
          <FileJson size={16} />
          <span>Save JSON</span>
        </button>
        <button 
          onClick={handleDownloadTXT}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
        >
          <FileText size={16} />
          <span>Save TXT</span>
        </button>
        <button 
          onClick={handleCopyAll}
          className={`
            flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all shadow-sm
            ${copiedField === 'all_content' 
              ? 'bg-green-50 border-green-200 text-green-700' 
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200'}
          `}
        >
          {copiedField === 'all_content' ? <Check size={16} /> : <ClipboardCopy size={16} />}
          <span>{copiedField === 'all_content' ? 'Copied All!' : 'Copy All Fields'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Visual Keyword Tagger - Only if image preview exists */}
        {imagePreview && (
          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
              <MousePointerClick size={18} className="text-indigo-600" />
              <h3 className="font-semibold text-slate-800">Visual Keyword Tagger</h3>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium ml-auto">
                Click image to add keywords
              </span>
            </div>
            <div className="relative bg-slate-100 cursor-crosshair overflow-hidden group min-h-[300px] flex items-center justify-center">
              <img 
                ref={imageRef}
                src={imagePreview} 
                alt="Interactive analysis" 
                className="max-w-full max-h-[500px] object-contain"
                onClick={handleImageClick}
              />
              
              {activePoint && (
                <div 
                  className="absolute z-20"
                  style={{ top: `${activePoint.y}%`, left: `${activePoint.x}%` }}
                >
                  <div className="relative">
                    {/* Pin Animation */}
                    <span className="absolute -translate-x-1/2 -translate-y-1/2 flex h-6 w-6">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-6 w-6 bg-indigo-600 border-2 border-white"></span>
                    </span>

                    {/* Popover */}
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white p-3 rounded-lg shadow-xl border border-slate-200 min-w-[200px] z-30 animate-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-600 uppercase">Suggestions</span>
                        <button onClick={(e) => { e.stopPropagation(); closeVisualPoint(); }} className="text-slate-400 hover:text-slate-600">
                          <X size={14} />
                        </button>
                      </div>
                      
                      {activePoint.loading ? (
                         <div className="flex items-center justify-center py-2 space-x-2 text-indigo-600">
                           <Loader2 size={16} className="animate-spin" />
                           <span className="text-xs font-medium">Analyzing spot...</span>
                         </div>
                      ) : (
                        <div className="space-y-1">
                          {activePoint.suggestions.length > 0 ? (
                            activePoint.suggestions.map((suggestion, idx) => (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addKeyword(suggestion);
                                }}
                                className={`w-full text-left text-sm px-2 py-1.5 rounded flex items-center justify-between group
                                  ${data.keywords.includes(suggestion) 
                                    ? 'bg-green-50 text-green-700 cursor-default' 
                                    : 'hover:bg-indigo-50 text-slate-700 hover:text-indigo-700'}
                                `}
                              >
                                <span>{suggestion}</span>
                                {data.keywords.includes(suggestion) ? (
                                  <Check size={14} />
                                ) : (
                                  <Plus size={14} className="opacity-0 group-hover:opacity-100" />
                                )}
                              </button>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 text-center py-1">No specific keywords found.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Prompt Section */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden border-l-4 border-l-indigo-500 relative">
          {isRefining && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                <span className="text-sm font-medium text-indigo-700">Refining prompt...</span>
              </div>
            </div>
          )}

          <div className="bg-indigo-50/50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon size={18} className="text-indigo-600" />
              <h3 className="font-semibold text-slate-800">{getModelLabel()} Prompt</h3>
            </div>
            <div className="flex items-center gap-2">
               <button 
                  onClick={handleGeneratePreview}
                  disabled={isGeneratingPreview || !data.ai_prompt}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white border border-indigo-200 text-indigo-700 rounded-md text-xs font-medium hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Generate a low-res preview of this prompt"
                >
                  {isGeneratingPreview ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                  <span>Visualize</span>
                </button>
              <div className="h-4 w-px bg-indigo-200 mx-1"></div>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase">Editable</span>
              <CopyButton text={data.ai_prompt} fieldId="prompt" />
            </div>
          </div>
          
          <div className="p-4">
            <textarea
              value={data.ai_prompt}
              onChange={handlePromptChange}
              className="w-full h-32 p-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y font-mono"
              placeholder="AI Prompt will appear here..."
            />
            
            {/* Generated Preview Display */}
            {generatedPreviewUrl && (
              <div className="mt-4 relative bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                    onClick={() => setGeneratedPreviewUrl(null)} 
                    className="bg-white/90 p-1.5 rounded-full text-slate-600 hover:text-red-500 hover:bg-white shadow-sm"
                    title="Close preview"
                   >
                     <X size={14} />
                   </button>
                </div>
                <div className="flex justify-center bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]">
                   <img 
                    src={generatedPreviewUrl} 
                    alt="Prompt Preview" 
                    className="max-h-[300px] w-auto object-contain" 
                   />
                </div>
                <div className="px-3 py-2 bg-white border-t border-slate-100 text-xs text-center text-slate-500 font-medium">
                   Generated Preview ({refineAspectRatio}) - For visualization purposes only
                </div>
              </div>
            )}

            {data.technical_settings && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-start gap-2">
                <Sliders size={16} className="text-slate-400 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase block">Technical / Style Settings</span>
                  <span className="text-xs text-slate-600">{data.technical_settings}</span>
                </div>
              </div>
            )}

            {/* AI Refinement Tools */}
            <div className="mt-4 bg-indigo-50/50 rounded-lg p-3 border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-indigo-600" />
                <span className="text-xs font-bold text-indigo-800 uppercase">AI Refinement</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={refineInstruction}
                  onChange={(e) => setRefineInstruction(e.target.value)}
                  placeholder="Make it cinematic, blue lighting, cyberpunk..."
                  className="flex-1 text-sm border-slate-200 rounded-md focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                  onKeyDown={(e) => e.key === 'Enter' && handleRefineSubmit()}
                />
                <select
                  value={refineAspectRatio}
                  onChange={(e) => setRefineAspectRatio(e.target.value)}
                  className="text-sm border-slate-200 rounded-md focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 bg-white"
                >
                  <option value="1:1">1:1</option>
                  <option value="16:9">16:9</option>
                  <option value="4:3">4:3</option>
                  <option value="3:2">3:2</option>
                  <option value="2:3">2:3</option>
                  <option value="9:16">9:16</option>
                </select>
                <button
                  onClick={handleRefineSubmit}
                  disabled={!refineInstruction.trim() || isRefining}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw size={14} className={isRefining ? 'animate-spin' : ''} />
                  Refine
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keywords Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag size={18} className="text-indigo-600" />
            <h3 className="font-semibold text-slate-800">Keywords</h3>
            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              {data.keywords.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
             <button
              onClick={() => sortKeywords('alpha')}
              className="text-slate-400 hover:text-indigo-600 p-1 rounded transition-colors"
              title="Sort Alphabetically"
            >
              <ArrowDownAZ size={16} />
            </button>
            <button
              onClick={() => sortKeywords('length')}
              className="text-slate-400 hover:text-indigo-600 p-1 rounded transition-colors"
              title="Sort by Length"
            >
              <ArrowUpNarrowWide size={16} />
            </button>
            <div className="w-px h-3 bg-slate-300 mx-1"></div>
            <button 
              onClick={() => copyToClipboard(data.keywords.join(', '), 'all_keywords')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
            >
              {copiedField === 'all_keywords' ? 'Copied!' : 'Copy All'}
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {data.keywords.map((keyword, idx) => (
              <span 
                key={idx} 
                className="group inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors select-none"
              >
                <span onClick={() => copyToClipboard(keyword, `kw_${idx}`)} className="cursor-pointer">
                   {keyword}
                </span>
                <button 
                  onClick={() => removeKeyword(idx)}
                  className="ml-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
             <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addKeyword(newKeyword)}
              placeholder="Add new keyword..."
              className="text-sm border-slate-200 rounded-md focus:border-indigo-500 focus:ring-indigo-500 px-3 py-1.5 flex-1"
             />
             <button 
               onClick={() => addKeyword(newKeyword)}
               disabled={!newKeyword.trim()}
               className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 disabled:opacity-50"
             >
               <Plus size={20} />
             </button>
          </div>
        </div>
      </div>

       {/* Title Section (Updated with SEO Magic) */}
       <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden opacity-90 hover:opacity-100 transition-opacity">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type size={18} className="text-slate-500" />
            <h3 className="font-semibold text-slate-600">Title & Description</h3>
          </div>
          <button
            onClick={handleGenerateSeo}
            disabled={isGeneratingSeo}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-bold uppercase hover:bg-amber-100 transition-colors shadow-sm disabled:opacity-50"
            title="Generate optimized title/desc variations"
          >
            {isGeneratingSeo ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
            <span>Smart SEO</span>
          </button>
        </div>
        
        {/* SEO Variations Panel */}
        {seoVariations && (
           <div className="p-4 bg-amber-50/50 border-b border-amber-100 grid grid-cols-1 md:grid-cols-3 gap-3">
             {[
               { type: 'Descriptive', data: seoVariations.descriptive, bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-800' },
               { type: 'Conceptual', data: seoVariations.conceptual, bg: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-800' },
               { type: 'Commercial', data: seoVariations.commercial, bg: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-800' }
             ].map((v) => (
               <button
                  key={v.type}
                  onClick={() => applySeoVariation(v.data)}
                  className={`text-left p-3 rounded-lg border text-xs transition-all ${v.bg}`}
               >
                 <span className="block font-bold mb-1 uppercase tracking-wide opacity-70">{v.type}</span>
                 <p className="font-semibold mb-1 line-clamp-2">{v.data.title}</p>
                 <p className="opacity-70 line-clamp-2">{v.data.description}</p>
               </button>
             ))}
              <div className="md:col-span-3 text-center">
                <button onClick={() => setSeoVariations(null)} className="text-xs text-slate-400 hover:text-slate-600">
                  Cancel / Close Suggestions
                </button>
              </div>
           </div>
        )}

        <div className="p-4 space-y-4">
          <div className="relative group">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Title (English)</label>
            <div className="flex items-center gap-2">
              <input 
                value={data.title}
                onChange={(e) => onUpdate({...data, title: e.target.value})}
                className="flex-1 bg-slate-50 p-2.5 rounded-lg text-slate-800 text-sm font-medium border border-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <CopyButton text={data.title} fieldId="title" />
            </div>
          </div>
          <div className="relative group">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Description</label>
            <div className="flex items-center gap-2">
              <textarea 
                value={data.description}
                onChange={(e) => onUpdate({...data, description: e.target.value})}
                rows={2}
                className="flex-1 bg-slate-50 p-2.5 rounded-lg text-slate-700 text-sm border border-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <CopyButton text={data.description} fieldId="desc" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};