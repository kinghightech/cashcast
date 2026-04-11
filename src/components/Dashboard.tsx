import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, CheckSquare, Users2, Lightbulb, Settings, MapPin, TrendingUp, TrendingDown,
  Sun, Cloud, CloudRain, CloudSnow, CloudDrizzle, CloudLightning, CloudFog, RefreshCw, Minus, X,
  Sparkles, Calendar, ChevronDown, ChevronRight, Megaphone, Target, Video, Briefcase, Plus, Trash2, Edit2,
  Star, Award, Zap, AlertCircle, Building2
} from 'lucide-react';

// WMO weather codes → icon + label
const getWeatherInfo = (code: number) => {
  if (code === 0 || code === 1) return { icon: Sun, label: 'Sunny', color: 'text-yellow-400' };
  if (code === 2) return { icon: Cloud, label: 'Partly Cloudy', color: 'text-gray-300' };
  if (code === 3) return { icon: Cloud, label: 'Cloudy', color: 'text-gray-400' };
  if (code >= 45 && code <= 48) return { icon: CloudFog, label: 'Foggy', color: 'text-gray-400' };
  if (code >= 51 && code <= 55) return { icon: CloudDrizzle, label: 'Drizzle', color: 'text-blue-300' };
  if (code >= 56 && code <= 57) return { icon: CloudDrizzle, label: 'Freezing Drizzle', color: 'text-blue-200' };
  if (code >= 61 && code <= 65) return { icon: CloudRain, label: 'Rain', color: 'text-blue-400' };
  if (code >= 66 && code <= 67) return { icon: CloudRain, label: 'Freezing Rain', color: 'text-blue-200' };
  if (code >= 71 && code <= 77) return { icon: CloudSnow, label: 'Snow', color: 'text-white' };
  if (code >= 80 && code <= 82) return { icon: CloudRain, label: 'Showers', color: 'text-blue-400' };
  if (code >= 85 && code <= 86) return { icon: CloudSnow, label: 'Snow Showers', color: 'text-white' };
  if (code >= 95 && code <= 99) return { icon: CloudLightning, label: 'Thunderstorm', color: 'text-purple-400' };
  return { icon: Cloud, label: 'Cloudy', color: 'text-gray-300' };
};

interface WeatherDay {
  date: string;
  dayName: string;
  tempHigh: number;
  tempLow: number;
  weatherCode: number;
  precipitation: number;
  snowfallCm?: number;
  windspeedKmh?: number;
}

interface ChecklistItem {
  id: string;
  title: string;
  desc: string;
  status: string;
  category: 'operations' | 'marketing' | 'event' | 'trend' | 'other';
  source: 'manual' | 'idea-center';
  metadata?: Record<string, string | number | boolean | null>;
  assignedDate?: string;
  projectedGainPct?: number;
}

interface DashboardUpcomingEvent {
  id: string;
  title: string;
  date: string;
  dateLabel: string;
  metric: string;
  insight: string;
  source: 'calendarific';
}

export interface TrafficAnchor {
  name: string;
  type: string;
  rawType: string;
  distance: number;
  baseScore: number;
}

interface DashboardProps {
  address: string;
  userLatLng?: { lat: number; lng: number } | null;
  businessType: string;
  revenue: string;
  profitMargin: string;
  businessModel: string;
  mixedModels: string[];
  weatherData: WeatherDay[];
  weatherLoading: boolean;
  exposure: string | null;
  peakTraffic: string | null;
  customerSource: string | null;
  businessName?: string;
  anchors: TrafficAnchor[];
  anchorScore: number;
}

// ===== COMPETITORS SECTION HELPERS =====

const BUSINESS_TO_PLACE_TYPE: Record<string, string> = {
  'Restaurant': 'restaurant',
  'Café': 'cafe',
  'Bakery': 'bakery',
  'Clothing / Boutique': 'clothing_store',
  'Convenience Store': 'convenience_store',
  'Specialty Retail': 'store',
  'Hair Salon / Barber': 'hair_care',
  'Nail Salon': 'nail_salon',
  'Fitness Studio': 'gym',
  'Service Business': 'establishment',
};

const getCompetitorDistanceInMiles = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

interface Competitor {
  placeId: string;
  name: string;
  rating: number;
  reviewCount: number;
  distance: number;
  address: string;
  businessStatus: string;
  types: string[];
  openNow?: boolean;
  score: number;
}

interface CompetitorInsight {
  type: 'warning' | 'info' | 'success';
  title: string;
  body: string;
  action: string;
}

const generateCompetitorInsights = (comps: Competitor[], businessType: string): CompetitorInsight[] => {
  if (comps.length === 0) return [];
  const insights: CompetitorInsight[] = [];
  const bt = businessType?.toLowerCase() || '';

  // 1. Market Density
  const count = comps.length;
  if (count >= 10) {
    insights.push({
      type: 'warning',
      title: 'Highly Saturated Market',
      body: `${count} similar businesses found within 2 miles. This is a crowded local market.`,
      action: 'Differentiate aggressively — a unique sub-niche, specialty product line, or signature experience is essential to stand out.',
    });
  } else if (count >= 5) {
    insights.push({
      type: 'info',
      title: 'Moderately Competitive Area',
      body: `${count} similar businesses within 2 miles — competitive but not saturated.`,
      action: 'Focus on dominant review signals and a loyalty program to build a sticky, returning customer base.',
    });
  } else {
    insights.push({
      type: 'success',
      title: 'Low Local Competition',
      body: `Only ${count} similar businesses within 2 miles — this is relatively uncrowded territory.`,
      action: 'Move fast to establish yourself as the local go-to and claim every listing before the market fills in.',
    });
  }

  // 2. Local Leader Analysis
  const sorted = [...comps].sort((a, b) => b.score - a.score);
  const leader = sorted[0];
  if (leader) {
    if (leader.rating >= 4.5 && leader.reviewCount >= 100) {
      insights.push({
        type: 'warning',
        title: `Strong Local Leader: ${leader.name}`,
        body: `Rated ${leader.rating}★ with ${leader.reviewCount.toLocaleString()} reviews. Your primary threat at ${leader.distance} mi away.`,
        action: "Study their 1–3 star reviews closely — those gaps are your biggest opportunity to win customers away.",
      });
    } else if (leader.rating < 4.0 && leader.reviewCount > 30) {
      insights.push({
        type: 'success',
        title: 'Top Competitor Has a Weak Rating',
        body: `The highest-scoring competitor only holds ${leader.rating}★ — there's a clear quality gap in this market.`,
        action: 'Win on customer experience. A higher rating actively redirects their dissatisfied customers to you over time.',
      });
    } else {
      insights.push({
        type: 'info',
        title: 'No Dominant Local Leader Yet',
        body: `The top local competitor, ${leader.name}, hasn't established dominance (${leader.rating}★, ${leader.reviewCount} reviews).`,
        action: "This is a window of opportunity. Build your reviews and online presence aggressively to claim the local #1 spot.",
      });
    }
  }

  // 3. Review Benchmark
  const withReviews = comps.filter(c => c.reviewCount > 0);
  const avgReviews = withReviews.length > 0
    ? Math.round(withReviews.reduce((s, c) => s + c.reviewCount, 0) / withReviews.length)
    : 0;
  if (avgReviews > 200) {
    insights.push({
      type: 'warning',
      title: 'High-Volume Review Environment',
      body: `Nearby competitors average ${avgReviews.toLocaleString()} reviews. Social proof is critical here.`,
      action: 'Set up a post-visit review prompt via QR code, SMS, or receipt link. Consistent review generation is non-negotiable in this market.',
    });
  } else if (avgReviews > 50) {
    insights.push({
      type: 'info',
      title: 'Moderate Review Baseline',
      body: `Average competitor review count is around ${avgReviews}. Reaching 100+ reviews should be a near-term goal.`,
      action: 'Ask every satisfied customer for a Google review. Even 2–3 new reviews per week compounds into a major advantage.',
    });
  } else {
    insights.push({
      type: 'success',
      title: 'Low Review Baseline — Easy to Overtake',
      body: `Most competitors have fewer than ${Math.max(avgReviews + 10, 20)} reviews. The bar for social proof dominance is low here.`,
      action: 'Run a one-time review sprint: ask your existing loyal customers to leave a Google review this week.',
    });
  }

  // 4. Average Rating Context
  const withRatings = comps.filter(c => c.rating > 0);
  if (withRatings.length > 0) {
    const avgRating = withRatings.reduce((s, c) => s + c.rating, 0) / withRatings.length;
    if (avgRating > 4.2) {
      insights.push({
        type: 'info',
        title: 'High-Quality Competitive Bar',
        body: `Nearby competitors average ${avgRating.toFixed(1)}★. Customers in this area have high expectations.`,
        action: bt.includes('food') || bt.includes('café') || bt.includes('bakery')
          ? 'Invest in product consistency and presentation. In high-rating markets, 3-star reviews spread faster than 5-star ones.'
          : bt.includes('salon') || bt.includes('nail') || bt.includes('barber')
          ? 'Online booking, punctuality, and follow-up are the differentiators in a high-rating beauty market.'
          : 'Train staff on customer recovery — how complaints are handled publicly separates 4.5★ from 4.9★.',
      });
    }
  }

  return insights.slice(0, 4);
};

const getCompetitorTip = (competitor: Competitor, _businessType: string): string => {
  if (competitor.rating < 3.5) {
    return 'Poor satisfaction signals — win with reliably better quality and consistent customer service.';
  }
  if (competitor.rating >= 4.7 && competitor.reviewCount > 200) {
    return 'Highly trusted competitor. Target underserved customer segments or offer specialty products they lack.';
  }
  if (competitor.reviewCount < 30) {
    return 'Low review count — building your reviews aggressively will make you appear far more established.';
  }
  if (competitor.distance < 0.3) {
    return 'Direct foot-traffic competition. Standout signage, storefront appeal, and fast service are your main edge.';
  }
  if (competitor.rating > 4.5 && competitor.reviewCount < 100) {
    return 'Good reputation but still building trust. A consistent review strategy can match them within 60 days.';
  }
  return 'Differentiate with a loyalty program and active social presence to steadily draw their customers to you.';
};

// ===== END COMPETITORS HELPERS =====

const glassCard = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
};

const navItemsDef = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { 
    label: 'Suggestions', 
    icon: Lightbulb,
    subItems: [
      { label: 'Checklist', icon: CheckSquare },
      { label: 'Idea Center', icon: Sparkles },
      { label: 'For You', icon: Megaphone }
    ]
  },
  { label: 'Competitors', icon: Users2, badge: 'BETA' },
];

interface NewsArticle {
  uri: string;
  title: string;
  body: string;
  source: { title: string };
  url: string;
  dateTimePub: string;
  image: string | null;
}

