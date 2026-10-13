import React, { useState } from 'react';

interface VisualGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageGenerated?: (imageUrl: string) => void;
}

export const VisualGeneratorModal: React.FC<VisualGeneratorModalProps> = ({
  isOpen,
  onClose,
  onImageGenerated,
}) => {
  const [prompt, setPrompt] = useState(
    'Minimalist Swiss editorial invoice header with warm ivory textured paper background, geometric subtle teal accent and clean typography layout'
  );
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('2K');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '1:1' | '4:3'>('16:9');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          imageSize,
          aspectRatio,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to generate visual');
      }

      setGeneratedUrl(data.imageUrl);
      if (onImageGenerated) {
        onImageGenerated(data.imageUrl);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Image generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#001126]/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#ffffff] dark:bg-[#141f2e] rounded-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-[#001126]/10 dark:border-white/10 font-['Hanken_Grotesk']"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#001126]/10 dark:border-white/10">
          <div>
            <h3 className="text-base font-bold text-[#001126] dark:text-[#f3f6fa]">
              Visual Studio // gemini-3-pro-image-preview
            </h3>
            <span className="font-['Space_Mono'] text-[9px] uppercase tracking-wider text-[#44474d] dark:text-[#94a3b8]">
              Configurable 1K • 2K • 4K Resolution
            </span>
          </div>
          <button onClick={onClose} className="text-[#74777d] dark:text-[#94a3b8] hover:text-[#001126] dark:hover:text-[#f3f6fa] p-1 rounded-lg cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#001126] dark:text-[#f3f6fa] mb-1">
              Visual Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full p-3 bg-[#fbf9f4] dark:bg-[#0c131d] text-xs text-[#001126] dark:text-[#f3f6fa] rounded border border-[#001126]/15 dark:border-white/15 outline-none focus:border-[#001126] dark:focus:border-[#38bdf8]"
              required
            />
          </div>

          {/* Affordance for 1K, 2K, 4K */}
          <div>
            <label className="block text-xs font-semibold text-[#001126] dark:text-[#f3f6fa] mb-1">
              Resolution Output Size (gemini-3-pro-image-preview)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['1K', '2K', '4K'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setImageSize(size)}
                  className={`py-2 px-3 rounded text-center border transition-all text-xs cursor-pointer ${
                    imageSize === size
                      ? 'bg-[#15263c] dark:bg-[#38bdf8] text-[#fbf9f4] dark:text-[#0c131d] border-transparent font-bold'
                      : 'bg-[#fbf9f4] dark:bg-[#0c131d] text-[#001126] dark:text-[#f3f6fa] border-[#001126]/10 dark:border-white/10'
                  }`}
                >
                  <div className="font-['Space_Mono'] font-bold">{size}</div>
                  <div className="text-[9px] opacity-70">
                    {size === '1K' ? '1024px' : size === '2K' ? '2048px' : '4096px'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#001126] dark:text-[#f3f6fa] mb-1">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['16:9', '1:1', '4:3'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAspectRatio(r)}
                  className={`py-1.5 rounded text-xs border font-['Space_Mono'] cursor-pointer transition-all ${
                    aspectRatio === r
                      ? 'bg-[#15263c] dark:bg-[#38bdf8] text-[#fbf9f4] dark:text-[#0c131d] border-transparent font-bold'
                      : 'bg-[#fbf9f4] dark:bg-[#0c131d] text-[#001126] dark:text-[#f3f6fa] border-[#001126]/10 dark:border-white/10'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-[#ffdad6] dark:bg-[#ba1a1a]/30 text-[#ba1a1a] dark:text-[#ffb4ab] text-xs rounded border border-[#ba1a1a]/20">
              {error}
            </div>
          )}

          {generatedUrl && (
            <div className="rounded-lg overflow-hidden border border-[#001126]/10 dark:border-white/10">
              <img src={generatedUrl} alt="Generated visual" className="w-full h-auto max-h-48 object-cover" />
            </div>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-action-secondary px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-action-primary px-5 py-2.5 text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? `Rendering (${imageSize})...` : `Generate Visual (${imageSize})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
