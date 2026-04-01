import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Upload, Image as ImageIcon, Loader2, Sparkles, X, Camera } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SYSTEM_INSTRUCTION = `Bạn là một AI chuyên gia trong lĩnh vực hậu kỳ hình ảnh chuyên nghiệp (Professional Photo Editor).
Nhiệm vụ của bạn:

Phân tích kỹ thuật: Khi nhận ảnh, hãy đánh giá biểu đồ histogram (giả định), độ nhiễu (noise), độ sắc nét và dải tương phản động (dynamic range).

Tư vấn màu sắc chuyên sâu: Đề xuất các bảng màu (Color Palette) dựa trên lý thuyết màu sắc. Đặc biệt ưu tiên các phong cách: Sony A1 II Aesthetic (trong trẻo, chân thực), Cinematic Teal & Orange, hoặc Monochrome Manhwa style (đen trắng tương phản cao).

Xử lý chân dung: Hướng dẫn chi tiết cách xử lý da (skin retouching), đánh khối (dodging & burning) và chỉnh sửa ánh sáng mắt.

Output: Cung cấp thông số cụ thể cho Adobe Lightroom/Camera Raw (Exposure, Highlights, Shadows, Whites, Blacks, HSL) để đạt được kết quả mong muốn.`;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [image, setImage] = useState<{ file: File; preview: string; base64: string } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng tải lên một tệp hình ảnh hợp lệ.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      
      setImage({
        file,
        preview: base64String,
        base64: base64Data,
      });
      setError('');
      setResult('');
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImage(null);
    setResult('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const analyzeImage = async () => {
    if (!image) {
      setError('Vui lòng tải lên một hình ảnh để phân tích.');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setResult('');

    try {
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.1-pro-preview',
        contents: [
          {
            inlineData: {
              data: image.base64,
              mimeType: image.file.type,
            },
          },
          prompt ? prompt : 'Hãy phân tích bức ảnh này và đưa ra tư vấn hậu kỳ chi tiết.',
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      for await (const chunk of responseStream) {
        setResult((prev) => prev + chunk.text);
      }
    } catch (err: any) {
      console.error('Error analyzing image:', err);
      setError(err.message || 'Đã xảy ra lỗi trong quá trình phân tích. Vui lòng thử lại.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-blue-200">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl shadow-inner">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-800">AI Photo Editor Assistant</h1>
          </div>
          <div className="text-sm text-neutral-500 font-medium hidden sm:block">Powered by Gemini 3.1 Pro</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-200">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2 text-neutral-800">
                <ImageIcon className="w-5 h-5 text-neutral-400" />
                Hình ảnh cần xử lý
              </h2>
              
              <div 
                className={`relative border-2 border-dashed rounded-2xl overflow-hidden transition-all duration-200 ${
                  image ? 'border-neutral-200' : 'border-neutral-300 hover:border-blue-400 hover:bg-blue-50/50 bg-neutral-50'
                }`}
              >
                {image ? (
                  <div className="relative group">
                    <img 
                      src={image.preview} 
                      alt="Preview" 
                      className="w-full h-auto object-contain max-h-[400px] bg-neutral-100"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <button 
                        onClick={clearImage}
                        className="bg-white text-neutral-900 px-4 py-2 rounded-xl font-medium shadow-xl hover:bg-neutral-50 flex items-center gap-2 transition-transform active:scale-95"
                      >
                        <X className="w-4 h-4" />
                        Xóa ảnh
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-12 cursor-pointer min-h-[300px]">
                    <div className="bg-blue-50 p-4 rounded-full mb-4 ring-8 ring-blue-50/50">
                      <Upload className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-neutral-700 mb-1">Nhấp để tải ảnh lên</p>
                    <p className="text-xs text-neutral-500">Hỗ trợ JPG, PNG, WebP</p>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleImageUpload}
                      ref={fileInputRef}
                    />
                  </label>
                )}
              </div>

              <div className="mt-6">
                <label htmlFor="prompt" className="block text-sm font-medium text-neutral-700 mb-2">
                  Yêu cầu cụ thể (Tùy chọn)
                </label>
                <textarea
                  id="prompt"
                  rows={3}
                  className="w-full rounded-2xl border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-4 border resize-none transition-colors"
                  placeholder="Ví dụ: Làm cho bức ảnh này trông giống phim điện ảnh, hoặc tập trung vào việc làm mịn da tự nhiên..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              <div className="mt-6">
                <button
                  onClick={analyzeImage}
                  disabled={!image || isAnalyzing}
                  className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white px-4 py-3.5 rounded-2xl font-medium hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-sm"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang phân tích...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Bắt đầu phân tích
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-2xl text-sm border border-red-100 flex items-start gap-3">
                  <X className="w-5 h-5 shrink-0 text-red-500" />
                  <p>{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-7">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-200 h-full min-h-[600px] flex flex-col">
              <h2 className="text-lg font-medium mb-6 flex items-center gap-2 pb-4 border-b border-neutral-100 text-neutral-800">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Kết quả phân tích & Tư vấn
              </h2>
              
              <div className="flex-1 overflow-auto">
                {result ? (
                  <div className="prose prose-neutral prose-blue max-w-none prose-headings:font-semibold prose-a:text-blue-600 prose-img:rounded-2xl prose-pre:bg-neutral-900 prose-pre:text-neutral-50 prose-pre:rounded-xl">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result}
                    </ReactMarkdown>
                  </div>
                ) : isAnalyzing ? (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                      <Loader2 className="w-10 h-10 animate-spin text-blue-600 relative z-10" />
                    </div>
                    <p className="text-sm font-medium animate-pulse text-neutral-500">AI đang đánh giá các thông số kỹ thuật...</p>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-4">
                    <div className="bg-neutral-50 p-6 rounded-full ring-8 ring-neutral-50/50">
                      <ImageIcon className="w-12 h-12 text-neutral-300" />
                    </div>
                    <p className="text-sm font-medium text-center max-w-sm text-neutral-500 leading-relaxed">
                      Tải lên một bức ảnh và nhấn "Bắt đầu phân tích" để nhận tư vấn hậu kỳ chuyên nghiệp từ AI.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
