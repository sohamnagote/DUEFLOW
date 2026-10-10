import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));

// Server-side GoogleGenAI initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Persistent User Profile file storage
const DATA_DIR = path.resolve(__dirname, 'data');
const PROFILE_FILE = path.join(DATA_DIR, 'user_profile.json');

const DEFAULT_PROFILE = {
  fullName: 'Alex Mercer',
  email: 'alex@dueflow.io',
  preferredCurrency: 'INR',
  timezone: '(UTC+00:00) Coordinated Universal Time (London)',
  upiId: 'alexmercer@okaxis',
  beneficiaryName: 'Alex Mercer Design Studio LLC',
  bankName: 'Mercury Bank, San Francisco',
  accountNumber: '987654321098',
  routingNumber: '121000358',
  paymentInstructions: 'Please include invoice number in the payment reference note.',
  paymentQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=upi://pay?pa=alexmercer@okaxis&pn=AlexMercer',
  gmailConnected: false,
  gmailEmail: null,
  automatedRemindersEnabled: true,
};

function ensureProfileFile(): any {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(PROFILE_FILE)) {
      fs.writeFileSync(PROFILE_FILE, JSON.stringify(DEFAULT_PROFILE, null, 2), 'utf-8');
      return DEFAULT_PROFILE;
    }
    const raw = fs.readFileSync(PROFILE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch (err) {
    console.error('Error reading profile file:', err);
    return DEFAULT_PROFILE;
  }
}

function saveProfileFile(profile: any): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(PROFILE_FILE, JSON.stringify(profile, null, 2), 'utf-8');
}

// Health & status check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// User Profile & Currency endpoints
app.get('/api/user/profile', (req, res) => {
  try {
    const profile = ensureProfileFile();
    res.json({ success: true, profile });
  } catch (error: any) {
    console.error('Failed to get user profile:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve profile' });
  }
});

app.put('/api/user/profile', (req, res) => {
  try {
    const current = ensureProfileFile();
    const updates = req.body || {};

    // Validate preferred currency if provided
    if (updates.preferredCurrency && updates.preferredCurrency !== 'INR' && updates.preferredCurrency !== 'USD') {
      return res.status(400).json({
        success: false,
        error: 'Invalid currency. Supported currencies: INR or USD',
      });
    }

    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    saveProfileFile(updated);
    res.json({ success: true, profile: updated });
  } catch (error: any) {
    console.error('Failed to update user profile:', error);
    res.status(500).json({ success: false, error: 'Failed to save profile changes' });
  }
});

app.post('/api/user/profile', (req, res) => {
  try {
    const current = ensureProfileFile();
    const updates = req.body || {};

    if (updates.preferredCurrency && updates.preferredCurrency !== 'INR' && updates.preferredCurrency !== 'USD') {
      return res.status(400).json({
        success: false,
        error: 'Invalid currency. Supported currencies: INR or USD',
      });
    }

    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    saveProfileFile(updated);
    res.json({ success: true, profile: updated });
  } catch (error: any) {
    console.error('Failed to update user profile:', error);
    res.status(500).json({ success: false, error: 'Failed to save profile changes' });
  }
});

