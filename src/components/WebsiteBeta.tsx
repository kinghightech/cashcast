import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, ExternalLink, Copy, Check } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  html?: string;
}

export const WebsiteBeta = ({
  businessName = '',
  businessType = '',
  address = '',
}: {
  businessName?: string;
  businessType?: string;
  address?: string;
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content:
        "Tell me everything about your business and I will build your full website. Include your services, ideal customers, pricing style, brand vibe, offers, contact info, and anything else important.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'info' | 'preview'>('info');
  const [businessInfo, setBusinessInfo] = useState({
    businessName: businessName || '',
    primaryServices: businessType || '',
    targetRevenueGoals: '',
    targetCustomers: '',
    businessProfile: '',
    additionalNotes: `Location: ${address || 'Not provided'}`,
  });
  const [revisionPrompt, setRevisionPrompt] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (field: keyof typeof businessInfo, value: string) => {
    setBusinessInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessInfo.businessName.trim() || !businessInfo.businessProfile.trim()) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'assistant',
          content:
            'Please provide at least your business name and full business description so I can generate an accurate website.',
        },
      ]);
      return;
    }

    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        type: 'user',
        content: `Business: ${businessInfo.businessName}\nServices: ${businessInfo.primaryServices || 'Not provided'}\nRevenue goals: ${businessInfo.targetRevenueGoals || 'Not provided'}\nTarget customers: ${businessInfo.targetCustomers || 'Not provided'}\n\nFull profile:\n${businessInfo.businessProfile}`,
      },
    ]);

    await generateWebsite('');
  };

  const generateWebsite = async (revisionRequest: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessInfo.businessName,
          primaryServices: businessInfo.primaryServices,
          targetRevenueGoals: businessInfo.targetRevenueGoals,
          businessProfile: `${businessInfo.businessProfile}\n\nTarget customers: ${businessInfo.targetCustomers || 'Not specified'}`,
          additionalNotes: `${businessInfo.additionalNotes || ''}${revisionRequest ? `\nRevision request: ${revisionRequest}` : ''}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate website');
      }

      const data = await response.json();
      setGeneratedHtml(data.html);
      setStep('preview');

      const assistantMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Your website is ready for ${businessInfo.businessName}. You can preview it, copy the HTML, or request changes below.`,
        html: data.html,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error generating website:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Generation failed: ${(error as Error).message}. Make sure both frontend and backend are running with npm run dev:all.`,
      };
      setMessages(prev => [...prev, errorMessage]);
      setStep('info');
    } finally {
      setLoading(false);
    }
  };

  const handleRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionPrompt.trim() || loading || !generatedHtml) return;

    const request = revisionPrompt.trim();
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), type: 'user', content: `Revise website: ${request}` },
    ]);
    setRevisionPrompt('');
    await generateWebsite(request);
  };

  const copyHtmlToClipboard = () => {
    if (generatedHtml) {
      navigator.clipboard.writeText(generatedHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadHtml = () => {
    if (generatedHtml) {
      const blob = new Blob([generatedHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${businessInfo.businessName.replace(/\s+/g, '-').toLowerCase()}-website.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="w-full h-full flex flex-col xl:flex-row gap-6 pb-10">
      {/* Chat Panel */}
      <div className="xl:w-1/2 flex flex-col bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-3 rounded-2xl ${
                  msg.type === 'user'
                    ? 'bg-emerald-400/20 text-emerald-100 border border-emerald-400/30'
                    : 'bg-white/[0.05] text-white/80 border border-white/10'
                }`}
              >
                <p className="text-sm font-geist whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/[0.05] text-white/80 px-4 py-3 rounded-2xl border border-white/10 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-geist">Generating your website...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/10">
          {step === 'info' ? (
            <form onSubmit={handleGenerate} className="flex flex-col gap-3">
              <div>
                <label className="block text-white/60 text-xs font-semibold font-geist mb-1">Business Name</label>
                <input
                  type="text"
                  value={businessInfo.businessName}
                  onChange={e => handleInputChange('businessName', e.target.value)}
                  placeholder="e.g., Coffee Corner Café"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/30 text-sm font-geist outline-none focus:border-emerald-400/50 focus:bg-white/[0.08] transition-all"
                />
              </div>
              <div>
                <label className="block text-white/60 text-xs font-semibold font-geist mb-1">Primary Services</label>
                <input
                  type="text"
                  value={businessInfo.primaryServices}
                  onChange={e => handleInputChange('primaryServices', e.target.value)}
                  placeholder="e.g., Premium specialty coffee, pastries, WiFi workspace"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/30 text-sm font-geist outline-none focus:border-emerald-400/50 focus:bg-white/[0.08] transition-all"
                />
              </div>
              <div>
                <label className="block text-white/60 text-xs font-semibold font-geist mb-1">Target Revenue Goals</label>
                <input
                  type="text"
                  value={businessInfo.targetRevenueGoals}
                  onChange={e => handleInputChange('targetRevenueGoals', e.target.value)}
                  placeholder="e.g., $5000/month, increase foot traffic by 30%"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/30 text-sm font-geist outline-none focus:border-emerald-400/50 focus:bg-white/[0.08] transition-all"
                />
              </div>
              <div>
                <label className="block text-white/60 text-xs font-semibold font-geist mb-1">Target Customers</label>
                <input
                  type="text"
                  value={businessInfo.targetCustomers}
                  onChange={e => handleInputChange('targetCustomers', e.target.value)}
                  placeholder="e.g., Busy professionals, local families, college students"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/30 text-sm font-geist outline-none focus:border-emerald-400/50 focus:bg-white/[0.08] transition-all"
                />
              </div>
              <div>
                <label className="block text-white/60 text-xs font-semibold font-geist mb-1">Everything About Your Business</label>
                <textarea
                  value={businessInfo.businessProfile}
                  onChange={e => handleInputChange('businessProfile', e.target.value)}
                  placeholder="Describe your story, offers, pricing approach, differentiators, tone, service area, testimonials, contact details, opening hours, social links, and any sections you want on the site."
                  rows={8}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/30 text-sm font-geist outline-none focus:border-emerald-400/50 focus:bg-white/[0.08] transition-all resize-y"
                />
              </div>
              <div>
                <label className="block text-white/60 text-xs font-semibold font-geist mb-1">Optional Design Notes</label>
                <input
                  type="text"
                  value={businessInfo.additionalNotes}
                  onChange={e => handleInputChange('additionalNotes', e.target.value)}
                  placeholder="e.g., Bold premium style, warm colors, minimal look"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/30 text-sm font-geist outline-none focus:border-emerald-400/50 focus:bg-white/[0.08] transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={!businessInfo.businessName || !businessInfo.businessProfile || loading}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold font-geist transition-all ${
                  businessInfo.businessName && businessInfo.businessProfile && !loading
                    ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-400/30 cursor-pointer'
                    : 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
                }`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Generate Website
              </button>
            </form>
          ) : (
            <form onSubmit={handleRevision} className="flex gap-2">
              <input
                type="text"
                value={revisionPrompt}
                onChange={e => setRevisionPrompt(e.target.value)}
                placeholder="Request changes, e.g. add pricing cards and stronger CTA"
                className="flex-1 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/30 text-sm font-geist outline-none focus:border-emerald-400/50 focus:bg-white/[0.08] transition-all"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-3 py-2 rounded-xl bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-400/30 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Preview Panel */}
      <div className="xl:w-1/2 flex flex-col bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden min-h-[420px]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 className="text-white font-semibold font-geist">Website Preview</h3>
          {step === 'preview' && (
            <div className="flex items-center gap-2">
              <button
                onClick={copyHtmlToClipboard}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-geist bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
              <button
                onClick={downloadHtml}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-geist bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/30 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Download HTML
              </button>
            </div>
          )}
        </div>

        {/* Preview Content */}
        {step === 'preview' && generatedHtml ? (
          <iframe
            className="flex-1 w-full border-none"
            srcDoc={generatedHtml}
            title="Generated Website Preview"
            sandbox="allow-scripts allow-forms allow-modals"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/40 text-center px-6">
            <div>
              <p className="text-sm font-geist">Fill in your business details and click "Generate Website"</p>
              <p className="text-xs text-white/25 mt-2 font-geist">Your preview will appear here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
