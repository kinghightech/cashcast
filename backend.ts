import cors from 'cors';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

if (!geminiApiKey) {
  console.warn('Missing GEMINI_API_KEY. Add it to your .env file.');
}

const genAI = new GoogleGenerativeAI(geminiApiKey || '');

const SYSTEM_INSTRUCTION = `You are an expert frontend developer building high-converting, single-page websites for local businesses. Based on the business details provided, generate a complete, responsive HTML document. You MUST embed all CSS within <style> tags and all JavaScript within <script> tags. Use modern, clean UI principles.
CRITICAL RULE: Do NOT wrap your response in markdown formatting. Do NOT use \`\`\`html blocks. Output absolutely nothing except the raw HTML string, starting exactly with <!DOCTYPE html>.
SECOND CRITICAL RULE: You are only allowed to generate websites. Never return explanations, policy text, or anything that is not website HTML.`;

let cachedModelName: string | null = null;

const preferredModels = [
  'gemini-3.1-pro-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

const directFallbackModels = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

async function fetchEligibleModels(apiKey: string): Promise<string[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to list Gemini models: HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
  };

  return (data.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => (m.name || '').replace(/^models\//, ''))
    .filter(Boolean);
}

function rankModels(eligible: string[]): string[] {
  const orderedPreferred = preferredModels.filter((name) => eligible.includes(name));
  const orderedRemainder = eligible.filter((name) => !orderedPreferred.includes(name));
  return [...orderedPreferred, ...orderedRemainder];
}

async function resolveModelName(apiKey: string): Promise<string> {
  if (cachedModelName) {
    return cachedModelName;
  }

  const eligible = await fetchEligibleModels(apiKey);

  if (eligible.length === 0) {
    throw new Error('No available Gemini models support generateContent for this API key');
  }

  cachedModelName = rankModels(eligible)[0];
  return cachedModelName;
}

app.get('/api/models', async (_req, res) => {
  try {
    if (!geminiApiKey) {
      return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY' });
    }
    const eligible = await fetchEligibleModels(geminiApiKey);
    return res.json({
      activeGenerateContentModels: rankModels(eligible),
      cachedModelName,
    });
  } catch (error: any) {
    return res.status(200).json({
      activeGenerateContentModels: directFallbackModels,
      cachedModelName,
      discoveryError: error?.message || 'Failed to list models',
    });
  }
});

app.post('/api/generate-website', async (req, res) => {
  try {
    if (!geminiApiKey) {
      return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY' });
    }

    const {
      businessName,
      primaryServices,
      targetRevenueGoals,
      businessProfile,
      additionalNotes,
    } = req.body;

    if (!businessName || !businessProfile) {
      return res.status(400).json({
        error: 'Missing required fields: businessName, businessProfile',
      });
    }

    const prompt = `Generate a professional, modern website for this local business:
Business Name: ${businessName}
Primary Services: ${primaryServices || 'Not provided'}
Target Revenue Goals: ${targetRevenueGoals || 'Not provided'}

Full Business Context:
${businessProfile}

Additional Builder Notes:
${additionalNotes || 'None'}

Create a single-page website that showcases the business, includes a services section, social proof/testimonials, and a strong call-to-action contact form. Make it visually appealing, mobile-first, and conversion-focused.`;

    let eligible: string[];
    try {
      eligible = rankModels(await fetchEligibleModels(geminiApiKey));
    } catch {
      eligible = directFallbackModels;
    }
    const attemptOrder = cachedModelName
      ? [cachedModelName, ...eligible.filter((m) => m !== cachedModelName)]
      : eligible;

    let result: Awaited<ReturnType<ReturnType<typeof genAI.getGenerativeModel>['generateContent']>> | null = null;
    let lastError: unknown = null;

    for (const modelName of attemptOrder) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          systemInstruction: SYSTEM_INSTRUCTION,
        });
        cachedModelName = modelName;
        break;
      } catch (err: any) {
        lastError = err;
        const message = String(err?.message || err || '');
        const retriableModelError =
          message.includes('404 Not Found') ||
          message.includes('is not found for API version') ||
          message.includes('not supported for generateContent');
        if (!retriableModelError) {
          throw err;
        }
      }
    }

    if (!result) {
      throw lastError ?? new Error('No active model succeeded for generateContent');
    }

    const htmlContent = result.response.text().trim();

    // Validate that response starts with <!DOCTYPE html
    if (!htmlContent.trim().startsWith('<!DOCTYPE')) {
      console.warn('Response does not start with <!DOCTYPE, it starts with:', htmlContent.substring(0, 100));
    }

    res.json({ html: htmlContent });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    const rawMessage = String(error?.message || '');
    const isApiKeyError =
      rawMessage.includes('API_KEY_INVALID') ||
      rawMessage.toLowerCase().includes('api key expired') ||
      rawMessage.toLowerCase().includes('api key not valid');

    res.status(500).json({
      error: isApiKeyError
        ? 'Gemini API key is invalid or expired. Generate a new key in Google AI Studio, update GEMINI_API_KEY in .env.local, then restart backend.'
        : error?.message || 'Failed to generate website',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});