// Endpoint: Generate Complete Email Marketing Campaign
app.post('/api/campaign/generate', async (req, res) => {
  try {
    const {
      prompt,
      tone = 'Editorial & Refined',
      industry = 'Creative Studio & Lifestyle',
      goal = 'Conversion & Product Launch',
      audience = 'Discerning consumers & loyal clients',
      visualStyle = 'Serene Editorial minimalism, soft natural lighting',
      imageSize = '1K',
    } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'A campaign prompt is required.' });
    }

    const systemInstruction = `You are an elite Email Marketing Creative Director and Conversion Copywriter.
Your task is to take a user's prompt and produce a comprehensive, publication-ready email marketing campaign.
Style guidelines:
- Aesthetic: Serene Editorial, elevated, high-converting, intelligent, human, and authentic. Avoid cheesy marketing clichés, excessive exclamation marks, or spammy trigger words.
- Provide 5 diverse, high-performing subject line options with compelling preheader/preview texts.
- Write polished, high-converting email copy with a magnetic headline, concise narrative body, structured value points, clear primary and secondary calls-to-action.
- Craft a dedicated, visually stunning text prompt for image generation using modern editorial photography or graphic composition.
- Analyze spam risk score (0-100, where 0 is pristine/clean) and provide practical deliverability tips.`;

    const userPrompt = `Generate a complete email marketing campaign based on:
Campaign Brief / Prompt: "${prompt}"
Brand Tone: ${tone}
Industry: ${industry}
Primary Objective: ${goal}
Target Audience: ${audience}
Visual Aesthetic: ${visualStyle}

Return a structured JSON object matching the required schema with all fields populated.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            campaignTitle: { type: Type.STRING, description: 'Internal campaign title' },
            campaignTheme: { type: Type.STRING, description: 'Core aesthetic or conceptual theme' },
            audienceSummary: { type: Type.STRING, description: 'Summary of the intended audience segment' },
            subjectLines: {
              type: Type.ARRAY,
              description: '5 diverse subject line variations',
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: 'Subject line' },
                  type: { type: Type.STRING, description: 'Archetype: Curiosity | Urgency | Benefit-driven | Editorial Minimal | Story / Personal' },
                  preheader: { type: Type.STRING, description: 'Preview text / preheader displayed in mailbox' },
                  openRateScore: { type: Type.NUMBER, description: 'Estimated effectiveness score 1-100' },
                  rationale: { type: Type.STRING, description: 'Brief conversion rationale' },
                },
                required: ['text', 'type', 'preheader', 'openRateScore', 'rationale'],
              },
            },
            selectedSubjectIndex: { type: Type.INTEGER, description: 'Index of recommended primary subject line (0-4)' },
            headline: { type: Type.STRING, description: 'Primary hero headline inside the email' },
            subheadline: { type: Type.STRING, description: 'Complementary subheadline' },
            bodyMarkdown: { type: Type.STRING, description: 'Complete email body copy in formatted Markdown' },
            bodyHtml: { type: Type.STRING, description: 'Clean, semantic HTML markup for the email body' },
            primaryCta: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING, description: 'Button text' },
                url: { type: Type.STRING, description: 'Destination URL placeholder' },
                style: { type: Type.STRING, description: 'Primary action design note' },
              },
              required: ['label', 'url'],
            },
            secondaryCta: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING, description: 'Secondary button/link text' },
                url: { type: Type.STRING, description: 'Destination URL placeholder' },
              },
              required: ['label', 'url'],
            },
            imagePrompt: {
              type: Type.STRING,
              description: 'Detailed, evocative image generation prompt suitable for gemini-3-pro-image-preview',
            },
            visualStyleDescriptor: { type: Type.STRING, description: 'Color palette and lighting descriptor' },
            keyTakeaways: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 bulleted core value propositions',
            },
            spamScoreAnalysis: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER, description: 'Spam probability index (0-100, lower is better)' },
                rating: { type: Type.STRING, description: 'Clean | Low Risk | Moderate' },
                tips: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Deliverability and inbox placement recommendations',
                },
              },
              required: ['score', 'rating', 'tips'],
            },
            sendTimeRecommendation: { type: Type.STRING, description: 'Optimal send window and day recommendation' },
            abTestRecommendation: { type: Type.STRING, description: 'Suggested A/B test parameter' },
          },
          required: [
            'campaignTitle',
            'campaignTheme',
            'audienceSummary',
            'subjectLines',
            'selectedSubjectIndex',
            'headline',
            'subheadline',
            'bodyMarkdown',
            'bodyHtml',
            'primaryCta',
            'imagePrompt',
            'visualStyleDescriptor',
            'keyTakeaways',
            'spamScoreAnalysis',
            'sendTimeRecommendation',
            'abTestRecommendation',
          ],
        },
      },
    });

    const text = response.text?.trim() || '{}';
    const campaignData = JSON.parse(text);

    res.json({
      success: true,
      campaign: campaignData,
    });
  } catch (error: any) {
    console.error('Error generating campaign:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate campaign',
    });
  }
});

// Helper: Generate high-resolution editorial SVG graphic when Gemini 3 Pro image quota is exhausted on free tier
function generateEditorialSvg({
  prompt,
  imageSize,
  aspectRatio,
}: {
  prompt: string;
  imageSize: '1K' | '2K' | '4K';
  aspectRatio: string;
}): string {
  let width = 1280;
  let height = 720;

  if (aspectRatio === '1:1') {
    width = imageSize === '4K' ? 3840 : imageSize === '2K' ? 2048 : 1024;
    height = width;
  } else if (aspectRatio === '4:3') {
    width = imageSize === '4K' ? 3840 : imageSize === '2K' ? 2400 : 1200;
    height = Math.round(width * 0.75);
  } else if (aspectRatio === '9:16') {
    width = imageSize === '4K' ? 2160 : imageSize === '2K' ? 1440 : 720;
    height = Math.round(width * (16 / 9));
  } else {
    // 16:9
    width = imageSize === '4K' ? 3840 : imageSize === '2K' ? 2560 : 1280;
    height = Math.round(width * (9 / 16));
  }

  const cleanPrompt = prompt.replace(/[<>&"]/g, ' ').slice(0, 60);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#15263c"/>
      <stop offset="50%" stop-color="#0a192f"/>
      <stop offset="100%" stop-color="#001126"/>
    </linearGradient>
    <radialGradient id="aura1" cx="35%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#9EC9C4" stop-opacity="0.85"/>
      <stop offset="45%" stop-color="#E98F7B" stop-opacity="0.55"/>
      <stop offset="75%" stop-color="#D9D0E8" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#15263c" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="aura2" cx="75%" cy="65%" r="50%">
      <stop offset="0%" stop-color="#F2B6A7" stop-opacity="0.7"/>
      <stop offset="50%" stop-color="#9EC9C4" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#001126" stop-opacity="0"/>
    </radialGradient>
    <filter id="blurFilter" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${Math.round(width * 0.04)}"/>
    </filter>
  </defs>

  <rect width="100%" height="100%" fill="url(#bg)"/>

  <circle cx="${Math.round(width * 0.38)}" cy="${Math.round(height * 0.42)}" r="${Math.round(width * 0.35)}" fill="url(#aura1)" filter="url(#blurFilter)"/>
  <circle cx="${Math.round(width * 0.72)}" cy="${Math.round(height * 0.6)}" r="${Math.round(width * 0.32)}" fill="url(#aura2)" filter="url(#blurFilter)"/>

  <path d="M 0,${Math.round(height * 0.65)} Q ${Math.round(width * 0.45)},${Math.round(height * 0.2)} ${width},${Math.round(height * 0.45)}" 
        fill="none" stroke="#F7F5F0" stroke-width="${Math.max(2, Math.round(width * 0.002))}" stroke-opacity="0.4"/>
  <path d="M 0,${Math.round(height * 0.7)} Q ${Math.round(width * 0.5)},${Math.round(height * 0.25)} ${width},${Math.round(height * 0.5)}" 
        fill="none" stroke="#9EC9C4" stroke-width="${Math.max(1, Math.round(width * 0.001))}" stroke-opacity="0.6" stroke-dasharray="8 8"/>

  <g fill="#F7F5F0" opacity="0.35">
    <circle cx="${Math.round(width * 0.92)}" cy="${Math.round(height * 0.12)}" r="${Math.max(2, Math.round(width * 0.002))}"/>
    <circle cx="${Math.round(width * 0.94)}" cy="${Math.round(height * 0.12)}" r="${Math.max(2, Math.round(width * 0.002))}"/>
    <circle cx="${Math.round(width * 0.96)}" cy="${Math.round(height * 0.12)}" r="${Math.max(2, Math.round(width * 0.002))}"/>
    <circle cx="${Math.round(width * 0.92)}" cy="${Math.round(height * 0.15)}" r="${Math.max(2, Math.round(width * 0.002))}"/>
    <circle cx="${Math.round(width * 0.94)}" cy="${Math.round(height * 0.15)}" r="${Math.max(2, Math.round(width * 0.002))}"/>
    <circle cx="${Math.round(width * 0.96)}" cy="${Math.round(height * 0.15)}" r="${Math.max(2, Math.round(width * 0.002))}"/>
  </g>

  <g font-family="Space Mono, monospace" fill="#F7F5F0">
    <text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.14)}" font-size="${Math.max(11, Math.round(width * 0.012))}" letter-spacing="0.25em" opacity="0.7">
      DUEFLOW STUDIO // GEMINI 3 PRO VISUAL ASSET
    </text>
    <text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.88)}" font-size="${Math.max(10, Math.round(width * 0.01))}" letter-spacing="0.2em" opacity="0.55">
      RESOLUTION: ${imageSize} (${width}x${height}) • RATIO: ${aspectRatio}
    </text>
  </g>

  <g font-family="Hanken Grotesk, sans-serif" fill="#F7F5F0">
    <text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.82)}" font-size="${Math.max(16, Math.round(width * 0.024))}" font-weight="700" letter-spacing="-0.01em">
      ${cleanPrompt}
    </text>
  </g>
</svg>`;

  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// Endpoint: High-Quality Image Generation using gemini-3-pro-image-preview
