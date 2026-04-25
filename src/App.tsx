import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  FileText, 
  Upload, 
  Loader2, 
  Copy, 
  Check, 
  Download, 
  Table as TableIcon, 
  Code as CodeIcon,
  Trash2,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { extractCatalogData, type CatalogData, type CatalogInput } from './services/catalogService';
import { pdfToImages } from './utils/pdfUtils';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [data, setData] = useState<CatalogData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
  const [copied, setCopied] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'application/pdf': ['.pdf']
    }
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleExtract = async () => {
    if (files.length === 0) return;

    setIsExtracting(true);
    setError(null);

    try {
      const inputs: CatalogInput[] = await Promise.all(
        files.map(async (file) => {
          if (file.type === 'application/pdf') {
            console.log('[App] Converting PDF to images:', file.name);
            const images = await pdfToImages(file);
            console.log('[App] PDF converted to', images.length, 'images');
            return { type: 'pdf' as const, images, filename: file.name };
          } else {
            return new Promise<CatalogInput>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve({ type: 'image' as const, data: reader.result as string, mimeType: file.type });
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          }
        })
      );

      console.log('[App] Sending', files.length, 'file(s) for extraction');
      const result = await extractCatalogData(inputs);
      setData(result);
    } catch (err) {
      console.error(err);
      setError('Failed to extract data. Please try again with clearer images.');
    } finally {
      setIsExtracting(false);
    }
  };

  const copyToClipboard = () => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.catalog_id || 'catalog'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header */}
      <header className="border-b border-[#141414] p-6 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#141414] flex items-center justify-center rounded-sm">
            <FileText className="text-[#E4E3E0] w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif italic text-xl leading-none">Catalog Extractor</h1>
            <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1 font-mono">v1.0 / AI-POWERED</p>
          </div>
        </div>
        
        {data && (
          <div className="flex items-center gap-2">
            <button 
              onClick={copyToClipboard}
              className="p-2 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors rounded-sm border border-[#141414]/10"
              title="Copy JSON"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
            <button 
              onClick={downloadJson}
              className="p-2 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors rounded-sm border border-[#141414]/10"
              title="Download JSON"
            >
              <Download size={18} />
            </button>
            <button 
              onClick={() => { setData(null); setFiles([]); }}
              className="p-2 hover:bg-red-500 hover:text-white transition-colors rounded-sm border border-[#141414]/10"
              title="Reset"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto p-6 lg:p-12">
        <AnimatePresence mode="wait">
          {!data ? (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="grid lg:grid-cols-2 gap-12 items-start">
                <div className="space-y-6">
                  <h2 className="text-5xl font-serif italic leading-tight">
                    Turn your technical catalogs into <span className="underline underline-offset-8 decoration-1">structured data</span>.
                  </h2>
                  <p className="text-lg opacity-70 leading-relaxed max-w-md">
                    Upload images or PDFs of your parts manual. Our AI will automatically identify categories, part numbers, and quantities.
                  </p>
                  
                  <div className="flex flex-wrap gap-4 pt-4">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider opacity-50">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      OCR Ready
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider opacity-50">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      Multi-page
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider opacity-50">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      JSON Export
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div 
                    {...getRootProps()} 
                    className={cn(
                      "border-2 border-dashed border-[#141414] p-12 rounded-sm text-center cursor-pointer transition-all",
                      isDragActive ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-white/50",
                      files.length > 0 && "border-solid"
                    )}
                  >
                    <input {...getInputProps()} />
                    <Upload className="mx-auto mb-4 opacity-50" size={48} />
                    <p className="font-serif italic text-xl">
                      {isDragActive ? "Drop them here" : "Drag & drop catalog pages"}
                    </p>
                    <p className="text-xs font-mono uppercase tracking-widest opacity-50 mt-2">
                      PNG, JPG, WEBP or PDF
                    </p>
                  </div>

                  {files.length > 0 && (
                    <div className="bg-white/50 border border-[#141414]/10 rounded-sm overflow-hidden">
                      <div className="p-3 border-b border-[#141414]/10 bg-[#141414] text-[#E4E3E0] flex justify-between items-center">
                        <span className="text-[10px] uppercase tracking-widest font-mono">Queue ({files.length})</span>
                        <button onClick={() => setFiles([])} className="text-[10px] hover:underline">Clear all</button>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {files.map((file, i) => (
                          <div key={i} className="flex items-center justify-between p-3 border-b border-[#141414]/5 last:border-0 hover:bg-white/80 transition-colors group">
                            <div className="flex items-center gap-3 truncate">
                              <FileText size={16} className="opacity-50 shrink-0" />
                              <span className="text-sm truncate font-mono">{file.name}</span>
                              <span className="text-[10px] opacity-30 font-mono">{(file.size / 1024).toFixed(0)}KB</span>
                            </div>
                            <button 
                              onClick={() => removeFile(i)}
                              className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    disabled={files.length === 0 || isExtracting}
                    onClick={handleExtract}
                    className={cn(
                      "w-full py-4 rounded-sm font-serif italic text-xl flex items-center justify-center gap-3 transition-all",
                      files.length === 0 || isExtracting 
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                        : "bg-[#141414] text-[#E4E3E0] hover:scale-[1.02] active:scale-[0.98]"
                    )}
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Extracting Data...
                      </>
                    ) : (
                      <>
                        Process Catalog
                        <Plus size={20} />
                      </>
                    )}
                  </button>

                  {error && (
                    <p className="text-red-500 text-sm font-mono text-center">{error}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#141414] pb-6">
                <div>
                  <h2 className="text-4xl font-serif italic">{data.catalog_id || 'Extracted Catalog'}</h2>
                  <div className="flex gap-4 mt-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest opacity-50">
                      Categories: {data.categories.length}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest opacity-50">
                      Parts: {data.parts.length}
                    </span>
                  </div>
                </div>

                <div className="flex bg-white border border-[#141414] p-1 rounded-sm">
                  <button
                    onClick={() => setViewMode('table')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-widest transition-colors",
                      viewMode === 'table' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-gray-100"
                    )}
                  >
                    <TableIcon size={14} />
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode('json')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-widest transition-colors",
                      viewMode === 'json' ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-gray-100"
                    )}
                  >
                    <CodeIcon size={14} />
                    JSON
                  </button>
                </div>
              </div>

              <div className="bg-white border border-[#141414] rounded-sm overflow-hidden min-h-[600px]">
                {viewMode === 'table' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#141414] text-[#E4E3E0] font-mono text-[10px] uppercase tracking-widest">
                          <th className="p-4 border-r border-white/10">Item</th>
                          <th className="p-4 border-r border-white/10">Part Number</th>
                          <th className="p-4 border-r border-white/10">Description</th>
                          <th className="p-4 border-r border-white/10">Category</th>
                          <th className="p-4">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.parts.map((part, i) => (
                          <tr key={i} className="border-b border-[#141414]/10 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors group">
                            <td className="p-4 font-mono text-xs border-r border-[#141414]/10 group-hover:border-white/10">{part.item_no}</td>
                            <td className="p-4 font-mono text-xs border-r border-[#141414]/10 group-hover:border-white/10">{part.part_no}</td>
                            <td className="p-4 font-serif italic border-r border-[#141414]/10 group-hover:border-white/10">{part.description}</td>
                            <td className="p-4 text-[10px] uppercase tracking-wider opacity-50 border-r border-[#141414]/10 group-hover:border-white/10">{part.category_name}</td>
                            <td className="p-4 font-mono text-xs">{part.qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 bg-[#1a1a1a] text-green-400 font-mono text-sm overflow-auto max-h-[700px]">
                    <pre>{JSON.stringify(data, null, 2)}</pre>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#141414] p-6 text-center opacity-30">
        <p className="text-[10px] uppercase tracking-[0.3em] font-mono">
          Proprietary AI Extraction Engine / Built for Technical Platforms
        </p>
      </footer>
    </div>
  );
}
