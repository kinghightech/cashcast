import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, AlertCircle, Loader } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

const GEMINI_API_KEY = 'AIzaSyANeLuWmuwQPAYLnI-ku0lfkGzoxvDC5UI';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYSTEM_PROMPT = `You are an expert website builder assistant. Your ONLY purpose is to help users create and build websites for their business.

You can help with:
- Website design and layout ideas
- HTML, CSS, and JavaScript code for building websites
- Website features and functionality recommendations
- Best practices for web design and user experience
- Helping users customize and style their websites
- General web development advice

You CANNOT and WILL NOT help with:
- Any topics unrelated to website building
- Creating content for other purposes
- Providing advice outside of web development
- Anything that isn't directly related to building a website

If a user asks you about something unrelated to website building, politely redirect them back to website building assistance.

Always provide practical, actionable code examples and explanations when helping build websites.`;

export interface WebsiteBetaProps {
  businessName?: string;
  businessType?: string;
  address?: string;
}

export function WebsiteBeta({ businessName = 'Your Business', businessType = 'Business' }: WebsiteBetaProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      type: 'system',
      content: `👋 Welcome to Website Builder Beta! I'm your AI assistant here to help you build a stunning website for ${businessName} (${businessType}).

Tell me about what you'd like your website to look like, what features you need, or ask for code help. I'm here to guide you through the entire website building process!`,
      timestamp: Date.now(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const callGeminiAPI = async (userMessage: string) => {
    try {
      setApiError('');
      setIsLoading(true);

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${SYSTEM_PROMPT}\n\nUser message: ${userMessage}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_ONLY_HIGH',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_ONLY_HIGH',
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_ONLY_HIGH',
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_ONLY_HIGH',
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini API error:', errorData);
        throw new Error(
          errorData.error?.message || `API request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        throw new Error('No content in API response');
      }

      return content;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'An error occurred while processing your request.';
      setApiError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    // Add user message
    const newUserMessage: Message = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    // Call API
    const aiResponse = await callGeminiAPI(userMessage);

    if (aiResponse) {
      const newAssistantMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        type: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, newAssistantMessage]);
    } else {
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        type: 'assistant',
        content: `I encountered an error: ${apiError || 'Please try again.'}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full h-[calc(100vh-200px)] flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-400/10 border border-blue-400/30 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white font-geist">Website Builder</h1>
          <p className="text-white/40 text-sm font-geist">AI-powered website creation for {businessName}</p>
        </div>
        <span className="ml-auto text-[10px] bg-blue-400/10 text-blue-400 border border-blue-400/30 px-3 py-1.5 rounded-full font-bold tracking-widest uppercase font-geist">
          BETA
        </span>
      </div>

      {/* Messages Container */}
      <div
        className="flex-1 overflow-y-auto rounded-3xl p-6 flex flex-col gap-4"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div
              className={`max-w-2xl rounded-2xl px-6 py-4 font-geist ${
                msg.type === 'user'
                  ? 'bg-blue-500/20 border border-blue-400/30 text-white'
                  : msg.type === 'system'
                  ? 'bg-emerald-400/10 border border-emerald-400/30 text-white/80'
                  : 'bg-white/5 border border-white/10 text-white/90'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 flex items-center gap-3">
              <Loader className="w-4 h-4 text-blue-400 animate-spin" />
              <p className="text-sm text-white/60 font-geist">AI is thinking...</p>
            </div>
          </div>
        )}

        {apiError && (
          <div className="flex justify-start">
            <div className="bg-red-500/10 border border-red-400/30 rounded-2xl px-6 py-4 flex items-start gap-3 max-w-2xl">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300 font-geist">{apiError}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <div className="flex gap-4">
        <div
          className="flex-1 rounded-2xl px-6 py-4 flex items-center gap-3 border border-white/10 focus-within:border-blue-400/50 focus-within:bg-white/[0.06] transition-all"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about building your website..."
            className="flex-1 bg-transparent text-white text-sm font-geist placeholder-white/30 focus:outline-none"
            disabled={isLoading}
          />
        </div>

        <button
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading}
          className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 hover:bg-blue-500/30 hover:border-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Info Footer */}
      <div className="text-center text-xs text-white/30 font-geist">
        <p>This AI assistant is specialized for website building only. Ask anything about creating and customizing your website!</p>
      </div>
    </div>
  );
}