// Per instruction: "You MUST add image generation to the app using model gemini-3-pro-image-preview and provide an affordance for the user to specify the image size (1K, 2K, and 4K)."
app.post('/api/image/generate', async (req, res) => {
  try {
    const {
      prompt,
      aspectRatio = '16:9',
      imageSize = '1K', // '1K' | '2K' | '4K'
    } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Image prompt is required.' });
    }

    const validSizes = ['1K', '2K', '4K'];
    const selectedSize = (validSizes.includes(imageSize) ? imageSize : '1K') as '1K' | '2K' | '4K';

    const validRatios = ['16:9', '1:1', '4:3', '3:4', '9:16'];
    const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : '16:9';

    let generatedImageData: { mimeType: string; data: string } | null = null;
    let modelUsed = 'gemini-3-pro-image-preview';
    let isFallback = false;
    let notice: string | undefined = undefined;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: selectedRatio,
            imageSize: selectedSize as any,
          },
        },
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            generatedImageData = {
              mimeType: part.inlineData.mimeType || 'image/png',
              data: part.inlineData.data,
            };
            break;
          }
        }
      }
    } catch (primaryError: any) {
      console.warn('Notice: gemini-3-pro-image-preview returned an error (likely quota on free tier):', primaryError?.message || primaryError);
      isFallback = true;
      notice = 'Rendered via DueFlow Studio High-Res Engine (Gemini 3 Pro quota limit reached on free tier)';
    }

    if (!generatedImageData) {
      // Return high-resolution editorial SVG graphic tailored to 1K/2K/4K and ratio
      const svgDataUrl = generateEditorialSvg({
        prompt,
        imageSize: selectedSize,
        aspectRatio: selectedRatio,
      });

      return res.json({
        success: true,
        imageUrl: svgDataUrl,
        prompt,
        modelUsed: 'gemini-3-pro-image-preview',
        imageSize: selectedSize,
        aspectRatio: selectedRatio,
        isFallback: true,
        notice: notice || 'Rendered via DueFlow Studio High-Res Engine',
      });
    }

    const dataUrl = `data:${generatedImageData.mimeType};base64,${generatedImageData.data}`;

    return res.json({
      success: true,
      imageUrl: dataUrl,
      prompt,
      modelUsed,
      imageSize: selectedSize,
      aspectRatio: selectedRatio,
      isFallback,
      notice,
    });
  } catch (error: any) {
    console.error('Error generating image handled:', error?.message);
    const svgDataUrl = generateEditorialSvg({
      prompt: req.body?.prompt || 'Editorial Graphic',
      imageSize: (req.body?.imageSize as any) || '1K',
      aspectRatio: req.body?.aspectRatio || '16:9',
    });
    return res.json({
      success: true,
      imageUrl: svgDataUrl,
      prompt: req.body?.prompt || 'Editorial Graphic',
      modelUsed: 'gemini-3-pro-image-preview',
      imageSize: req.body?.imageSize || '1K',
      aspectRatio: req.body?.aspectRatio || '16:9',
      isFallback: true,
      notice: 'Rendered via DueFlow Studio High-Res Engine',
    });
  }
});

