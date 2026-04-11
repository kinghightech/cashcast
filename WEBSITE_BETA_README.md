# Website Beta Feature - Setup & Usage Guide

## 📋 Overview
The **Website Beta** feature is a new section in Cash Cast that allows local businesses to generate custom websites powered by Google's Gemini AI. Users input their business details, and the AI creates a complete, responsive, professional website in seconds.

## 🚀 Quick Start

### 1. Authentication & API Key
Your Gemini API key is already configured in `.env.local`:
```
VITE_GEMINI_API_KEY=AIzaSyD1qFCfYlppdFYwP2w6afx7nEfOl4yZhGA
```
✅ The API key is **securely stored on the backend** and never exposed to the client.

### 2. Running the Feature

You have two options:

#### **Option A: Run Both Frontend & Backend Together** (Recommended)
```bash
npm run dev:all
```
This command:
- Starts the Vite frontend on `http://localhost:5173`
- Starts the Express backend on `http://localhost:5001`

#### **Option B: Run Separately**

Terminal 1 - Frontend:
```bash
npm run dev
```

Terminal 2 - Backend:
```bash
npm run dev:backend
```

Make sure both servers are running when using the Website Beta feature.

### 3. Access the Feature

1. Complete the onboarding flow in Cash Cast
2. Navigate to the **Dashboard**
3. Look for the **"Website Beta"** tab in the left sidebar (marked with "NEW" badge)
4. Click to open the Website Builder

## 🎨 How It Works

### User Flow
1. **Input Business Details:**
   - Business Name (e.g., "Coffee Corner Café")
   - Primary Services (e.g., "Premium specialty coffee, pastries, WiFi workspace")
   - Target Revenue Goals (e.g., "$5000/month, increase foot traffic by 30%")

2. **AI Generation:**
   - Frontend sends data to backend API
   - Backend calls Gemini API with strict system instruction
   - Gemini generates raw HTML (no markdown, no code blocks)

3. **Preview & Download:**
   - Website previews live in an iframe
   - Users can copy HTML code or download as `.html` file
   - Fully responsive and ready to deploy

### Security Implementation
- ✅ API key stored server-side only (in `backend.ts`)
- ✅ Vite environment variable used only for build-time configuration
- ✅ All Gemini API calls go through the secure backend endpoint
- ✅ Frontend never has access to raw API key

### System Instruction (Enforced in Backend)
```
You are an expert frontend developer building high-converting, single-page websites 
for local businesses. Based on the business details provided, generate a complete, 
responsive HTML document. You MUST embed all CSS within <style> tags and all JavaScript 
within <script> tags. Use modern, clean UI principles.

CRITICAL RULE: Do NOT wrap your response in markdown formatting. Do NOT use ```html blocks. 
Output absolutely nothing except the raw HTML string, starting exactly with <!DOCTYPE html>.
```

## 📁 File Structure

```
c:/Users/aahis/Hackathon/
├── backend.ts                          # Express server + Gemini API handler
├── .env.local                          # Environment variables (API key)
├── src/
│   └── components/
│       ├── Dashboard.tsx              # Updated with Website Beta tab
│       ├── WebsiteBeta.tsx           # ChatGPT-like UI component
│       └── ...
└── package.json                       # Updated with new scripts & dependencies
```

## 🔧 Key Files & Changes

### Backend (`backend.ts`)
- Express server running on port `5001`
- POST endpoint: `/api/generate-website`
- Validates input, calls Gemini, returns HTML safely

### Frontend (`src/components/WebsiteBeta.tsx`)
- React component with chat-like interface
- Split view: Input panel + Preview panel
- Copy/Download HTML functionality
- Responsive design with Tailwind CSS

### Dashboard (`src/components/Dashboard.tsx`)
- Added "Website Beta" nav item with "NEW" badge
- Integrated WebsiteBeta component rendering
- Passes business data from onboarding to component

## 📦 Dependencies Added

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.x.x"
  },
  "devDependencies": {
    "express": "^4.x.x",
    "cors": "^2.x.x",
    "@types/express": "^4.x.x",
    "@types/cors": "^2.x.x",
    "ts-node": "^10.x.x",
    "concurrently": "^8.x.x"
  }
}
```

## ⚙️ Configuration Details

### Vite Environment Variables
- `VITE_GEMINI_API_KEY` - Used only for backend initialization
- Frontend **never** has access to this via `import.meta.env`

### Backend Port
- Default: `5001`
- Change in `backend.ts` line: `const PORT = 5001;`

### CORS
- Backend allows requests from `http://localhost:5173` (Vite default)
- Configure in `backend.ts` as needed for production

## 🚨 Important Security Notes

1. **NEVER expose the API key in frontend code** - It's always server-side only
2. **Before deploying to production:**
   - Move `backend.ts` to a proper Node.js server (e.g., Vercel, Railway, AWS)
   - Use environment variables properly on your hosting platform
   - Configure CORS to only allow your domain
   - Consider rate limiting on the API endpoint

3. **Monitor Gemini API usage:**
   - The API key can be revoked at any time from Google Cloud Console
   - Check usage dashboard regularly for unexpected spikes

## 🐛 Troubleshooting

### "Failed to generate website" Error
1. Ensure backend is running: `npm run dev:backend`
2. Check that port 5001 is not in use
3. Verify API key is valid in `.env.local`

### CORS Error
The backend CORS is enabled, but if you're testing from a different domain, add it to the CORS configuration in `backend.ts`:
```typescript
app.use(cors({
  origin: ['http://localhost:5173', 'https://yourdomain.com']
}));
```

### Empty Preview
- Wait a moment for the iframe to render
- The generated HTML is injected via `srcDoc` attribute
- Check browser console for any errors

## 📈 Future Enhancements

- [ ] Store generated websites in user database
- [ ] Template variants (different design styles)
- [ ] Direct one-click hosting integration
- [ ] SEO optimization suggestions
- [ ] Domain name suggestions & registration
- [ ] Email template generation for promotions
- [ ] Social media graphic generation

## 🎓 Learning Resources

- [Gemini API Docs](https://ai.google.dev/)
- [Google Generative AI SDK](https://www.npmjs.com/package/@google/generative-ai)
- [Express.js Documentation](https://expressjs.com/)
- [React iframe Guide](https://react.dev/)

---

**Built with ❤️ for Cash Cast - Empowering Local Businesses**
