// Marketing Hub Data Types

// Attribution metadata for tracking who edited what
export interface Attribution {
  created_by: string;      // Email of creator
  created_at: string;      // ISO timestamp
  last_edited_by: string;  // Email of last editor
  last_edited_at: string;  // ISO timestamp
}

export type Status = 'not_started' | 'in_progress' | 'complete' | 'live';
export type ContentStatus = 'idea' | 'outlined' | 'draft' | 'published' | 'ranking';
export type SocialContentStatus = 'idea' | 'scripted' | 'filmed' | 'edited' | 'posted';
export type EmailStatus = 'draft' | 'written' | 'live';
export type CampaignStatus = 'planning' | 'active' | 'paused' | 'complete';
export type InfluencerStatus = 'researching' | 'contacted' | 'negotiating' | 'agreed' | 'content_live' | 'complete';
export type PersonaStatus = 'draft' | 'in_review' | 'approved';
export type BacklogStatus = 'ideas' | 'scripted' | 'in_production' | 'scheduled' | 'posted' | 'analyzed';
export type Platform = 'meta' | 'tiktok' | 'google' | 'youtube' | 'instagram' | 'twitter';
export type ContentType = 'reel' | 'tiktok' | 'carousel' | 'story' | 'post';

export interface ValueProp {
  id: string;
  text: string;
  isWinner: boolean;
}

export interface CompetitorRow {
  id: string;
  feature: string;
  inrvo: string;
  calm: string;
  headspace: string;
  insightTimer: string;
}

export interface Persona {
  id: string;
  name: string;
  ageRange: string;
  primaryPain: string;
  keyMessage: string;
  hookExamples: string;
  status: PersonaStatus;
}

export interface LandingPage {
  status: Status;
  url: string;
  conversionRate: number;
  notes: string;
}

export interface EmailCapture {
  leadMagnet: string;
  locations: string[];
  subscribers: number;
}

export interface EmailDay {
  id: string;
  day: number;
  title: string;
  subjectLine: string;
  previewText: string;
  keyMessage: string;
  cta: string;
  status: EmailStatus;
}

export interface AnalyticsChecklist {
  ga4Installed: boolean;
  eventTracking: boolean;
  funnelVisualization: boolean;
  utmTracking: boolean;
  conversionGoals: boolean;
}

export interface SEOArticle {
  id: string;
  keyword: string;
  searchVolume: string;
  difficulty: string;
  status: ContentStatus;
  url: string;
  attribution?: Attribution;
}

export interface SocialContent {
  id: string;
  contentType: ContentType;
  hook: string;
  concept: string;
  scriptOutline: string;
  status: SocialContentStatus;
  views: number;
  likes: number;
  saves: number;
  shares: number;
  link: string;
  attribution?: Attribution;
}

export interface Campaign {
  id: string;
  name: string;
  platform: Platform;
  audience: string;
  creativeAngle: string;
  customAngle: string;
  budget: number;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  notes: string;
  isWinner: boolean;
  attribution?: Attribution;
}

export interface CalendarItem {
  id: string;
  date: string;
  platform: Platform;
  contentType: ContentType;
  hook: string;
  status: SocialContentStatus;
  performance: {
    views: number;
    engagement: number;
  };
  attribution?: Attribution;
}

export interface BacklogItem {
  id: string;
  title: string;
  concept: string;
  status: BacklogStatus;
  platform: Platform;
  priority: number;
  attribution?: Attribution;
}

export interface Influencer {
  id: string;
  name: string;
  platform: Platform;
  followers: string;
  niche: string;
  status: InfluencerStatus;
  contentLink: string;
  performance: string;
  cost: string;
  notes: string;
  attribution?: Attribution;
}

export interface WinningPlaybook {
  bestMessage: string;
  bestAudience: string;
  bestChannel: string;
  currentCAC: number;
  targetCAC: number;
  ltv: number;
}

export interface ChannelAllocation {
  meta: number;
  google: number;
  tiktok: number;
  influencer: number;
  content: number;
}

export interface RecurringTask {
  id: string;
  title: string;
  frequency: 'weekly' | 'monthly';
  completed: boolean;
  lastReset: string;
  attribution?: Attribution;
}

export interface Asset {
  id: string;
  name: string;
  type: 'logo' | 'color' | 'font' | 'guideline' | 'screenshot' | 'video' | 'other';
  url: string;
  value?: string; // For hex codes
  attribution?: Attribution;
}

export interface Credential {
  id: string;
  name: string;
  platform: string;
  status: 'active' | 'pending' | 'expired';
  url: string;
  attribution?: Attribution;
}

export interface Template {
  id: string;
  name: string;
  type: 'content' | 'email' | 'ad' | 'report' | 'other';
  url: string;
  attribution?: Attribution;
}

export interface MeetingNote {
  id: string;
  date: string;
  content: string;
  tags: string[];
  attribution?: Attribution;
}

export interface Idea {
  id: string;
  content: string;
  votes: number;
  createdAt: string;
  movedTo?: string;
  attribution?: Attribution;
}

export interface Question {
  id: string;
  question: string;
  answer: string;
  resolved: boolean;
  createdAt: string;
  attribution?: Attribution;
}

// Main Marketing Hub interface
export interface MarketingHubData {
  lastUpdated: string;

  phase1: {
    positioning: {
      primaryValuePropDefined: boolean;
      primaryValueProp: string;
      alternativeValueProps: ValueProp[];
      competitorDifferentiationClear: boolean;
      competitorComparison: CompetitorRow[];
      personaMessagingComplete: boolean;
      personas: Persona[];
    };
    conversion: {
      landingPageComplete: boolean;
      landingPage: LandingPage;
      emailCaptureComplete: boolean;
      emailCapture: EmailCapture;
      welcomeSequenceComplete: boolean;
      emailSequence: EmailDay[];
      analyticsComplete: boolean;
      analytics: AnalyticsChecklist;
    };
    content: {
      seoContentPlanComplete: boolean;
      seoArticles: SEOArticle[];
      heroSocialContentComplete: boolean;
      heroContent: SocialContent[];
    };
  };

  phase2: {
    paidAcquisition: {
      totalBudget: number;
      campaigns: Campaign[];
    };
    organicContent: {
      calendar: CalendarItem[];
      backlog: BacklogItem[];
    };
    influencers: Influencer[];
  };

  phase3: {
    winningPlaybook: WinningPlaybook;
    scalePlan: {
      monthlyBudget: number;
      channelAllocation: ChannelAllocation;
    };
    recurringTasks: RecurringTask[];
  };

  resources: {
    brandAssets: Asset[];
    credentials: Credential[];
    templates: Template[];
  };

  notes: {
    meetingNotes: MeetingNote[];
    ideasParkingLot: Idea[];
    questions: Question[];
  };
}

// Tab/navigation types
export type MarketingTab = 'overview' | 'phase1' | 'phase2' | 'phase3' | 'resources' | 'notes';