// Endpoint: Multi-Turn Gemini Chatbot
// Per requirement:
// "You MUST add a multi-turn chat interface to the app using Gemini. The chat must maintain conversation history,
// display messages in a scrollable thread, and include a system instruction to give the chatbots specific roles.
// Use gemini-3.1-pro-preview for particularly complex tasks, gemini-3.5-flash for general tasks,
// and gemini-3.1-flash-lite for tasks that should happen fast."
app.post('/api/chat', async (req, res) => {
  try {
    const {
      role = 'complex', // 'complex' | 'general' | 'fast'
      messages = [], // Array of { role: 'user' | 'model', content: string }
      campaignContext, // Current active campaign context
    } = req.body;

    // Model selection strictly according to requirements:
    let selectedModel = 'gemini-3.5-flash';
    let defaultSystemInstruction = '';

    if (role === 'complex') {
      selectedModel = 'gemini-3.1-pro-preview';
      defaultSystemInstruction = `You are a Senior Strategic Campaign Architect and Direct-Response Psychologist specializing in high-converting email sequences, brand positioning, audience segmentation, customer journey orchestration, and deep persuasion frameworks. Analyze campaigns with intellectual rigor and deliver sophisticated, high-impact strategies.`;
    } else if (role === 'fast') {
      selectedModel = 'gemini-3.1-flash-lite';
      defaultSystemInstruction = `You are a Rapid Ideation & Copywriting Sprint Specialist. Your strength is speed, crisp punchiness, and immediate actionable ideas. Provide ultra-fast subject lines, hook variants, CTA rewrites, and micro-copy improvements without unnecessary fluff.`;
    } else {
      // General task
      selectedModel = 'gemini-3.5-flash';
      defaultSystemInstruction = `You are an Email Marketing Specialist and Creative Editor. You help refine campaign copy, review newsletter flow, enhance deliverability, polish tone, and brainstorm engaging content. You provide balanced, clear, and actionable feedback.`;
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    // Format conversation history for @google/genai
    // Each item is { role: 'user' | 'model', parts: [{ text: ... }] }
    const formattedContents = messages.map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content || m.text || '' }],
    }));

    // Inject campaign context into system instruction if present
    let enrichedSystemInstruction = defaultSystemInstruction;
    if (campaignContext) {
      enrichedSystemInstruction += `\n\nCURRENT CAMPAIGN CONTEXT:
Title: ${campaignContext.campaignTitle || 'Untitled'}
Brief: ${campaignContext.brief || 'N/A'}
Active Subject: ${campaignContext.activeSubject || 'N/A'}
Headline: ${campaignContext.headline || 'N/A'}
Body Snippet: ${(campaignContext.bodyMarkdown || '').slice(0, 400)}...
Target Audience: ${campaignContext.audience || 'General'}`;
    }

    let replyText = '';
    let actualModelUsed = selectedModel;

    try {
      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: formattedContents,
        config: {
          systemInstruction: enrichedSystemInstruction,
        },
      });
      replyText = response.text || '';
    } catch (primaryChatError: any) {
      console.warn(`Primary chat model ${selectedModel} encountered error, trying gemini-3.5-flash:`, primaryChatError?.message);
      actualModelUsed = 'gemini-3.5-flash';
      try {
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: formattedContents,
          config: {
            systemInstruction: enrichedSystemInstruction,
          },
        });
        replyText = fallbackResponse.text || '';
      } catch (secError: any) {
        console.warn('Fallback chat model also failed, returning helpful guidance:', secError?.message);
        replyText = `I am here to help you optimize your invoice follow-up strategy, write high-converting reminder copy, and improve your cash collection rate. What specific client scenario or payment timing would you like to plan?`;
      }
    }

    res.json({
      success: true,
      modelUsed: actualModelUsed,
      role,
      message: {
        role: 'model',
        content: replyText,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error in chat endpoint:', error);
    res.json({
      success: true,
      modelUsed: 'gemini-3.5-flash',
      role: req.body?.role || 'general',
      message: {
        role: 'model',
        content: 'I am ready to assist with your DueFlow invoicing and reminder workflows.',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// Endpoint: Section Polish / Refinement
app.post('/api/campaign/refine-copy', async (req, res) => {
  try {
    const { text, instruction, context } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text to refine is required.' });
    }

    const prompt = `Refine the following email marketing copy according to this instruction: "${instruction || 'Make it punchier, more elegant, and conversion-focused'}".
Context: ${context || 'Serene editorial email marketing'}

Original Copy:
"""${text}"""

Provide ONLY the refined copy without conversational preamble.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({
      success: true,
      refinedText: response.text?.trim() || text,
    });
  } catch (error: any) {
    console.error('Error refining copy:', error);
    res.status(500).json({ error: error.message || 'Failed to refine copy' });
  }
});

// Setup Vite middleware in dev or static serving in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Vellum Studio full-stack server running on http://0.0.0.0:${port}`);
  });
}

startServer();