// Curated BIG events with importance scores and business-specific suggestions
const BIG_EVENTS: Record<string, { importance: number; suggestions: Record<string, string>; defaultSuggestion: string }> = {
  "New Year's Day": { importance: 10, suggestions: { food: 'Launch a "New Year, New Menu" special or prix fixe dinner to kick off the year.', retail: 'Run a massive "New Year Clearance" sale on last season\'s inventory.', beauty: 'Offer a "New Year Glow-Up" package for fresh starts.' }, defaultSuggestion: 'Capitalize on fresh-start energy with a New Year promotion or themed offering.' },
  "Martin Luther King Jr. Day": { importance: 7, suggestions: { food: 'Feature a community-focused special menu and donate a portion of sales.', retail: 'Host a weekend sale honoring the holiday with community tie-ins.' }, defaultSuggestion: 'Engage your community with a meaningful promotion tied to the holiday.' },
  "Valentine's Day": { importance: 10, suggestions: { food: 'Create a special Valentine\'s dinner menu or couples\' dessert combo.', retail: 'Stock gift-ready bundles and create a "Last Minute Gifts" display.', beauty: 'Offer couples\' spa packages or "Galentine\'s Day" group deals.' }, defaultSuggestion: 'Create romantic or gift-focused promotions to capture Valentine\'s spending.' },
  "Presidents' Day": { importance: 6, suggestions: { retail: 'Run a Presidents\' Day weekend sale—historically one of the biggest retail sale weekends.' }, defaultSuggestion: 'Offer a long-weekend sale to capture holiday shoppers.' },
  "St. Patrick's Day": { importance: 9, suggestions: { food: 'Go all-in with green-themed food and drinks—green bagels, mint shakes, themed specials.', retail: 'Create a "Luck of the Irish" flash sale or green-themed window display.', beauty: 'Offer a fun green-themed service like emerald nail art or mint facials.' }, defaultSuggestion: 'Lean into the festive energy with green-themed products or promotions.' },
  "Pi Day": { importance: 5, suggestions: { food: 'Sell pies at $3.14 or offer 31.4% off pizza/pie items—this goes viral every year.' }, defaultSuggestion: 'Run a playful $3.14 deal or math-themed promo for social media buzz.' },
  "Easter Sunday": { importance: 8, suggestions: { food: 'Offer an Easter brunch special or family meal deal.', retail: 'Stock Easter baskets, candy, and spring décor prominently.' }, defaultSuggestion: 'Create family-oriented deals and spring-themed displays.' },
  "Easter Monday": { importance: 4, suggestions: {}, defaultSuggestion: 'Extend Easter deals for one more day to capture lingering traffic.' },
  "Mother's Day": { importance: 10, suggestions: { food: 'Pre-sell Mother\'s Day brunch reservations and gift cards starting 2 weeks early.', retail: 'Bundle top-selling items into ready-to-go gift baskets at the register.', beauty: 'Pre-sell "Mom & Me" spa day gift cards—this is your biggest gifting weekend.' }, defaultSuggestion: 'This is one of the highest-spending local weekends of the year. Push gift cards and bundles hard.' },
  "Memorial Day": { importance: 8, suggestions: { food: 'Launch a BBQ catering menu or "Memorial Day Weekend" meal kits.', retail: 'Run a Memorial Day blowout sale—big discounts drive major foot traffic.' }, defaultSuggestion: 'Kick off summer with a major sale or outdoor-themed promotion.' },
  "Father's Day": { importance: 9, suggestions: { food: 'Offer a "Dad Eats Free" deal or a special Father\'s Day menu.', retail: 'Create a curated "Gifts for Dad" display near the entrance.', beauty: 'Market men\'s grooming packages or "Dad\'s Day Off" spa deals.' }, defaultSuggestion: 'Target gifting and experiences for fathers with curated deals.' },
  "Independence Day": { importance: 10, suggestions: { food: 'Red, white & blue themed menu items and a BBQ special will crush it.', retail: 'Run a patriotic sale and stock outdoor/summer essentials.' }, defaultSuggestion: 'Go patriotic with themed products, decorations, and a July 4th sale.' },
  "Labor Day": { importance: 8, suggestions: { food: 'Promote end-of-summer catering or BBQ specials for the long weekend.', retail: 'Launch a "Last Days of Summer" clearance event.' }, defaultSuggestion: 'Capture last-hurrah summer spending with a long-weekend sale.' },
  "Columbus Day": { importance: 5, suggestions: { retail: 'Run a Columbus Day sale—historically strong for furniture, mattresses, and apparel.' }, defaultSuggestion: 'Offer a modest holiday sale to capture the long-weekend traffic.' },
  "Halloween": { importance: 9, suggestions: { food: 'Spooky-themed treats and drinks drive massive social media engagement.', retail: 'Stock costumes, candy, and decorations—display them prominently.', beauty: 'Offer Halloween-themed nail art or spooky makeup tutorials.' }, defaultSuggestion: 'Go all-in on Halloween theming—it drives incredible foot traffic and social buzz.' },
  "Veterans Day": { importance: 6, suggestions: { food: 'Offer a free meal or discount for veterans—it generates huge goodwill and press.' }, defaultSuggestion: 'Honor veterans with a special discount or thank-you promotion.' },
  "Thanksgiving Day": { importance: 10, suggestions: { food: 'Pre-sell Thanksgiving catering packages and meal kits weeks in advance.', retail: 'Tease Black Friday deals and extend store hours.' }, defaultSuggestion: 'Prepare for the biggest spending weekend of the year with pre-orders and Black Friday teasers.' },
  "Black Friday": { importance: 10, suggestions: { food: 'Offer a "Black Friday Fuel" deal for shoppers—coffee, sandwiches, quick bites.', retail: 'This is your Super Bowl. Maximum discounts, doorbuster deals, extended hours.' }, defaultSuggestion: 'Pull out all the stops—this is the single biggest shopping day of the year.' },
  "Cyber Monday": { importance: 7, suggestions: { retail: 'Push online deals and gift cards if you have any e-commerce presence.' }, defaultSuggestion: 'Extend Black Friday momentum with online-focused deals.' },
  "Christmas Eve": { importance: 9, suggestions: { food: 'Offer last-minute catering, holiday dessert trays, and gift cards.', retail: 'Create a "Last Minute Gifts" display near the entrance.' }, defaultSuggestion: 'Focus on last-minute gift buyers and convenience-driven purchases.' },
  "Christmas Day": { importance: 10, suggestions: { food: 'If open, a Christmas Day prix fixe menu draws big crowds.' }, defaultSuggestion: 'Christmas Day drives massive sentiment—use social media even if closed.' },
  "New Year's Eve": { importance: 9, suggestions: { food: 'Host a New Year\'s Eve dinner or party—people spend big on celebrations.', beauty: 'Offer "NYE Glam" packages for hair, makeup, and nails.' }, defaultSuggestion: 'Push celebration-themed promotions and party offerings.' },
  "Cinco de Mayo": { importance: 8, suggestions: { food: 'Themed menu items, margarita specials, and festive decorations are a must.' }, defaultSuggestion: 'Lean into the fiesta energy with themed products and promotions.' },
  "Super Bowl Sunday": { importance: 9, suggestions: { food: 'Catering platters, wing deals, and game-day specials drive huge orders.' }, defaultSuggestion: 'Target watch parties with catering deals and game-day promotions.' },
  "Earth Day": { importance: 5, suggestions: { food: 'Feature locally-sourced or plant-based specials and highlight sustainability.' }, defaultSuggestion: 'Run an eco-friendly promotion or highlight sustainable practices.' },
  "Tax Day": { importance: 5, suggestions: { food: 'Lots of restaurants do "Tax Day" freebies—a free cookie or drink goes viral.', retail: 'Offer a "Tax Refund Sale" to capture freshly-flush consumers.' }, defaultSuggestion: 'Capture post-tax-filing relief with a fun deal.' },
  "Juneteenth": { importance: 7, suggestions: { food: 'Celebrate with culturally significant menu items and community events.' }, defaultSuggestion: 'Honor the day with meaningful community engagement and celebration.' },
  "Indigenous Peoples' Day": { importance: 5, suggestions: {}, defaultSuggestion: 'Use the long weekend for a modest sale or community event.' },
};

const isBigEvent = (name: string): boolean => {
  return Object.keys(BIG_EVENTS).some(key => name.toLowerCase().includes(key.toLowerCase()));
};

const getEventMatch = (name: string): { importance: number; suggestions: Record<string, string>; defaultSuggestion: string } | null => {
  const match = Object.entries(BIG_EVENTS).find(([key]) => name.toLowerCase().includes(key.toLowerCase()));
  return match ? match[1] : null;
};

const getEventSuggestion = (eventName: string, businessType: string): string => {
  const match = getEventMatch(eventName);
  if (!match) return '';
  const bt = businessType?.toLowerCase() || '';
  if (bt.includes('restaurant') || bt.includes('café') || bt.includes('bakery') || bt.includes('food')) return match.suggestions.food || match.defaultSuggestion;
  if (bt.includes('retail') || bt.includes('clothing') || bt.includes('convenience') || bt.includes('store') || bt.includes('boutique')) return match.suggestions.retail || match.defaultSuggestion;
  if (bt.includes('salon') || bt.includes('barber') || bt.includes('nail') || bt.includes('beauty') || bt.includes('spa')) return match.suggestions.beauty || match.defaultSuggestion;
  return match.defaultSuggestion;
};
const getTrendsForBusiness = (type: string) => {
  const isFood = ['Restaurant', 'Café', 'Bakery'].includes(type);
  const isRetail = ['Clothing / Boutique', 'Convenience Store', 'Specialty Retail'].includes(type);
  const isBeauty = ['Hair Salon / Barber', 'Nail Salon'].includes(type);
  const isFitness = ['Fitness Studio'].includes(type);

  // US Events (Simulated for upcoming months)
  const events = [
    {
      id: 'e1',
      title: '🏀 March Madness / Final Four',
      date: 'Late March - Early April',
      insight: 'The tournament drives unpredictable but massive local foot traffic and group outings.',
      action: isFood 
        ? 'Create a "Bracket Challenge" where correct guesses win a 10% discount or free appetizer.' 
        : 'Offer a "Slam Dunk" weekend sale—15% off when customers wear their favorite team colors.',
      metric: '+22% avg. traffic'
    },
    {
      id: 'e2',
      title: '🌸 Spring Break Kickoff',
      date: 'Late March - April',
      insight: 'College students and families are staying local, looking for weekday experiences.',
      action: isBeauty 
        ? 'Offer a "Spring Glow-Up" package targeting students on break.' 
        : 'Promote a "Staycation" local discount to capture the midday foot traffic surge.',
      metric: 'High midday surge'
    },
    {
      id: 'e3',
      title: '🌮 Cinco de Mayo',
      date: 'May 5th',
      insight: 'A massive spending day for food, beverage, and party supplies across all demographics.',
      action: isFood 
        ? 'Host a themed happy hour menu with limited-time tacos or margaritas.' 
        : 'Run a "Fiesta" flash sale for 24 hours to drive urgency.',
      metric: '+45% daily revenue'
    },
    {
      id: 'e4',
      title: '💐 Mother\'s Day Weekend',
      date: 'Second Sunday in May',
      insight: 'One of the highest grossing local spending weekends of the entire year.',
      action: isBeauty 
        ? 'Pre-sell "Mom & Me" spa day gift cards starting in mid-April.' 
        : 'Bundle top-selling items into ready-to-go gift baskets right at the register.',
      metric: 'Huge gifting spike'
    }
  ];

  // Viral Market Trends based on user request
  const marketTrends = [
    {
      id: 't1',
      title: '🍫 Dubai Chocolate (Pistachio Kunafa)',
      image: '/dubai.jpg',
      insight: 'The viral thick chocolate bar stuffed with crispy toasted kunafa and pistachio cream has exploded on TikTok.',
      action: isFood 
        ? 'Create a limited-time "Dubai Chocolate" inspired dessert, croissant, or latte flavor. Post a video breaking it in half to show the crunch.'
        : isRetail
        ? 'Stock up on imported pistachio chocolate bars or similar trending sweets and prominently display them at checkout.'
        : 'Offer a complimentary mini pistachio chocolate to clients during their service to elevate the premium, trendy feel of your business.',
      metric: '+300% search volume'
    },
    {
      id: 't2',
      title: '🫧 NeeDoh Boom (Squishy Trend)',
      image: '/needoh.jpg',
      insight: 'These satisfying, colorful sensory stress balls are the absolute hottest impulse-buy product of the month.',
      action: isRetail 
        ? 'Source NeeDoh or similar sensory toys and create a bright, highly tactile display right near the entrance or register.'
        : isBeauty
        ? 'Keep stylish sensory toys like NeeDoh in the waiting area to act as stress-relief props for nervous clients.'
        : 'Give away mini squishies as a "surprise and delight" gift for kids dining with their families to boost reviews.',
      metric: '#1 Impulse Buy'
    },
    {
      id: 't3',
      title: '🥁 Tung Tung Tung Sahoor',
      image: '/t3.jpg',
      insight: 'A massive viral Ramadan sound/trend across TikTok and Instagram Reels originating from Indonesia.',
      action: isFood
        ? 'Extend hours for late-night Suhoor meals or create a special Suhoor bundle for takeout, using the trending audio on your TikTok.'
        : 'Run a "Late Night Flash Sale" during Ramadan and use the viral Tung Tung Tung sound in your promotional social media posts.',
      metric: 'Viral Audio'
    }
  ];

  return { events, marketTrends };
};

export const Dashboard = ({
  address, userLatLng, businessType, revenue, profitMargin, businessModel,
  mixedModels, weatherData, weatherLoading, exposure, peakTraffic, customerSource, businessName,
  anchors, anchorScore
}: DashboardProps) => {
  // Tab & state
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string>>({});
  const [trendingDates, setTrendingDates] = useState<Record<string, boolean>>({});

  // Dynamic Checklist State
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'c1', title: 'Claim Google Business Profile', desc: 'Ensure your hours, website, and phone number are perfectly correct to capture local "near me" searches.', status: 'High Priority', category: 'operations', source: 'manual', metadata: { origin: 'seed' } },
    { id: 'c2', title: 'Set up Local SEO Keywords', desc: `Add "${address.split(',')[0]} ${businessType?.toLowerCase()}" organically across your website text and social media bios.`, status: 'Pending', category: 'marketing', source: 'manual', metadata: { origin: 'seed' } },
    { id: 'c3', title: 'Verify State Tax Registration', desc: 'Double-check that your sales tax registration is active and the latest quarterly filings are prepped.', status: 'Pending', category: 'operations', source: 'manual', metadata: { origin: 'seed' } },
    { id: 'c4', title: 'Standardize Customer Intake', desc: 'Create a single Google Form or digital waiver for new customers to capture email addresses automatically.', status: 'Low Priority', category: 'operations', source: 'manual', metadata: { origin: 'seed' } }
  ]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', desc: '' });
  const [addedIdeaIds, setAddedIdeaIds] = useState<Set<string>>(new Set());

  // Competitors state
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [competitorsLoading, setCompetitorsLoading] = useState(false);
  const [competitorsError, setCompetitorsError] = useState('');
  const [competitorsFetched, setCompetitorsFetched] = useState(false);
  const competitorsFetchingRef = useRef(false);

  // Real Calendarific Data
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const url = `https://calendarific.com/api/v2/holidays?api_key=VJQiIwJAOmpUpLFcHpIrlSq8njnD3rwO&country=US&year=${new Date().getFullYear()}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data?.response?.holidays) {
          setCalendarEvents(data.response.holidays);
        }
      } catch (e) {
        console.error('Failed to fetch calendarific', e);
      }
    };
    fetchHolidays();
  }, []);

  useEffect(() => {
    if (!calendarEvents.length) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + 14);

    const upcoming = calendarEvents
      .filter((h: any) => {
        const d = new Date(h.date?.iso + 'T00:00:00');
        return d >= today && d <= end && Array.isArray(h.type) && (h.type.includes('National holiday') || h.type.includes('Observance'));
      })
      .map((h: any, idx: number) => {
        const d = new Date(h.date.iso + 'T00:00:00');
        return {
          id: `dash_ev_${h.name.replace(/\s+/g, '_').toLowerCase()}_${idx}`,
          title: h.name,
          date: h.date.iso,
          dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' }),
          metric: 'Upcoming Event',
          insight: h.description?.length > 140 ? `${h.description.slice(0, 137)}...` : (h.description || `${h.name} may influence local demand.`),
          source: 'calendarific' as const,
        };
      })
      .sort((a: DashboardUpcomingEvent, b: DashboardUpcomingEvent) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setDashboardEvents(upcoming);
  }, [calendarEvents]);

  const [showApiInfo, setShowApiInfo] = useState(false);
  const [dashboardEvents, setDashboardEvents] = useState<DashboardUpcomingEvent[]>([]);

  // Deterministic 5-10% uplift so logic is predictable and swappable later.
  const calculateProjectedGain = (itemId: string, date: string): number => {
    const seed = `${itemId}:${date}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    return 5 + (hash % 6); // 5..10
  };

  const assignChecklistItemToDate = (itemId: string, date: string) => {
    const gain = calculateProjectedGain(itemId, date);
    setChecklist(prev => prev.map(item => item.id === itemId ? { ...item, assignedDate: date, projectedGainPct: gain } : item));
  };

  const getChecklistItemsForDate = (date: string) => checklist.filter(item => item.assignedDate === date);
  const getChecklistGainForDate = (date: string) =>
    getChecklistItemsForDate(date).reduce((sum, item) => sum + (item.projectedGainPct || 0), 0);

  const getDashboardEventsForDate = (date: string) => dashboardEvents.filter(ev => ev.date === date);

  // Ticketmaster Local Events
  const [ticketmasterEvents, setTicketmasterEvents] = useState<any[]>([]);
  const [ticketmasterLoading, setTicketmasterLoading] = useState(false);
  const [ticketmasterError, setTicketmasterError] = useState('');
  useEffect(() => {
    let cancelled = false;

    const waitForGoogleMaps = async (maxWaitMs = 10000, intervalMs = 200) => {
      const started = Date.now();
      while (Date.now() - started < maxWaitMs) {
        if (window.google?.maps?.Geocoder) return true;
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
      return false;
    };

    const fetchLocalEvents = async () => {
      setTicketmasterLoading(true);
      setTicketmasterError('');
      try {
        const isGoogleReady = await waitForGoogleMaps();
        let lat = userLatLng?.lat;
        let lng = userLatLng?.lng;

        // Prefer lat/lng from onboarding and geocode only when needed.
        if ((lat == null || lng == null) && isGoogleReady) {
          const geocoder = new window.google.maps.Geocoder();
          const geoResult = await new Promise<any>((resolve, reject) => {
            geocoder.geocode({ address }, (results: any, status: string) => {
              if (status === 'OK' && results[0]) resolve(results[0]);
              else reject(new Error(`Geocoding failed: ${status}`));
            });
          });
          lat = geoResult.geometry.location.lat();
          lng = geoResult.geometry.location.lng();
        }

        if (lat == null || lng == null) {
          throw new Error('Could not determine location coordinates for local events.');
        }
        
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const startDate = today.toISOString().split('.')[0] + 'Z';
        const endDate = nextWeek.toISOString().split('.')[0] + 'Z';

        const fetchTicketmasterEvents = async (params: URLSearchParams) => {
          const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`);
          if (!res.ok) throw new Error(`Ticketmaster request failed (${res.status})`);
          const data = await res.json();
          return data?._embedded?.events || [];
        };

        // Pass 1: strict local + date range
        const strictParams = new URLSearchParams({
          apikey: 'CbWqLGxPJkOnKoYFneIykAlLzOromtCl',
          latlong: `${lat},${lng}`,
          radius: '35',
          unit: 'miles',
          startDateTime: startDate,
          endDateTime: endDate,
          size: '50',
          sort: 'date,asc',
        });

        let events = await fetchTicketmasterEvents(strictParams);

        // Pass 2: broader local search without strict date window
        if (!events.length) {
          const broadParams = new URLSearchParams({
            apikey: 'CbWqLGxPJkOnKoYFneIykAlLzOromtCl',
            latlong: `${lat},${lng}`,
            radius: '60',
            unit: 'miles',
            size: '80',
            sort: 'date,asc',
          });
          events = await fetchTicketmasterEvents(broadParams);
        }

        // Pass 3: city fallback if geo-based calls return empty
        if (!events.length) {
          const city = (address.split(',')[1] || address.split(',')[0] || '').trim();
          if (city) {
            const cityParams = new URLSearchParams({
              apikey: 'CbWqLGxPJkOnKoYFneIykAlLzOromtCl',
              city,
              countryCode: 'US',
              size: '80',
              sort: 'date,asc',
            });
            events = await fetchTicketmasterEvents(cityParams);
          }
        }

        if (cancelled) return;
        setTicketmasterEvents(events);
        if (!events.length) {
          setTicketmasterError('No Ticketmaster events returned for your area right now.');
        }
      } catch (e: any) {
        console.error('Ticketmaster fetch failed', e);
        if (!cancelled) {
          setTicketmasterEvents([]);
          setTicketmasterError(e?.message || 'Failed to connect to Ticketmaster API.');
        }
      } finally {
        if (!cancelled) setTicketmasterLoading(false);
      }
    };

    fetchLocalEvents();

    return () => {
      cancelled = true;
    };
  }, [address, userLatLng?.lat, userLatLng?.lng]);

  // Competitors Fetch — triggers once when Competitors tab is first opened
  useEffect(() => {
    if (activeTab !== 'Competitors' || competitorsFetched || competitorsFetchingRef.current) return;
    competitorsFetchingRef.current = true;

    const fetchCompetitors = async () => {
      setCompetitorsFetched(true);
      setCompetitorsLoading(true);
      setCompetitorsError('');
      try {
        // 1. Geocode the business address
        const geocoder = new window.google.maps.Geocoder();
        const geoResult = await new Promise<any>((resolve, reject) => {
          geocoder.geocode({ address }, (results: any, status: string) => {
            if (status === 'OK' && results[0]) resolve(results[0]);
            else reject(new Error(`Geocoding failed: ${status}`));
          });
        });
        const userLat = geoResult.geometry.location.lat();
        const userLng = geoResult.geometry.location.lng();

        // 2. Search for nearby same-category businesses
        const placeType = BUSINESS_TO_PLACE_TYPE[businessType] || 'establishment';
        const service = new window.google.maps.places.PlacesService(document.createElement('div'));

        const results = await new Promise<any[]>((resolve, reject) => {
          service.nearbySearch(
            { location: { lat: userLat, lng: userLng }, radius: 3219, type: placeType },
            (res: any[], status: string) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && res) resolve(res);
              else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) resolve([]);
              else reject(new Error(`Places search failed: ${status}`));
            }
          );
        });

        // 3. Process, score, and rank results
        const processed: Competitor[] = results
          .filter(r => r.geometry?.location && r.name)
          .map(r => {
            const rLat = r.geometry.location.lat();
            const rLng = r.geometry.location.lng();
            const distance = getCompetitorDistanceInMiles(userLat, userLng, rLat, rLng);
            const rating = r.rating || 0;
            const reviewCount = r.user_ratings_total || 0;
            // Composite score: rating 40% + reviews 30% + proximity 30%
            const ratingScore = (rating / 5) * 40;
            const reviewScore = (Math.min(reviewCount, 500) / 500) * 30;
            const proximityScore = Math.max(0, (1 - distance / 2)) * 30;
            const score = Math.round(ratingScore + reviewScore + proximityScore);
            return {
              placeId: r.place_id || '',
              name: r.name,
              rating,
              reviewCount,
              distance: Math.round(distance * 10) / 10,
              address: r.vicinity || '',
              businessStatus: r.business_status || 'OPERATIONAL',
              types: r.types || [],
              openNow: r.opening_hours?.open_now,
              score,
            };
          })
          .filter(c => c.distance <= 2.0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);

        setCompetitors(processed);
      } catch (err: any) {
        console.error('Competitors fetch failed:', err);
        setCompetitorsError(err.message || 'Failed to load competitor data. Please try again.');
        competitorsFetchingRef.current = false;
      } finally {
        setCompetitorsLoading(false);
      }
    };

    if (window.google?.maps) {
      fetchCompetitors();
    } else {
      setCompetitorsError('Google Maps could not be loaded. Please refresh the page.');
      competitorsFetchingRef.current = false;
    }
  }, [activeTab, competitorsFetched, address, businessType]);

  // Estimate event size/importance from Ticketmaster data using proxy signals
  // Returns a score out of 10
  const estimateEventSize = (event: any): number => {
    const capacity = event._embedded?.venues?.[0]?.capacity ?? 0;
    const priceRanges = event.priceRanges?.length ?? 0;
    const upcomingEvents = event._embedded?.attractions?.[0]?.upcomingEvents?._total ?? 0;

    // Prioritize venue capacity. Fallback to weak proxy if capacity missing.
    if (capacity >= 10000) return 10;
    if (capacity >= 5000) return 8;
    if (capacity >= 1000) return 6;
    if (capacity > 0) return 3;

    const proxyScore =
      (priceRanges >= 3 ? 3 : priceRanges >= 1 ? 1 : 0) +
      (upcomingEvents > 20 ? 3 : upcomingEvents > 5 ? 2 : 0);
    return proxyScore;
  };

  // Get the biggest event impact for a specific date
  const getDayEventImpact = (dateString: string): { score: number; event: any | null } => {
    const dayEvents = ticketmasterEvents
      .map(e => ({ ...e, tmTrafficScore: estimateEventSize(e) }))
      .filter(e => e.dates?.start?.localDate === dateString)
      .sort((a, b) => b.tmTrafficScore - a.tmTrafficScore);

    if (dayEvents.length === 0) return { score: 0, event: null };

    const top = dayEvents[0];
    const capacity = top._embedded?.venues?.[0]?.capacity ?? 0;
    const s = top.tmTrafficScore;
    let pct = 0;

    // Exact event uplift tiers requested
    if (capacity >= 10000 || s >= 9) pct = 0.45;
    else if (capacity >= 5000 || s >= 7) pct = 0.15;
    else if (capacity >= 1000 || s >= 5) pct = 0.04;
    else return { score: 0, event: null };
    
    return { score: pct, event: top };
  };

  const dailyRev = Number(revenue || 0);
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Calculate base score for a single anchor based on day of week
  const getSingleAnchorScore = (a: TrafficAnchor, day: number) => {
    let sc = a.baseScore;
    switch (a.rawType) {
      case 'school':
      case 'university':
        if (day === 0 || day === 6) sc = 0; // Closed weekends
        else if (day === 5) sc *= 1.2; // Friday sports
        break;
      case 'church':
      case 'place_of_worship':
        if (day === 0) sc *= 2.0; // Sunday boost
        else if (day === 6) sc *= 1.2; 
        else sc *= 0.2; // Dead weekdays
        break;
      case 'supermarket':
        if (day === 0 || day === 6) sc *= 1.3; // Weekend grocery
        break;
      case 'movie_theater':
      case 'stadium':
        if (day === 5 || day === 6) sc *= 1.5; // Weekend entertainment
        break;
      case 'transit_station':
        if (day === 0 || day === 6) sc *= 0.7; // Less commuters
        break;
    }
    return Math.round(sc);
  };

  // Get total anchor score for a specific date
  const getDayAnchorScore = (dateString: string) => {
    if (!anchors || anchors.length === 0) return 0;
    const d = new Date(dateString + 'T00:00:00');
    const day = d.getDay();
    let total = 0;
    anchors.forEach(a => {
        total += getSingleAnchorScore(a, day);
    });
    return total;
  };

  // Helper to explain WHY an anchor is scoring the way it is on the selected day
  const getAnchorActiveStatus = (a: TrafficAnchor, day: number) => {
    switch (a.rawType) {
      case 'school':
      case 'university':
        if (day === 0 || day === 6) return 'Inactive (Closed on Weekends)';
        return 'Active (Peak: Weekdays)';
      case 'church':
      case 'place_of_worship':
        if (day === 0) return 'Peak Activity (Sunday)';
        if (day === 6) return 'Moderate Activity (Saturday)';
        return 'Inactive on Weekdays';
      case 'supermarket':
        if (day === 0 || day === 6) return 'Peak Activity (Weekend)';
        return 'Active';
      case 'movie_theater':
      case 'stadium':
        if (day === 5 || day === 6) return 'Peak Activity (Weekend)';
        return 'Active';
      case 'transit_station':
        if (day > 0 && day < 6) return 'Peak Commuter Traffic';
        return 'Reduced Weekend Traffic';
      default:
        return 'Active';
    }
  };

  // ----- CASHCAST AI FORECASTING ENGINE -----
  
  interface CashCastForecast {
    baselineRevenue: number;
    forecastedRevenue: number;
    confidenceLow: number;
    confidenceHigh: number;
    totalImpact: number;
    vsBaseline: number;
    revenueDifference: number;
    revenueDifferencePercent: number;
    isRedDay: boolean;
    weatherImpact: {
      adjustmentPct: number;
      condition: string;
      reasoning: string;
      rawPrecip?: number;
      rawSnowInches?: number;
      rawWindKmh?: number;
      rawTempF?: number;
    };
    dowImpactPct: number;
    schoolImpactPct: number;
    trendImpactPct: number;
    holidayImpactPct: number;
    eventImpact: {
      adjustmentPct: number;
      eventName: string;
      peakWindow: string;
      recommendedPromotion: string;
      reasoning: string;
      bigEvent?: any;
    } | null;
    topInsight: string;
    actionItem: string;
    checklistImpactPct: number;
    // Legacy UI compat
    pct: string;
    positive: boolean | null;
    rawTotal: number;
    tmTrafficScore?: number;
  }

  const generateAIForecast = (day: WeatherDay): CashCastForecast => {
    const bType = (businessType || '').toLowerCase();
    const baseRev = Number(revenue || 500);
    const d = new Date(day.date + 'T00:00:00');
    const dow = d.getDay(); // 0 = Sunday
    const month = d.getMonth();
    const monthDay = d.getDate();

    // Core model uses decimal impacts where -0.20 = -20%
    let totalImpact = 0;

    // D: day-of-week shaping (light default prior)
    let dowAdj = 0;
    if (dow === 1 || dow === 2) dowAdj = -0.06;
    else if (dow === 5) dowAdj = 0.05;
    else if (dow === 6) dowAdj = 0.03;
    totalImpact += dowAdj;

    // W: weather impact from exact rules
    const code = day.weatherCode;
    const precipMm = day.precipitation || 0;
    const snowfallCm = day.snowfallCm || 0;
    const snowfallInches = snowfallCm * 0.393701;
    const windKmh = day.windspeedKmh || 0;
    const tempF = day.tempHigh || 0;
    let wAdj = 0;
    let wCondition = 'Stable';
    let wReasoning = 'No major weather disruption expected.';

    // Snow is always treated as negative for this model.
    if (code >= 71 && code <= 86) {
      if (snowfallInches > 6) {
        wAdj = -0.55;
        wCondition = 'Heavy Snow (6+ in)';
        wReasoning = `Heavy snow (${snowfallInches.toFixed(1)} in). Sharp drop expected.`;
      } else if (snowfallInches > 4) {
        wAdj = -0.35;
        wCondition = 'Significant Snow (4-6 in)';
        wReasoning = `Significant snow (${snowfallInches.toFixed(1)} in). Strong negative impact expected.`;
      } else if (snowfallInches > 1) {
        wAdj = -0.15;
        wCondition = 'Light Snow (1-4 in)';
        wReasoning = `Light snow (${snowfallInches.toFixed(1)} in). Moderate traffic drag expected.`;
      } else {
        // If weather code says snow but snowfall depth is low/missing, still force negative day.
        wAdj = -0.20;
        wCondition = 'Snow Conditions';
        wReasoning = 'Snow reported by forecast code. Treating as negative demand pressure even with low recorded depth.';
      }
    } else if (snowfallInches > 6) {
      wAdj = -0.55;
      wCondition = 'Heavy Snow (6+ in)';
      wReasoning = `Heavy snow (${snowfallInches.toFixed(1)} in). Sharp drop expected.`;
    } else if (snowfallInches > 4) {
      wAdj = -0.35;
      wCondition = 'Significant Snow (4-6 in)';
      wReasoning = `Significant snow (${snowfallInches.toFixed(1)} in). Strong negative impact expected.`;
    } else if (snowfallInches > 1) {
      wAdj = -0.15;
      wCondition = 'Light Snow (1-4 in)';
      wReasoning = `Light snow (${snowfallInches.toFixed(1)} in). Moderate traffic drag expected.`;
    } else if (code >= 95) {
      wAdj = -0.50;
      wCondition = 'Thunderstorm';
      wReasoning = 'Thunderstorm conditions expected. Major demand drop likely.';
    } else if (precipMm > 20) {
      wAdj = -0.30;
      wCondition = 'Heavy Rain (20mm+)';
      wReasoning = `Heavy rain (${precipMm.toFixed(1)} mm) hurts local movement and walk-in demand.`;
    } else if (precipMm > 5) {
      wAdj = -0.15;
      wCondition = 'Rain (5-20mm)';
      wReasoning = `Moderate rain (${precipMm.toFixed(1)} mm) creates clear demand drag.`;
    } else if (precipMm > 0) {
      wAdj = -0.05;
      wCondition = 'Light Rain (0-5mm)';
      wReasoning = `Light rain (${precipMm.toFixed(1)} mm) still reduces casual walk-in traffic.`;
    } else if (windKmh > 60) {
      wAdj = -0.20;
      wCondition = 'High Winds (60+ km/h)';
      wReasoning = `High winds (${windKmh.toFixed(1)} km/h). Outdoor movement typically drops.`;
    } else {
      // Temperature tier model requested by user.
      if (tempF > 70) {
        wAdj = 0.12;
        wCondition = 'Warm (70F+)';
        wReasoning = `Temperature ${tempF.toFixed(0)}F. Applying +12% weather lift.`;
      } else if (tempF > 60) {
        wAdj = 0.08;
        wCondition = 'Mild (60F+)';
        wReasoning = `Temperature ${tempF.toFixed(0)}F. Applying +8% weather lift.`;
      } else if (tempF > 50) {
        wAdj = 0.05;
        wCondition = 'Cool (50F+)';
        wReasoning = `Temperature ${tempF.toFixed(0)}F. Applying +5% weather lift.`;
      } else if (tempF < 20) {
        wAdj = -0.10;
        wCondition = 'Extreme Cold (<20F)';
        wReasoning = `Temperature ${tempF.toFixed(0)}F. Applying -10% weather drag.`;
      } else if (tempF < 30) {
        wAdj = -0.05;
        wCondition = 'Very Cold (<30F)';
        wReasoning = `Temperature ${tempF.toFixed(0)}F. Applying -5% weather drag.`;
      } else if (tempF < 40) {
        wAdj = -0.02;
        wCondition = 'Cold (<40F)';
        wReasoning = `Temperature ${tempF.toFixed(0)}F. Applying -2% weather drag.`;
      } else {
        wAdj = 0;
        wCondition = 'Neutral Temperature';
        wReasoning = `Temperature ${tempF.toFixed(0)}F. No direct temperature boost or penalty.`;
      }
    }
    totalImpact += wAdj;

    // S: school dependency from onboarding source field
    const schoolDependent = (customerSource || '').toLowerCase().includes('school');
    let schoolAdj = 0;
    let schoolReason = '';
    if (schoolDependent) {
      const isWeekend = dow === 0 || dow === 6;
      const isSummerBreak = month >= 5 && month <= 7;
      const isBreak = ((month === 11 && monthDay >= 20) || (month === 0 && monthDay <= 5));
      if (isSummerBreak) {
        schoolAdj = -0.35;
        schoolReason = 'Summer break lowers student traffic.';
      } else if (isBreak) {
        schoolAdj = -0.25;
        schoolReason = 'School break lowers student traffic.';
      } else if (isWeekend) {
        schoolAdj = -0.15;
        schoolReason = 'Weekend reduces school-dependent demand.';
      }
    }
    totalImpact += schoolAdj;

    // C: checklist assignment gains (stored as 5..10 percents)
    const checklistAdj = getChecklistGainForDate(day.date) / 100;
    totalImpact += checklistAdj;

    // T: manual trending boost
    const trendAdj = trendingDates[day.date] ? 0.10 : 0;
    totalImpact += trendAdj;

    // 4. EVENT CAPITALIZATION
    const eventData = getDayEventImpact(day.date);
    let eventRes = null;
    let tmScore = 0;
    let eventAdj = 0;
    
    if (eventData.score > 0 && eventData.event) {
      tmScore = estimateEventSize(eventData.event);
      const cap = eventData.event._embedded?.venues?.[0]?.capacity || 'Large';
      eventAdj = eventData.score;
      totalImpact += eventAdj;
      
      const promo = bType.toLowerCase().includes('food') || bType.toLowerCase().includes('restaurant') || bType.toLowerCase().includes('cafe') 
        ? 'Quick-grab pre-event specials' 
        : bType.toLowerCase().includes('retail') || bType.toLowerCase().includes('clothing')
        ? 'Show-your-ticket 10% discount'
        : 'post-event extended hours';

      eventRes = {
        adjustmentPct: Math.round(eventAdj * 100),
        eventName: eventData.event.name,
        peakWindow: eventData.event.dates?.start?.localTime ? `2 hours before ${eventData.event.dates.start.localTime}` : 'Late afternoon / evening',
        recommendedPromotion: promo,
        reasoning: `A ~${cap} person event is happening nearby. Pre-show window could add +${Math.round(eventAdj * 100)}% to revenue. Recommend running a ${promo} to capture this spillover crowd.`,
        bigEvent: eventData.event
      };
    }

    // H: holiday impact
    let holidayAdj = 0;
    const holidayToday = calendarEvents.find((e: any) => e.date.iso === day.date);
    if (holidayToday?.name) {
      const n = (holidayToday.name as string).toLowerCase();
      if (n.includes('christmas') || n.includes('thanksgiving')) holidayAdj = 0.45;
      else if (n.includes('independence day') || n.includes('labor day') || n.includes('july 4')) holidayAdj = 0.20;
    }
    totalImpact += holidayAdj;

    const forecasted = Math.round(baseRev * (1 + totalImpact));
    const revenueDifference = forecasted - baseRev;
    const revenueDifferencePercent = totalImpact * 100;
    const isRedDay = forecasted < baseRev;
    const totalVsBaseline = Math.round(totalImpact * 100);

    // Formulate Top Insight
    let topInsight = 'Standard day. Focus on baseline operations.';
    let actionItem = 'Stick to standard procedures.';
    
    if (eventRes) {
      topInsight = `Massive ${eventRes.eventName} crowd will distort normal evening traffic patterns.`;
      actionItem = `Activate ${eventRes.recommendedPromotion} during the ${eventRes.peakWindow} window.`;
    } else if (checklistAdj > 0) {
      topInsight = `${getChecklistItemsForDate(day.date).length} planned checklist action(s) could lift performance.`;
      actionItem = `Execute assigned actions on schedule. Projected manual uplift: +${Math.round(checklistAdj * 100)}%.`;
    } else if (wAdj <= -0.15) {
      topInsight = `Severe weather will bottleneck walk-in volume.`;
      actionItem = `Conserve margin today: cut perishable prep and consider closing 1 hr early if dead.`;
    } else if (schoolAdj < 0) {
      topInsight = schoolReason;
      actionItem = 'Pivot messaging away from school traffic for this day and target families/local residents.';
    } else if (holidayToday) {
      topInsight = `Holiday (${holidayToday.name}) creates atypical traffic streams.`;
      actionItem = `Deploy holiday-themed messaging across social channels immediately.`;
    } else if (dowAdj > 0) {
      topInsight = `Natural weekend volume surge expected.`;
      actionItem = `Ensure full staff coverage during peak hours.`;
    }
    
    return {
      baselineRevenue: baseRev,
      forecastedRevenue: forecasted,
      confidenceLow: Math.round(forecasted * 0.92),
      confidenceHigh: Math.round(forecasted * 1.08),
      totalImpact,
      vsBaseline: totalVsBaseline,
      revenueDifference,
      revenueDifferencePercent,
      isRedDay,
      weatherImpact: {
        adjustmentPct: Math.round(wAdj * 100),
        condition: wCondition,
        reasoning: wReasoning,
        rawPrecip: precipMm,
        rawSnowInches: Number(snowfallInches.toFixed(2)),
        rawWindKmh: Number(windKmh.toFixed(1)),
        rawTempF: Number(tempF.toFixed(0)),
      },
      dowImpactPct: Math.round(dowAdj * 100),
      schoolImpactPct: Math.round(schoolAdj * 100),
      trendImpactPct: Math.round(trendAdj * 100),
      holidayImpactPct: Math.round(holidayAdj * 100),
      eventImpact: eventRes,
      topInsight,
      actionItem,
      checklistImpactPct: Math.round(checklistAdj * 100),
      
      // UI Compat
      pct: `${totalVsBaseline > 0 ? '+' : ''}${totalVsBaseline}%`,
      positive: isRedDay ? false : totalVsBaseline > 0 ? true : null,
      rawTotal: totalVsBaseline,
      tmTrafficScore: tmScore
    };
  };

  // Average week outlook
  const weekAvg = weatherData.length > 0
    ? Math.round(weatherData.reduce((sum, d) => sum + parseInt(generateAIForecast(d).pct), 0) / weatherData.length)
    : 0;

  // Today's data
  const todayWeather = weatherData[0];
  const todayImpact = todayWeather ? generateAIForecast(todayWeather) : null;

  // Short location name
  const shortLocation = address.split(',')[0] || address;

  const { marketTrends } = getTrendsForBusiness(businessType || '');

  // Live API events
  const [apiEvents, setApiEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
          const today = new Date();
          const currentYear = today.getFullYear();
          const res = await fetch(`https://calendarific.com/api/v2/holidays?api_key=VJQiIwJAOmpUpLFcHpIrlSq8njnD3rwO&country=US&year=${currentYear}`);
          const data = await res.json();
          
          if (data?.response?.holidays) {
            const allHolidays = data.response.holidays;
          
          // Filter out past events and select ones that are likely important
          const upcoming = allHolidays.filter((h: any) => {
            const hDate = new Date(h.date.iso);
            return hDate >= today && (h.type.includes('National holiday') || h.type.includes('Observance'));
          });
          
          // Deduplicate by name just in case multiple regions have the same holiday
          const uniqueUpcoming = Array.from(new Map(upcoming.map((h: any) => [h.name, h])).values());
          uniqueUpcoming.sort((a: any, b: any) => new Date(a.date.iso).getTime() - new Date(b.date.iso).getTime());
          
          // We only want the next 4 events
          const nextFour = uniqueUpcoming.slice(0, 4);
          
          const isFood = businessType?.toLowerCase().includes('food') || businessType?.toLowerCase().includes('restaurant');
          const isRetail = businessType?.toLowerCase().includes('retail') || businessType?.toLowerCase().includes('clothing');
          const isBeauty = businessType?.toLowerCase().includes('beauty') || businessType?.toLowerCase().includes('salon');

          const formattedEvents = nextFour.map((h: any, i) => {
            const dateObj = new Date(h.date.iso);
            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
            
            let insight = h.description || `${h.name} is coming up soon in the United States.`;
            // truncate description if it's super long
            if (insight.length > 120) insight = insight.substring(0, 117) + '...';
            
            let action = `Run a special ${h.name} promotion to capture holiday traffic.`;
            if (isFood) action = `Offer a special themed menu item or a 15% discount bundle in celebration of ${h.name}.`;
            if (isRetail) action = `Run a ${h.name} flash sale targeting customers who have the day off.`;
            
            return {
              id: `api_ev_${i}`,
              title: h.name,
              date: dateStr,
              insight,
              action,
              metric: 'Upcoming Holiday'
            };
          });

          const hardcodedEvents = [
            {
              id: 'hc_1',
              title: '🏀 March Madness',
              date: 'Late March - April',
              insight: 'College basketball tournament generates massive excitement and group viewings.',
              action: isFood 
                ? 'Host a bracket challenge and offer 15% off wings or pizza combos on game days.' 
                : 'Run a "Madness Sale" offering a tiered discount based on tournament rounds.',
              metric: 'High Engagement'
            },
            {
              id: 'hc_2',
              title: '💐 Mother\'s Day Weekend',
              date: 'Second Sunday in May',
              insight: 'One of the highest grossing local spending weekends of the entire year.',
              action: isBeauty 
                ? 'Pre-sell "Mom & Me" spa day gift cards starting in mid-April.' 
                : 'Bundle top-selling items into ready-to-go gift baskets right at the register.',
              metric: 'Huge Gifting Spike'
            }
          ];
          
          setApiEvents([...hardcodedEvents, ...formattedEvents]);
        }
      } catch (err) {
        console.error('Failed to fetch events from Calendarific', err);
      }
    };
    
    fetchEvents();
  }, [businessType]);

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{
        backgroundImage: 'url(/onboarding2.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#050505',
      }}
    >
      {/* ===== LEFT SIDEBAR ===== */}
      <aside
        className="w-[240px] min-h-screen flex flex-col py-6 px-4 shrink-0 overflow-y-auto"
        style={{
          background: 'rgba(8, 8, 8, 0.85)',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 mb-6 pt-2">
          <img src="/logo.png" alt="CashCast" className="h-8 w-auto object-contain mix-blend-screen opacity-90" />
          <div>
            <p className="text-white text-sm font-bold font-geist tracking-tight">CashCast</p>
            <p className="text-white/30 text-[10px] font-geist">Business Intel</p>
          </div>
        </div>

        {/* Business info */}
        <div className="rounded-xl px-3 py-2.5 mb-5" style={glassCard}>
          <p className="text-white text-xs font-semibold font-geist truncate">{businessType || 'Your Business'}</p>
          <p className="text-white/30 text-[10px] font-geist truncate">{shortLocation}</p>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 mb-5 flex-1">
          {navItemsDef.map((item) => {
            const hasSub = !!item.subItems;
            const isSuggestions = item.label === 'Suggestions';
            const isActiveParent = hasSub && item.subItems?.map(s => s.label).includes(activeTab);
            const isDirectlyActive = activeTab === item.label;

            return (
              <div key={item.label} className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    if (hasSub) setSuggestionsExpanded(!suggestionsExpanded);
                    else setActiveTab(item.label);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium font-geist transition-all duration-200 cursor-pointer ${
                    (isDirectlyActive || isActiveParent)
                      ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                      : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded-full font-geist ml-auto">{item.badge}</span>
                  )}
                  {hasSub && (
                    <div className="ml-auto flex items-center justify-center w-5 h-5 rounded hover:bg-white/10 transition-colors">
                      {suggestionsExpanded ? <ChevronDown className="w-3.5 h-3.5 text-white/40" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40" />}
                    </div>
                  )}
                </button>

                {/* Sub-items dropdown */}
                {hasSub && suggestionsExpanded && (
                  <div className="flex flex-col gap-1 pl-9 mt-1 mb-2">
                    {item.subItems?.map((sub) => (
                      <button
                        key={sub.label}
                        onClick={() => setActiveTab(sub.label)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium font-geist transition-all duration-200 cursor-pointer ${
                          activeTab === sub.label
                            ? 'text-emerald-400 bg-emerald-400/5'
                            : 'text-white/30 hover:text-white/60 hover:bg-white/[0.02]'
                        }`}
                      >
                        <sub.icon className="w-3.5 h-3.5" />
                        <span>{sub.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Settings at bottom */}
        <button className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium font-geist text-white/30 hover:bg-white/[0.04] hover:text-white/50 transition-all duration-200 cursor-pointer mt-auto">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* ===== TAB CONTENT ===== */}
        {activeTab === 'Dashboard' ? (
          <>
            {/* Top bar */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white font-geist tracking-tight">
                  {businessName ? `Welcome, ${businessName}!` : 'Dashboard'}
                </h1>
                <p className="text-white/30 text-sm font-geist mt-0.5">{dateStr}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white/40 text-sm font-geist">Live</span>
              </div>
            </div>

            {/* Top 3 metric cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* Week Outlook */}
              <div className="rounded-2xl px-6 py-5" style={glassCard}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white/40 text-xs font-geist uppercase tracking-wider">Week Outlook</p>
                  {weekAvg >= 0
                    ? <TrendingUp className="w-4 h-4 text-emerald-400/60" />
                    : <TrendingDown className="w-4 h-4 text-red-400/60" />
                  }
                </div>
                <p className={`text-4xl font-bold font-geist ${weekAvg >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {weekAvg >= 0 ? '+' : ''}{weekAvg}%
                </p>
                <p className="text-white/25 text-xs font-geist mt-1">vs. your baseline</p>
              </div>

              {/* Today */}
              <div className="rounded-2xl px-6 py-5" style={glassCard}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white/40 text-xs font-geist uppercase tracking-wider">Today</p>
                  {todayImpact?.positive === true
                    ? <TrendingUp className="w-4 h-4 text-emerald-400/60" />
                    : todayImpact?.positive === false
                      ? <TrendingDown className="w-4 h-4 text-red-400/60" />
                      : <Minus className="w-4 h-4 text-white/20" />
                  }
                </div>
                <p className={`text-4xl font-bold font-geist ${
                  todayImpact?.positive === true ? 'text-emerald-400' : todayImpact?.positive === false ? 'text-red-400' : 'text-white/60'
                }`}>
                  {todayImpact?.pct || '—'}
                </p>
                <p className="text-white/25 text-xs font-geist mt-1">
                  {todayImpact?.isRedDay ? 'Red Day (below baseline)' : 'Green/Neutral Day'}
                </p>
              </div>

              {/* Location */}
              <div className="rounded-2xl px-6 py-5" style={glassCard}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white/40 text-xs font-geist uppercase tracking-wider">Location</p>
                  <MapPin className="w-4 h-4 text-white/20" />
                </div>
                <p className="text-2xl font-bold text-white font-geist truncate">{shortLocation}</p>
                <p className="text-white/25 text-xs font-geist mt-1">
                  {businessType?.toLowerCase()} · ${dailyRev.toLocaleString()}/day
                </p>
              </div>
            </div>

            {/* Weekly Business Forecast chart area */}
            <div className="rounded-2xl px-8 py-6 mb-6" style={glassCard}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white font-geist">Weekly Business Forecast</h3>
                  <p className="text-white/30 text-xs font-geist mt-0.5">Total day impact vs baseline revenue from all signals combined</p>
                </div>
                <div className="flex items-center gap-2 text-white/25 text-xs font-geist">
                  <span>Updated {today.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                  <RefreshCw className="w-3.5 h-3.5 cursor-pointer hover:text-white/50 transition-colors" />
                </div>
              </div>

              {/* Chart placeholder with baseline */}
              <div className="relative h-48 mb-4">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-white/20 font-geist">
                  <span>+30%</span><span>+15%</span><span className="text-white/30">0%</span><span>-15%</span><span>-30%</span>
                </div>
                {/* Chart area */}
                <div className="ml-10 h-full relative">
                  {/* Baseline dashed line */}
                  <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-white/10" />
                  <p className="absolute top-1/2 right-0 -translate-y-full text-[10px] text-white/20 font-geist">Baseline</p>

                  {/* SVG line chart */}
                  {weatherData.length > 0 && (
                    <svg viewBox="0 0 600 200" className="w-full h-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const points = weatherData.map((d, i) => {
                          const impact = parseInt(generateAIForecast(d).pct);
                          const x = (i / 6) * 580 + 10;
                          const y = 100 - (impact / 30) * 80;
                          return `${x},${y}`;
                        });
                        const polyline = points.join(' ');
                        const areaPoints = `10,100 ${polyline} ${580 + 10},100`;
                        return (
                          <>
                            <polygon points={areaPoints} fill="url(#lineGrad)" />
                            <polyline points={polyline} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinejoin="round" />
                            {weatherData.map((d, i) => {
                              const impact = parseInt(generateAIForecast(d).pct);
                              const x = (i / 6) * 580 + 10;
                              const y = 100 - (impact / 30) * 80;
                              return <circle key={i} cx={x} cy={y} r="3" fill="white" opacity="0.6" />;
                            })}
                          </>
                        );
                      })()}
                    </svg>
                  )}

                  {/* X-axis day labels */}
                  <div className="absolute bottom-[-20px] left-0 right-0 flex justify-between text-[10px] text-white/20 font-geist">
                    {weatherData.map((d, i) => (
                      <span key={i}>{i === 0 ? 'Today' : d.dayName}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Day Selector Row */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-white/50 font-geist uppercase tracking-widest mb-3">7-Day Forecast & Drivers</h3>
              <div className="grid grid-cols-7 gap-3">
                {weatherData.length > 0 ? weatherData.map((day, i) => {
                  const weather = getWeatherInfo(day.weatherCode);
                  const WeatherIcon = weather.icon;
                  const forecast = generateAIForecast(day);
                  const assignedCount = getChecklistItemsForDate(day.date).length;
                  const directEventCount = getDashboardEventsForDate(day.date).length;
                  const isSelected = i === selectedDayIndex;
                  return (
                    <button 
                      key={day.date} 
                      onClick={() => setSelectedDayIndex(i)}
                      className="rounded-2xl py-4 px-2 flex flex-col items-center gap-2 transition-all duration-300 cursor-pointer border border-transparent"
                      style={{
                        ...glassCard,
                        ...(isSelected 
                          ? { background: 'rgba(52, 211, 153, 0.1)', borderColor: 'rgba(52, 211, 153, 0.4)' } 
                          : { borderColor: 'rgba(255, 255, 255, 0.08)' }
                        ),
                      }}
                    >
                      <span className={`text-xs font-semibold font-geist uppercase tracking-wider ${isSelected ? 'text-emerald-400' : 'text-white/35'}`}>
                        {i === 0 ? 'Today' : day.dayName}
                      </span>
                      <WeatherIcon className={`w-5 h-5 ${weather.color}`} />
                      <span className={`text-sm font-bold font-geist ${
                        forecast.positive === true ? 'text-emerald-400' : forecast.positive === false ? 'text-red-400' : 'text-white/40'
                      }`}>{forecast.pct}</span>
                      {(assignedCount > 0 || directEventCount > 0) && (
                        <div className="flex items-center gap-1 mt-1">
                          {assignedCount > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 font-geist">
                              {assignedCount} action{assignedCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {directEventCount > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-400/20 text-purple-300 font-geist">
                              {directEventCount} event{directEventCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                }) : Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="rounded-2xl py-4 px-3 flex flex-col items-center gap-2 animate-pulse" style={glassCard}>
                    <span className="w-6 h-2 bg-white/10 rounded" />
                    <span className="w-5 h-5 bg-white/5 rounded-full" />
                    <span className="w-8 h-3 bg-white/10 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Day Analysis */}
            {weatherData.length > 0 && (
              <div className="mb-6 rounded-3xl p-8 relative overflow-hidden group" style={{ ...glassCard, background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.4) 0%, rgba(20, 20, 20, 0.2) 100%)' }}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-400/10 transition-colors duration-700 pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                  {/* Left: Score Box */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 border border-white/10 w-full md:w-56 shadow-inner shadow-white/5">
                    <p className="text-white/50 text-xs font-geist uppercase tracking-widest mb-2 text-center">
                        {selectedDayIndex === 0 ? 'Today\'s Total Forecast' : `${weatherData[selectedDayIndex]?.dayName} Total Forecast`}
                    </p>
                    <p className={`text-5xl font-bold font-geist mb-2 ${generateAIForecast(weatherData[selectedDayIndex])?.positive === true ? 'text-emerald-400' : generateAIForecast(weatherData[selectedDayIndex])?.positive === false ? 'text-red-400' : 'text-white/70'}`}>
                      {generateAIForecast(weatherData[selectedDayIndex])?.pct}
                    </p>
                    
                    <div className="mt-4 pt-4 border-t border-white/10 w-full text-center">
                      <p className="text-white/30 text-[10px] font-geist uppercase tracking-widest mb-1">All Signals Combined</p>
                      <p className="text-white/50 text-[10px] font-geist mb-3">Weather + day pattern + school + events + trend + checklist</p>
                      <p className="text-white/30 text-[10px] font-geist uppercase tracking-widest mb-1">Projected Revenue</p>
                      <p className="text-white font-bold font-geist text-xl">${generateAIForecast(weatherData[selectedDayIndex]).forecastedRevenue.toLocaleString()}</p>
                      <p className="text-white/30 text-[10px] font-geist mt-1">${generateAIForecast(weatherData[selectedDayIndex]).confidenceLow.toLocaleString()} - ${generateAIForecast(weatherData[selectedDayIndex]).confidenceHigh.toLocaleString()} range</p>
                    </div>
                  </div>

                  {/* Right: AI Breakdown */}
                  <div className="flex-1 w-full flex flex-col gap-4">

                    {/* Manual trend boost toggle (+10%) */}
                    {weatherData[selectedDayIndex] && (
                      <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-white/80 text-xs font-geist font-semibold">Mark Day As Trending</p>
                          <p className="text-white/40 text-[11px] font-geist">Adds +10% trend boost to this day forecast.</p>
                        </div>
                        <button
                          onClick={() => {
                            const dayKey = weatherData[selectedDayIndex].date;
                            setTrendingDates(prev => ({ ...prev, [dayKey]: !prev[dayKey] }));
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            trendingDates[weatherData[selectedDayIndex].date]
                              ? 'bg-indigo-400/20 text-indigo-200 border-indigo-300/40'
                              : 'bg-white/5 text-white/60 border-white/15 hover:bg-white/10'
                          }`}
                        >
                          {trendingDates[weatherData[selectedDayIndex].date] ? 'Trending On (+10%)' : 'Enable Trend +10%'}
                        </button>
                      </div>
                    )}
                    
                    {/* Top Insight & Action Item from AI */}
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 mb-2">
                       <h3 className="text-white font-bold font-geist flex items-center gap-2 mb-3">
                         <Sparkles className="w-4 h-4 text-purple-400" /> CashCast AI Intelligence
                       </h3>
                       <div className="flex flex-col gap-3">
                         <div className="flex items-start gap-3">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                           <div>
                             <p className="text-white/50 text-[10px] font-geist uppercase tracking-widest mb-0.5">Top Insight</p>
                             <p className="text-white/80 text-sm font-geist leading-relaxed">{generateAIForecast(weatherData[selectedDayIndex]).topInsight}</p>
                           </div>
                         </div>
                         <div className="flex items-start gap-3">
                           <div className="w-1.5 h-1.5 rounded-full bg-pink-400 mt-1.5 shrink-0" />
                           <div>
                             <p className="text-white/50 text-[10px] font-geist uppercase tracking-widest mb-0.5">Action Item</p>
                             <p className="text-white/80 text-sm font-geist leading-relaxed">{generateAIForecast(weatherData[selectedDayIndex]).actionItem}</p>
                           </div>
                         </div>
                       </div>
                    </div>

                    {/* Dynamic Event Driver (Ticketmaster) */}
                    {(() => {
                      const forecast = generateAIForecast(weatherData[selectedDayIndex]);
                      if (!forecast?.eventImpact || forecast.tmTrafficScore! < 5) return null;
                      const eventImpact = forecast.eventImpact;
                      const event = eventImpact.bigEvent;
                      return (
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.15)] transition-colors">
                          <div className="w-10 h-10 rounded-full bg-pink-400/20 border border-pink-400/30 flex items-center justify-center shrink-0">
                            <Sparkles className="w-5 h-5 text-pink-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="text-sm font-bold text-white font-geist line-clamp-1">{eventImpact.eventName}</h4>
                              <span className="text-pink-400 text-sm font-bold font-geist">+{eventImpact.adjustmentPct}%</span>
                            </div>
                            <p className="text-white/70 text-xs font-geist leading-relaxed">
                              {eventImpact.reasoning}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Weather Reasoning */}
                    {(() => {
                      const forecast = generateAIForecast(weatherData[selectedDayIndex]);
                      const wImpact = forecast.weatherImpact.adjustmentPct;
                      const wReasoning = forecast.weatherImpact.reasoning;
                      const ColorIcon = wImpact > 0 ? Sun : wImpact < -15 ? CloudLightning : CloudRain;
                      const colorClass = wImpact > 0 ? 'emerald' : wImpact < -15 ? 'red' : 'blue';
                      
                      return (
                         <div className={`flex items-start gap-4 p-4 rounded-xl bg-${colorClass}-500/10 border border-${colorClass}-500/20 transition-colors`}>
                          <div className={`w-10 h-10 rounded-full bg-${colorClass}-400/20 border border-${colorClass}-400/30 flex items-center justify-center shrink-0`}>
                            <ColorIcon className={`w-5 h-5 text-${colorClass}-400`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="text-sm font-bold text-white font-geist">Weather Only Impact</h4>
                              <span className={`text-${colorClass}-400 text-sm font-bold font-geist`}>{wImpact > 0 ? '+' : ''}{wImpact}%</span>
                            </div>
                            <p className="text-white/70 text-xs font-geist leading-relaxed">
                              {wReasoning}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Signal breakdown so total day impact is not confused with weather-only impact */}
                    {(() => {
                      const forecast = generateAIForecast(weatherData[selectedDayIndex]);
                      const items = [
                        { label: 'Weather', value: forecast.weatherImpact.adjustmentPct },
                        { label: 'Day Pattern', value: forecast.dowImpactPct },
                        { label: 'School Traffic', value: forecast.schoolImpactPct },
                        { label: 'Checklist', value: forecast.checklistImpactPct },
                        { label: 'Trend', value: forecast.trendImpactPct },
                        { label: 'Holiday', value: forecast.holidayImpactPct },
                        { label: 'Event', value: forecast.eventImpact?.adjustmentPct || 0 },
                      ].filter(item => item.value !== 0);

                      return (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-white font-geist">Total Impact Breakdown</h4>
                            <span className={`text-sm font-bold font-geist ${forecast.isRedDay ? 'text-red-300' : 'text-emerald-300'}`}>
                              {forecast.revenueDifferencePercent > 0 ? '+' : ''}{Math.round(forecast.revenueDifferencePercent)}% total
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {items.length > 0 ? items.map(item => (
                              <div key={item.label} className="rounded-lg px-3 py-2 bg-black/20 border border-white/5 flex items-center justify-between">
                                <span className="text-white/60 text-xs font-geist">{item.label}</span>
                                <span className={`text-xs font-bold font-geist ${item.value > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                                  {item.value > 0 ? '+' : ''}{item.value}%
                                </span>
                              </div>
                            )) : (
                              <div className="col-span-2 rounded-lg px-3 py-2 bg-black/20 border border-white/5 text-white/50 text-xs font-geist">
                                No active adjustments. Total day impact is neutral.
                              </div>
                            )}
                          </div>
                          <p className="text-white/35 text-[11px] font-geist mt-3">
                            This breakdown explains why weather impact can be negative while the total day forecast is flat or positive.
                          </p>
                        </div>
                      );
                    })()}

                    {/* Weather Report (explicit condition + exact business effect) */}
                    {(() => {
                      const selected = weatherData[selectedDayIndex];
                      const forecast = generateAIForecast(selected);
                      const wx = forecast.weatherImpact;
                      const effectText = wx.adjustmentPct < 0
                        ? `Negative demand effect: ${wx.adjustmentPct}% vs baseline due to weather.`
                        : wx.adjustmentPct > 0
                        ? `Positive demand effect: +${wx.adjustmentPct}% vs baseline from weather conditions.`
                        : 'Neutral weather effect on baseline demand.';

                      return (
                        <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-400/20">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-white font-geist">Weather Report</h4>
                            <span className="text-sky-300 text-[11px] font-bold font-geist uppercase tracking-wider">Live Forecast</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-3 text-[11px] font-geist">
                            <div className="rounded-lg px-2.5 py-2 bg-black/20 border border-white/10 text-white/75">Condition: <span className="text-white">{wx.condition}</span></div>
                            <div className="rounded-lg px-2.5 py-2 bg-black/20 border border-white/10 text-white/75">Impact: <span className={`${wx.adjustmentPct < 0 ? 'text-red-300' : 'text-emerald-300'}`}>{wx.adjustmentPct > 0 ? '+' : ''}{wx.adjustmentPct}%</span></div>
                            <div className="rounded-lg px-2.5 py-2 bg-black/20 border border-white/10 text-white/75">Snow: <span className="text-white">{(wx.rawSnowInches ?? 0).toFixed(2)} in</span></div>
                            <div className="rounded-lg px-2.5 py-2 bg-black/20 border border-white/10 text-white/75">Rain: <span className="text-white">{(wx.rawPrecip ?? 0).toFixed(1)} mm</span></div>
                            <div className="rounded-lg px-2.5 py-2 bg-black/20 border border-white/10 text-white/75">Wind: <span className="text-white">{(wx.rawWindKmh ?? 0).toFixed(1)} km/h</span></div>
                            <div className="rounded-lg px-2.5 py-2 bg-black/20 border border-white/10 text-white/75">Temp High: <span className="text-white">{selected.tempHigh}F</span></div>
                          </div>
                          <p className="text-white/70 text-xs font-geist leading-relaxed">{effectText}</p>
                          <p className="text-white/50 text-xs font-geist leading-relaxed mt-1">{wx.reasoning}</p>
                        </div>
                      );
                    })()}

                    {/* Dynamic Event Driver (Calendarific Holidays) */}
                    {(() => {
                      const selectedDate = weatherData[selectedDayIndex]?.date;
                      const eventsToday = calendarEvents
                        .filter(e => e.date.iso === selectedDate)
                        .filter(e => isBigEvent(e.name))
                        .sort((a, b) => (getEventMatch(b.name)?.importance || 0) - (getEventMatch(a.name)?.importance || 0));
                      
                      if (eventsToday.length === 0) return null;
                      const ev = eventsToday[0]; // Only the biggest
                      const suggestion = getEventSuggestion(ev.name, businessType || '');
                      
                      return (
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)] transition-colors">
                          <div className="w-10 h-10 rounded-full bg-purple-400/20 border border-purple-400/30 flex items-center justify-center shrink-0">
                            <Calendar className="w-5 h-5 text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="text-sm font-bold text-white font-geist">{ev.name}</h4>
                              <span className="text-purple-400 text-sm font-bold font-geist">Event Day</span>
                            </div>
                            <p className="text-white/70 text-xs font-geist leading-relaxed mb-2">
                              {suggestion}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Assigned Checklist Actions (manual flow) */}
                    {(() => {
                      const selectedDate = weatherData[selectedDayIndex]?.date;
                      const dayActions = selectedDate ? getChecklistItemsForDate(selectedDate) : [];
                      if (!dayActions.length) return null;

                      return (
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-400/20">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-white font-geist">Assigned Checklist Actions</h4>
                            <span className="text-emerald-400 text-sm font-bold font-geist">
                              +{dayActions.reduce((sum, item) => sum + (item.projectedGainPct || 0), 0)}%
                            </span>
                          </div>
                          <div className="flex flex-col gap-2">
                            {dayActions.map(action => (
                              <div key={action.id} className="rounded-lg px-3 py-2 bg-black/20 border border-white/5">
                                <p className="text-white/80 text-xs font-geist font-semibold">{action.title}</p>
                                <p className="text-white/45 text-[11px] font-geist mt-0.5">{action.desc}</p>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-[10px] uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 px-1.5 py-0.5 rounded">
                                    Checklist Action
                                  </span>
                                  <span className="text-[10px] uppercase tracking-wider text-white/60 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                                    +{action.projectedGainPct || 0}% projected
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Upcoming API Events (direct flow) */}
                    {(() => {
                      const selectedDate = weatherData[selectedDayIndex]?.date;
                      const dayApiEvents = selectedDate ? getDashboardEventsForDate(selectedDate) : [];
                      if (!dayApiEvents.length) return null;

                      return (
                        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-400/20">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-bold text-white font-geist">Upcoming US Events (API)</h4>
                            <span className="text-indigo-300 text-[11px] font-bold font-geist uppercase tracking-wider">Direct Import</span>
                          </div>
                          <div className="flex flex-col gap-2">
                            {dayApiEvents.map(ev => (
                              <div key={ev.id} className="rounded-lg px-3 py-2 bg-black/20 border border-white/5">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-white/85 text-xs font-geist font-semibold">{ev.title}</p>
                                  <span className="text-[10px] text-indigo-200 font-geist">{ev.dateLabel}</span>
                                </div>
                                <p className="text-white/45 text-[11px] font-geist mt-0.5">{ev.insight}</p>
                                <span className="inline-block mt-1 text-[10px] uppercase tracking-wider text-indigo-300 bg-indigo-500/10 border border-indigo-400/20 px-1.5 py-0.5 rounded">
                                  API Event
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}


                  </div>
                </div>
              </div>
            )}
          </>
        ) : activeTab === 'Checklist' ? (
          <div className="max-w-4xl mx-auto w-full pb-10">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-white font-geist tracking-tight">Business Setup Checklist</h1>
              <button 
                onClick={() => {
                  const newId = `n_${Date.now()}`;
                  setChecklist([{ id: newId, title: 'New Action Item', desc: '', status: 'Pending', category: 'other', source: 'manual', metadata: { createdAt: new Date().toISOString() } }, ...checklist]);
                  setEditingItemId(newId);
                  setEditForm({ title: 'New Action Item', desc: '' });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 rounded-lg text-sm font-bold hover:bg-emerald-400/20 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {checklist.map((item) => (
                <div key={item.id} className="rounded-3xl p-6 flex items-start gap-4 transition-all duration-300 hover:bg-white/[0.04]" style={glassCard}>
                  <div className="w-6 h-6 rounded border border-white/20 flex-shrink-0 mt-1 hover:border-emerald-400 transition-colors cursor-pointer" />
                  
                  {editingItemId === item.id ? (
                    <div className="w-full flex flex-col gap-3 relative z-10">
                      <input 
                        value={editForm.title}
                        onChange={e => setEditForm({...editForm, title: e.target.value})}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white font-bold font-geist focus:outline-none focus:border-emerald-400"
                        placeholder="Action Item Title"
                      />
                      <textarea 
                        value={editForm.desc}
                        onChange={e => setEditForm({...editForm, desc: e.target.value})}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-sm font-geist focus:outline-none focus:border-emerald-400 min-h-[80px]"
                        placeholder="Detailed description..."
                      />
                      <div className="flex justify-end gap-2 mt-1">
                        <button onClick={() => setEditingItemId(null)} className="px-4 py-1.5 rounded-lg text-xs font-bold text-white/50 hover:text-white transition-colors">Cancel</button>
                        <button onClick={() => {
                          setChecklist(checklist.map(c => c.id === item.id ? { ...c, title: editForm.title, desc: editForm.desc } : c));
                          setEditingItemId(null);
                        }} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-400/90 text-black hover:bg-emerald-400 transition-colors">Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full relative group">
                      <div className="flex justify-between items-start mb-1 pr-16">
                        <h3 className="text-lg font-bold text-white font-geist">{item.title}</h3>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shrink-0 ${
                          item.status === 'High Priority' ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20' : 'bg-white/5 text-white/40 border border-white/10'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-white/50 text-sm font-geist leading-relaxed pr-8">{item.desc}</p>

                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-white/10 text-white/40 bg-white/5">
                          Category: {item.category}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-white/10 text-white/40 bg-white/5">
                          Source: {item.source === 'idea-center' ? 'Idea Center' : 'Manual'}
                        </span>
                        {item.assignedDate && (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-emerald-400/20 text-emerald-300 bg-emerald-400/10">
                            Assigned: {new Date(item.assignedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })} (+{item.projectedGainPct || 0}%)
                          </span>
                        )}
                      </div>

                      {/* Assign to dashboard day */}
                      {weatherData.length > 0 && (
                        <div className="mt-3 p-3 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="text-[11px] uppercase tracking-wider text-white/40 font-geist shrink-0">Assign To Day</span>
                          <select
                            value={assignmentDrafts[item.id] ?? item.assignedDate ?? weatherData[0]?.date}
                            onChange={(e) => setAssignmentDrafts(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className="bg-black/20 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white/80 font-geist focus:outline-none"
                          >
                            {weatherData.map(day => (
                              <option key={day.date} value={day.date} className="bg-black text-white">
                                {day.dayName} • {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => assignChecklistItemToDate(item.id, assignmentDrafts[item.id] ?? item.assignedDate ?? weatherData[0].date)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/30 transition-colors"
                          >
                            Assign (+5% to +10%)
                          </button>
                        </div>
                      )}
                      
                      {/* Hover Actions */}
                      <div className="absolute top-0 right-0 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => {
                          setEditForm({ title: item.title, desc: item.desc });
                          setEditingItemId(item.id);
                        }} className="text-white/40 hover:text-white p-1.5 rounded hover:bg-white/5 transition-all">
                          <Edit2 className="w-4 h-4"/>
                        </button>
                        <button onClick={() => {
                          setChecklist(checklist.filter(c => c.id !== item.id));
                        }} className="text-white/40 hover:text-red-400 p-1.5 rounded hover:bg-white/5 transition-all">
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'Idea Center' ? (
          <div className="max-w-5xl mx-auto w-full pb-10">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-white font-geist tracking-tight">Viral Market Events & Trends</h1>
              <button 
                onClick={() => setShowApiInfo(true)}
                className="bg-white/5 border border-white/10 text-white/70 hover:text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 backdrop-blur-md flex items-center gap-2 shadow-[0_4px_15px_rgba(0,0,0,0.5)] hover:bg-white/10"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Click here to view API
              </button>
            </div>
            <div className="grid grid-cols-2 gap-8">
              {/* Viral Trends */}
              <div>
                <h2 className="text-lg font-bold text-white font-geist tracking-tight mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-white/40" /> Viral Market Trends
                </h2>
                <div className="flex flex-col gap-6">
                  {marketTrends.map(trend => (
                    <div key={trend.id} className="rounded-3xl overflow-hidden transition-all duration-300 hover:bg-white/[0.04] group relative" style={glassCard}>
                      <div className="h-40 w-full relative">
                        <img src={trend.image} alt={trend.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <div className="absolute bottom-4 left-6 right-6 flex justify-between items-end">
                          <h3 className="text-xl font-bold text-white font-geist pr-2 drop-shadow-md">{trend.title}</h3>
                          <div className="px-2 py-1 rounded-md bg-emerald-400 border border-emerald-400 text-black text-[10px] font-bold uppercase tracking-wider shadow-lg shrink-0">
                            {trend.metric}
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <p className="text-white/50 text-sm font-geist leading-relaxed mb-5">
                          {trend.insight}
                        </p>
                        <div className="rounded-2xl p-4 bg-emerald-400/5 border border-emerald-400/10 mb-4">
                          <p className="text-sm text-white/90 font-geist leading-relaxed">
                            <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs block mb-1">How to incorporate</span>
                            {trend.action}
                          </p>
                        </div>
                        
                        <button 
                          onClick={() => {
                            if (addedIdeaIds.has(trend.id)) return;
                            setChecklist([{
                              id: `t_${Date.now()}`,
                              title: `Implement: ${trend.title}`,
                              desc: trend.action,
                              status: 'High Priority',
                              category: 'trend',
                              source: 'idea-center',
                              metadata: {
                                metric: trend.metric,
                                insight: trend.insight,
                                type: 'market-trend',
                              }
                            }, ...checklist]);
                            setAddedIdeaIds(new Set(addedIdeaIds).add(trend.id));
                          }}
                          className={`w-full py-2.5 rounded-xl text-sm font-bold font-geist transition-all duration-300 flex items-center justify-center gap-2 ${
                            addedIdeaIds.has(trend.id) 
                              ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 cursor-default shadow-[0_0_15px_rgba(52,211,153,0.1)]'
                              : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10 cursor-pointer'
                          }`}
                        >
                          {addedIdeaIds.has(trend.id) ? (
                            <><CheckSquare className="w-4 h-4" /> Added to Checklist</>
                          ) : (
                            <><Plus className="w-4 h-4" /> Add to Checklist</>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming US Events */}
              <div>
                <h2 className="text-lg font-bold text-white font-geist tracking-tight mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-white/40" /> Upcoming US Events
                </h2>
                <div className="flex flex-col gap-4">
                  {apiEvents.length > 0 ? apiEvents.map(event => (
                    <div key={event.id} className="rounded-3xl p-6 transition-all duration-300 hover:bg-white/[0.04] group relative" style={glassCard}>
                      <div className="absolute top-6 right-6 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/50 text-[10px] font-bold uppercase tracking-wider">
                        {event.date}
                      </div>
                      <div className="flex flex-col mb-2 pr-24">
                        <span className="text-[10px] font-bold text-emerald-400 mb-1 tracking-widest uppercase">{event.metric}</span>
                        <h3 className="text-md font-bold text-white font-geist leading-tight">{event.title}</h3>
                      </div>
                      <p className="text-white/50 text-xs font-geist leading-relaxed mb-4">
                        {event.insight}
                      </p>
                      <div className="rounded-xl p-3 bg-white/[0.02] border border-emerald-500/10 mb-4">
                        <p className="text-xs text-white/80 font-geist leading-relaxed">
                          <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] mr-2">Promo</span>
                          {event.action}
                        </p>
                      </div>

                      <div className="w-full py-2 rounded-lg text-xs font-bold font-geist flex items-center justify-center gap-2 bg-indigo-500/10 text-indigo-300 border border-indigo-400/20">
                        <Calendar className="w-3.5 h-3.5" /> Added Directly To Dashboard Day
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-3xl p-6 text-center text-white/40 text-sm font-geist animate-pulse" style={glassCard}>
                      Fetching live events from Calendarific...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'For You' ? (
          <div className="h-full flex flex-col relative rounded-3xl overflow-hidden bg-black border border-white/10" style={{ boxShadow: 'inset 0 0 100px rgba(100, 50, 255, 0.1)' }}>
            {/* Space background elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40 mix-blend-screen" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(120, 80, 255, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(52, 211, 153, 0.15) 0%, transparent 40%)' }} />
            <div className="absolute inset-0 z-0 opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(1px 1px at 30px 40px, rgba(255,255,255,0.8), rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 100px 120px, rgba(255,255,255,0.6), rgba(0,0,0,0)), radial-gradient(1px 1px at 180px 20px, rgba(255,255,255,0.4), rgba(0,0,0,0))', backgroundSize: '200px 200px' }} />

            <div className="relative z-10 p-10 max-w-4xl mx-auto w-full pb-20 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

              {/* Ticketmaster Local Events */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-geist tracking-tight">Live Events Near You</h3>
                    <p className="text-white/40 text-xs font-geist">Concerts, sports & shows within 25 miles this week · Powered by Ticketmaster</p>
                  </div>
                </div>
                
                {(() => {
                  const filteredEvents = ticketmasterEvents.filter(e => {
                    const cap = e?._embedded?.venues?.[0]?.capacity ?? 0;
                    return cap >= 1000 || estimateEventSize(e) >= 5;
                  });
                  const eventsToDisplay = filteredEvents.length > 0 ? filteredEvents : ticketmasterEvents;

                  if (ticketmasterLoading) {
                    return (
                      <div className="rounded-3xl p-8 text-center bg-white/[0.02] border border-white/5 backdrop-blur-md animate-pulse">
                        <p className="text-white/40 font-geist text-sm uppercase tracking-widest font-bold">Loading local events...</p>
                      </div>
                    );
                  }

                  if (ticketmasterError) {
                    return (
                      <div className="rounded-3xl p-8 text-center bg-red-500/[0.06] border border-red-400/20 backdrop-blur-md">
                        <p className="text-red-300/90 font-geist text-sm font-bold">Ticketmaster connection failed</p>
                        <p className="text-white/50 font-geist text-xs mt-2">{ticketmasterError}</p>
                      </div>
                    );
                  }

                  if (eventsToDisplay.length === 0) {
                    return (
                      <div className="rounded-3xl p-8 text-center bg-white/[0.02] border border-white/5 backdrop-blur-md">
                        <p className="text-white/40 font-geist text-sm uppercase tracking-widest font-bold">No upcoming events, check back soon!</p>
                      </div>
                    );
                  }

                  return (
                    <div className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {eventsToDisplay.map((event, i) => {
                        const venue = event._embedded?.venues?.[0];
                      const capacity = venue?.capacity;
                      const img = event.images?.find((img: any) => img.ratio === '16_9' && img.width > 500)?.url 
                        || event.images?.[0]?.url;
                      const eventDate = event.dates?.start?.localDate 
                        ? new Date(event.dates.start.localDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })
                        : '';
                      const eventTime = event.dates?.start?.localTime 
                        ? new Date('2000-01-01T' + event.dates.start.localTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                        : '';
                      
                      return (
                        <a 
                          key={event.id || i} 
                          href={event.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex-shrink-0 w-64 rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06] hover:border-pink-400/30 hover:bg-white/[0.05] transition-all duration-500 group cursor-pointer"
                        >
                          <div className="relative h-36 overflow-hidden">
                            {img ? (
                              <img src={img} alt={event.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
                                <Sparkles className="w-10 h-10 text-pink-400/40" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <div className="absolute bottom-2 left-3 right-3">
                              <p className="text-white text-sm font-bold font-geist leading-tight line-clamp-2 drop-shadow-md">{event.name}</p>
                            </div>
                            {event.classifications?.[0]?.segment?.name && (
                              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-pink-500/80 text-white text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm">
                                {event.classifications[0].segment.name}
                              </div>
                            )}
                            {capacity && (
                              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 border border-white/20 text-white text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm">
                                {Number(capacity).toLocaleString()} seats
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <p className="text-white/60 text-xs font-geist mb-1">
                              {eventDate}{eventTime ? ` · ${eventTime}` : ''}
                            </p>
                            {venue && (
                              <p className="text-white/30 text-[10px] font-geist flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 shrink-0" /> {venue.name}{venue.city?.name ? `, ${venue.city.name}` : ''}
                              </p>
                            )}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                );
              })()}
              </div>

              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 mb-6 backdrop-blur-xl shadow-[0_0_30px_rgba(120,80,255,0.3)]">
                  <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
                </div>
                <h2 className="text-4xl font-bold font-geist text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400 tracking-tight mb-4">
                  AI Traffic Intelligence
                </h2>
                <p className="text-white/60 text-lg font-geist max-w-2xl mx-auto leading-relaxed">
                  We've scanned <span className="text-white font-bold">{address?.split(',')[0] || 'your area'}</span> and detected what drives exact traffic <span className="text-emerald-400 border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 rounded-md font-bold text-xs uppercase ml-1">{selectedDayIndex === 0 ? 'Today' : weatherData[selectedDayIndex]?.dayName}</span>
                </p>
              </div>

              {/* Anchors List */}
              <div className="flex flex-col gap-6">
                {anchors?.map((anchor, i) => {
                  const dayNum = weatherData[selectedDayIndex]?.date 
                    ? new Date(weatherData[selectedDayIndex].date + 'T00:00:00').getDay() 
                    : today.getDay();
                  const dailyScore = getSingleAnchorScore(anchor, dayNum);
                  
                  return (
                  <div key={i} className={`flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 p-6 rounded-3xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] hover:border-emerald-400/20 transition-all duration-500 group relative overflow-hidden backdrop-blur-md ${dailyScore === 0 ? 'opacity-40 grayscale' : ''}`}>
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                      <MapPin className="w-6 h-6 text-emerald-300" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="text-xl font-bold text-white font-geist drop-shadow-md">{anchor.name}</h3>
                        <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] uppercase font-bold tracking-widest shrink-0">
                          {anchor.type}
                        </span>
                      </div>
                      <p className="text-white/40 text-sm font-geist mb-2">
                        <strong className="text-white/60">{anchor.distance <= 0.4 ? 'Extremely walkable' : anchor.distance <= 0.8 ? 'Highly walkable' : anchor.distance <= 1.2 ? 'Moderate walk/drive' : 'Short drive'}</strong> — {anchor.distance} miles away
                      </p>
                      
                      <div className={`px-2 py-0.5 rounded-md inline-flex items-center text-[10px] font-bold uppercase tracking-wider mb-3 ${dailyScore === 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                        {getAnchorActiveStatus(anchor, dayNum)}
                      </div>
                      
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-purple-500 rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${Math.min((dailyScore / 45) * 100, 100)}%` }} 
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:items-end justify-center sm:ml-4 shrink-0 mt-2 sm:mt-0">
                      <div className="text-3xl font-bold text-white font-geist group-hover:text-emerald-400 transition-colors">+{dailyScore}</div>
                      <div className="text-[10px] text-white/30 uppercase tracking-widest font-geist font-bold mt-1">{dailyScore === 0 ? 'Closed / Inactive' : 'Anchor Traffic Score'}</div>
                    </div>
                  </div>
                )})}

                {(!anchors || anchors.length === 0) && (
                  <div className="text-center p-10 border border-white/10 rounded-3xl bg-white/5 backdrop-blur-md">
                    <p className="text-white/50 font-geist">Gathering deep spatial intelligence... waiting for location context.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'Competitors' ? (
          <div className="max-w-5xl mx-auto w-full pb-10">

            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <h1 className="text-3xl font-bold text-white font-geist tracking-tight">
                    Nearby Competitor Insights
                  </h1>
                  <span className="text-[10px] bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 px-2 py-1 rounded-full font-bold tracking-widest uppercase font-geist">
                    BETA
                  </span>
                </div>
                <p className="text-white/30 text-sm font-geist">
                  {competitorsLoading
                    ? 'Scanning nearby businesses...'
                    : competitorsError
                    ? 'Unable to load competitor data'
                    : competitors.length > 0
                    ? `${competitors.length} similar ${businessType?.toLowerCase()} businesses found within 2 miles`
                    : competitorsFetched
                    ? 'No similar businesses found nearby'
                    : 'Loading competitor data...'}
                </p>
              </div>
              <button
                onClick={() => {
                  competitorsFetchingRef.current = false;
                  setCompetitorsFetched(false);
                  setCompetitors([]);
                  setCompetitorsError('');
                  setCompetitorsLoading(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white/50 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 hover:text-white transition-all duration-200 font-geist shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {/* Loading Skeleton */}
            {competitorsLoading && (
              <div className="flex flex-col gap-4 animate-pulse">
                <div className="rounded-2xl p-5 grid grid-cols-2 gap-4" style={glassCard}>
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="rounded-xl p-4 space-y-2.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="h-3 bg-white/10 rounded w-2/3" />
                      <div className="h-2.5 bg-white/5 rounded w-full" />
                      <div className="h-2.5 bg-white/5 rounded w-4/5" />
                      <div className="h-8 bg-white/[0.03] rounded-lg mt-3" />
                    </div>
                  ))}
                </div>
                {[0, 1, 2].map(i => (
                  <div key={i} className="rounded-2xl p-6" style={glassCard}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-8 bg-white/10 rounded-lg" />
                        <div className="h-4 bg-white/10 rounded w-44" />
                      </div>
                      <div className="h-7 w-10 bg-white/5 rounded" />
                    </div>
                    <div className="flex gap-6 mb-4">
                      <div className="h-3 bg-white/5 rounded w-20" />
                      <div className="h-3 bg-white/5 rounded w-16" />
                    </div>
                    <div className="h-10 bg-white/[0.03] rounded-xl" />
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {!competitorsLoading && competitorsError && (
              <div className="rounded-2xl p-12 flex flex-col items-center justify-center text-center" style={glassCard}>
                <AlertCircle className="w-10 h-10 text-red-400/60 mb-4" />
                <h3 className="text-white/60 font-bold font-geist text-lg mb-2">Could Not Load Competitors</h3>
                <p className="text-white/30 text-sm font-geist mb-6 max-w-md leading-relaxed">{competitorsError}</p>
                <button
                  onClick={() => {
                    competitorsFetchingRef.current = false;
                    setCompetitorsFetched(false);
                    setCompetitors([]);
                    setCompetitorsError('');
                  }}
                  className="px-5 py-2.5 bg-white/10 text-white/70 border border-white/10 rounded-xl text-sm font-bold font-geist hover:bg-white/15 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Empty State */}
            {!competitorsLoading && !competitorsError && competitors.length === 0 && competitorsFetched && (
              <div className="rounded-2xl p-12 flex flex-col items-center justify-center text-center" style={glassCard}>
                <Building2 className="w-12 h-12 text-white/10 mb-4" />
                <h3 className="text-white/50 font-bold font-geist text-xl mb-2">No Similar Businesses Found</h3>
                <p className="text-white/25 text-sm font-geist max-w-md leading-relaxed">
                  We couldn't find any {businessType?.toLowerCase()} businesses within 2 miles. This could mean you're in a low-density area — which is actually a significant competitive advantage.
                </p>
              </div>
            )}

            {/* Main Content */}
            {!competitorsLoading && !competitorsError && competitors.length > 0 && (() => {
              const insights = generateCompetitorInsights(competitors, businessType || '');
              const styleMap: Record<string, { bg: string; border: string; textColor: string; dotBg: string }> = {
                warning: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', textColor: 'text-red-400', dotBg: 'bg-red-400' },
                info: { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', textColor: 'text-indigo-400', dotBg: 'bg-indigo-400' },
                success: { bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)', textColor: 'text-emerald-400', dotBg: 'bg-emerald-400' },
              };
              return (
                <>
                  {/* Market Intelligence Panel */}
                  <div className="mb-8">
                    <h2 className="text-xs font-bold text-white/50 font-geist uppercase tracking-widest mb-4 flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5" /> Market Intelligence
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      {insights.map((ins, i) => {
                        const s = styleMap[ins.type];
                        return (
                          <div
                            key={i}
                            className="rounded-2xl p-5"
                            style={{ background: s.bg, border: `1px solid ${s.border}`, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${s.dotBg} shrink-0`} />
                              <h3 className={`text-sm font-bold font-geist ${s.textColor}`}>{ins.title}</h3>
                            </div>
                            <p className="text-white/60 text-xs font-geist leading-relaxed mb-3">{ins.body}</p>
                            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <p className="text-white/80 text-xs font-geist leading-relaxed">
                                <span className={`${s.textColor} font-bold uppercase tracking-wider text-[10px] block mb-1`}>Action</span>
                                {ins.action}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top Competitors List */}
                  <div className="mb-8">
                    <h2 className="text-xs font-bold text-white/50 font-geist uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Users2 className="w-3.5 h-3.5" /> Top Local Competitors
                    </h2>
                    <div className="flex flex-col gap-4">
                      {competitors.slice(0, 5).map((comp, idx) => {
                        const tip = getCompetitorTip(comp, businessType || '');
                        const rankStyles = [
                          'text-yellow-400 border-yellow-400/30 bg-yellow-400/5',
                          'text-white/60 border-white/15 bg-white/5',
                          'text-amber-500 border-amber-500/30 bg-amber-500/5',
                          'text-white/40 border-white/10 bg-white/[0.03]',
                          'text-white/30 border-white/10 bg-white/[0.03]',
                        ];
                        return (
                          <div key={comp.placeId || idx} className="rounded-2xl p-6 hover:bg-white/[0.04] transition-all duration-300 group" style={glassCard}>
                            <div className="flex items-start justify-between gap-4 mb-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className={`text-lg font-black font-geist shrink-0 leading-none mt-0.5 w-7 text-center border rounded-lg py-1 ${rankStyles[idx] || rankStyles[4]}`}>
                                  {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <h3 className="text-lg font-bold text-white font-geist leading-tight">{comp.name}</h3>
                                    {comp.businessStatus !== 'OPERATIONAL' && (
                                      <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider font-geist">
                                        {comp.businessStatus === 'CLOSED_TEMPORARILY' ? 'Temp. Closed' : 'Closed'}
                                      </span>
                                    )}
                                    {comp.openNow === true && (
                                      <span className="text-[9px] bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider font-geist">
                                        Open Now
                                      </span>
                                    )}
                                    {comp.openNow === false && (
                                      <span className="text-[9px] bg-white/5 text-white/30 border border-white/10 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider font-geist">
                                        Closed Now
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-white/25 text-xs font-geist flex items-center gap-1 truncate mt-0.5">
                                    <MapPin className="w-3 h-3 shrink-0" /> {comp.address}
                                  </p>
                                </div>
                              </div>
                              {/* Composite score badge */}
                              <div className="flex flex-col items-end shrink-0">
                                <div className="text-2xl font-black font-geist text-white/70 group-hover:text-white transition-colors">{comp.score}</div>
                                <div className="text-[9px] text-white/20 font-geist uppercase tracking-widest">Score</div>
                              </div>
                            </div>

                            {/* Stats row */}
                            <div className="flex items-center gap-6 mb-4 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                <span className="text-white/80 text-sm font-bold font-geist">
                                  {comp.rating > 0 ? comp.rating.toFixed(1) : '—'}
                                </span>
                                <span className="text-white/30 text-xs font-geist">
                                  ({comp.reviewCount > 0 ? comp.reviewCount.toLocaleString() : '—'} reviews)
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-white/20" />
                                <span className="text-white/40 text-xs font-geist">{comp.distance} mi away</span>
                              </div>
                            </div>

                            {/* How to compete tip */}
                            <div className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.05] flex items-start gap-2">
                              <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <p className="text-white/60 text-xs font-geist leading-relaxed">
                                <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] mr-1.5">How to Compete:</span>
                                {tip}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Competitive Strategy Panel */}
                  <div
                    className="rounded-2xl p-6"
                    style={{ ...glassCard, background: 'linear-gradient(135deg, rgba(52,211,153,0.05) 0%, rgba(20,20,20,0.3) 100%)' }}
                  >
                    <div className="flex items-center gap-2 mb-5">
                      <Award className="w-4 h-4 text-emerald-400" />
                      <h2 className="text-sm font-bold text-white font-geist uppercase tracking-widest">Your Competitive Strategy</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        {
                          icon: Star,
                          color: 'text-yellow-400',
                          bg: 'rgba(234,179,8,0.08)',
                          border: 'rgba(234,179,8,0.15)',
                          title: 'Dominate Reviews',
                          desc: `The top competitor has ${(competitors[0]?.reviewCount ?? 0).toLocaleString()} reviews. Consistently prompting happy customers can close this gap within 3–6 months.`,
                        },
                        {
                          icon: Zap,
                          color: 'text-purple-400',
                          bg: 'rgba(168,85,247,0.08)',
                          border: 'rgba(168,85,247,0.15)',
                          title: 'Own Your Niche',
                          desc: competitors.length >= 5
                            ? `With ${competitors.length} similar businesses nearby, a signature specialty makes you instantly memorable and referral-worthy.`
                            : 'Establish a signature offering that customers associate exclusively with your business to build word-of-mouth loyalty.',
                        },
                        {
                          icon: TrendingUp,
                          color: 'text-emerald-400',
                          bg: 'rgba(52,211,153,0.08)',
                          border: 'rgba(52,211,153,0.15)',
                          title: 'Boost Local Visibility',
                          desc: 'Fully optimize your Google Business Profile with fresh photos, correct hours, and a keyword-rich description to capture every "near me" search.',
                        },
                      ].map((item, i) => {
                        const ItemIcon = item.icon;
                        return (
                          <div
                            key={i}
                            className="rounded-xl p-4 flex flex-col gap-3"
                            style={{ background: item.bg, border: `1px solid ${item.border}` }}
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: item.bg }}>
                              <ItemIcon className={`w-4 h-4 ${item.color}`} />
                            </div>
                            <h3 className="text-white font-bold font-geist text-sm">{item.title}</h3>
                            <p className="text-white/50 text-xs font-geist leading-relaxed">{item.desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}

          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white/50 font-geist">{activeTab}</h2>
              <p className="text-white/30 mt-2 font-geist">Coming soon</p>
            </div>
          </div>
        )}

      </main>

      {/* API Info Popup Overlay */}
      {showApiInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-3xl p-8 relative border border-white/10 shadow-[0_0_50px_rgba(52,211,153,0.1)]" style={glassCard}>
            <button 
              onClick={() => setShowApiInfo(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mb-6 shadow-inner">
              <Sparkles className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white font-geist tracking-tight mb-2">Live API Integrations</h2>
            <p className="text-white/60 text-sm font-geist leading-relaxed mb-6">
              The data you see here is powered by live external APIs dynamically pulling in trends customized for your business type.
            </p>
            
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-white font-bold font-geist text-sm">Upcoming US Events</h3>
                </div>
                <p className="text-white/50 text-xs font-geist leading-relaxed">
                  Fetches exactly live national holidays and observances from the <span className="text-white/80 font-bold">Calendarific API</span>, filtered by country (US) and the current year.
                </p>
              </div>
              
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  <h3 className="text-white font-bold font-geist text-sm">Live Local Events</h3>
                </div>
                <p className="text-white/50 text-xs font-geist leading-relaxed">
                  Fetches concerts, sports, and shows from the <span className="text-white/80 font-bold">Ticketmaster Discovery API</span> within 25 miles of your location over the next 7 days.
                </p>
              </div>
              
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-white font-bold font-geist text-sm">Viral Market Trends</h3>
                </div>
                <p className="text-white/50 text-xs font-geist leading-relaxed">
                  Scanned directly from <span className="text-white/80 font-bold">Reddit API</span>, crawling across <span className="text-emerald-400">r/socialmedia</span> and viral subreddits to find the most common emerging trends for local businesses to leverage.
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => setShowApiInfo(false)}
              className="w-full mt-8 py-3 rounded-xl bg-emerald-400 border border-emerald-300 text-black font-bold font-geist text-sm hover:bg-emerald-300 transition-colors shadow-[0_0_20px_rgba(52,211,153,0.3)]"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
