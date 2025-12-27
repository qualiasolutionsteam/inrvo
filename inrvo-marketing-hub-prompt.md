# Claude Code Prompt: INrVO Marketing Hub

## Project Context

You are working inside the INrVO project directory. INrVO is a personalized AI meditation app (React 19 + Vite + Supabase + TypeScript). The app is live at inrvo.com.

We need to create a `/marketing` route that serves as an interactive marketing strategy hub. This is a private dashboard for the founder to track our launch marketing strategy, fill in details, track progress, and collaborate with their marketing agency (Qualia Solutions).

## What to Build

Create a new `/marketing` route with an interactive, visually appealing marketing strategy dashboard. This should feel like a premium project management + strategy tool, not just static content.

## Technical Requirements

- Use the existing project's tech stack (React 19, Vite, TypeScript, Tailwind CSS)
- Create new route at `/marketing` 
- Use localStorage to persist all user inputs and progress (no backend needed for now)
- Make it fully responsive
- Use smooth animations and transitions
- Include a way to export/download the strategy as PDF or markdown

## Page Structure & Components

### 1. Marketing Hub Landing (`/marketing`)

**Header Section:**
- Title: "INrVO Launch Marketing Hub"
- Subtitle: "Strategic roadmap from 0 → Product-Market Fit"
- Last updated timestamp
- Export button (PDF/Markdown)
- Overall progress indicator (% complete across all phases)

**Navigation:**
- Tabbed or sidebar navigation between phases
- Visual progress indicators for each phase
- Current phase highlighted

---

### 2. Phase 1: Foundation (Month 1)

**Section 1.1: Positioning & Messaging**

Interactive card/module with:
- [ ] Checkbox: "Core Value Proposition Defined"
- Text input: "Primary Value Proposition" (pre-filled with: "Meditation that knows what you're going through")
- Expandable section: "Alternative Value Props to Test"
  - Input field to add/remove value prop variations
  - Ability to mark one as "Winner" after testing

- [ ] Checkbox: "Competitor Differentiation Clear"
- Interactive comparison table (editable):
  | Feature | INrVO | Calm | Headspace | Insight Timer |
  |---------|-------|------|-----------|---------------|
  | Personalization | ✅ AI-generated per session | ❌ Pre-recorded | ❌ Pre-recorded | ❌ Pre-recorded |
  | Voice Cloning | ✅ 30-second clone | ❌ | ❌ | ❌ |
  | (add more rows) |

- [ ] Checkbox: "Persona Messaging Complete"
- Expandable persona cards (5 personas):
  
  **Persona Card Template:**
  ```
  [Persona Name] - e.g., "The Overwhelmed Professional"
  Age Range: [input] (pre-filled: 35-50)
  Primary Pain: [textarea] (pre-filled with our research)
  Key Message: [textarea] 
  Hook Examples: [textarea - multiple lines]
  Status: [Draft / In Review / Approved]
  ```

  Pre-filled personas:
  1. The Overwhelmed Professional (35-50)
  2. The Spiritual Explorer (25-40)
  3. The Anxious Sleeper (28-45)
  4. The Healing Parent (30-45)
  5. The Self-Improvement Enthusiast (22-35)

**Section 1.2: Conversion Infrastructure**

Checklist module with expandable details:

- [ ] Landing Page
  - Status: [Not Started / In Progress / Live]
  - URL: [input field]
  - Conversion Rate: [input field] %
  - Notes: [textarea]

- [ ] Email Capture
  - Lead Magnet: [input - what are we offering?]
  - Form Location: [checklist - Homepage / Landing Page / Blog / Exit Intent]
  - Current Subscribers: [number input]

- [ ] Welcome Email Sequence
  - Expandable timeline showing 7 emails:
    - Day 1: Welcome + First Meditation Prompt [Status: Draft/Written/Live]
    - Day 2: Voice Cloning Tutorial [Status]
    - Day 3: Use Case Inspiration [Status]
    - Day 4: Social Proof / Testimonial [Status]
    - Day 5: Premium Features Highlight [Status]
    - Day 6: Common Questions / Objections [Status]
    - Day 7: Success Story + Trial CTA [Status]
  - Each email expandable to show/edit:
    - Subject Line
    - Preview Text
    - Key Message
    - CTA
    - Status

- [ ] Analytics Setup
  - Checklist:
    - [ ] Google Analytics 4 installed
    - [ ] Event tracking for key actions (sign up, first meditation, voice clone, upgrade)
    - [ ] Funnel visualization configured
    - [ ] UTM parameter tracking
    - [ ] Conversion goals set up

**Section 1.3: Content Foundation**

- [ ] SEO Content Plan
  - Interactive table of target articles:
    | # | Target Keyword | Search Volume | Difficulty | Status | URL |
    |---|----------------|---------------|------------|--------|-----|
    | 1 | personalized meditation app | [input] | [input] | [dropdown] | [input] |
    | 2 | AI meditation generator | | | | |
    | 3 | custom affirmations app | | | | |
    | (add row button) |
  
  Status options: Idea / Outlined / Draft / Published / Ranking

- [ ] Hero Social Content
  - Grid of content cards (add/edit/delete):
    - Content Type: [Reel / TikTok / Carousel / Story]
    - Hook: [text]
    - Concept: [textarea]
    - Script/Outline: [textarea - expandable]
    - Status: [Idea / Scripted / Filmed / Edited / Posted]
    - Performance: [views, likes, saves, shares - editable after posting]
    - Link: [URL after posting]

---

### 3. Phase 2: Validation (Months 2-3)

**Section 2.1: Paid Acquisition Tests**

Budget Tracker:
- Total Test Budget: $[input] (suggested: $500-1000)
- Spent to Date: $[calculated from below]
- Remaining: $[calculated]

Campaign Test Cards (add/remove):
```
Campaign Name: [input]
Platform: [Meta / TikTok / Google / YouTube]
Audience: [textarea - targeting details]
Creative Angle: [dropdown + custom]
  - Voice Cloning Demo
  - Personalization Story  
  - vs. Generic Apps Comparison
  - Specific Use Case (Sleep/Anxiety/etc)
  - Testimonial
  - Custom: [input]
Budget: $[input]
Duration: [date range picker]
Status: [Planning / Active / Paused / Complete]
Results (when complete):
  - Impressions: [input]
  - Clicks: [input]
  - CTR: [calculated] %
  - Conversions: [input]
  - CPA: [calculated]
  - ROAS: [input]
Notes/Learnings: [textarea]
Winner?: [checkbox]
```

Creative Testing Matrix:
- Visual grid showing which angles + audiences have been tested
- Color coded: Not Tested (gray), Testing (yellow), Winner (green), Loser (red)

**Section 2.2: Organic Content Performance**

Content Calendar View:
- Weekly/Monthly toggle
- Drag-and-drop content scheduling
- Each content piece shows:
  - Platform icon
  - Content type
  - Hook (truncated)
  - Status indicator
  - Performance metrics (after posting)

Content Ideas Backlog:
- Kanban board style:
  - Ideas → Scripted → In Production → Scheduled → Posted → Analyzed

Top Performing Content Leaderboard:
- Sorted by engagement rate or conversions
- Quick duplicate/iterate button

**Section 2.3: Influencer Seeding**

Influencer Tracker Table:
| Name | Platform | Followers | Niche | Status | Content Created | Performance | Cost | Notes |
|------|----------|-----------|-------|--------|-----------------|-------------|------|-------|
| [input] | [select] | [input] | [input] | [Researching/Contacted/Negotiating/Agreed/Content Live/Complete] | [link] | [metrics] | [input] | [textarea] |

Status Pipeline Visualization:
- Funnel showing: Researching → Contacted → Negotiating → Agreed → Content Live

---

### 4. Phase 3: Scale (Month 4+)

**Section 4.1: Winning Playbook**

Summary cards showing:
- Best Performing Message: [auto-populated from Phase 2 winners or manual input]
- Best Performing Audience: [input]
- Best Performing Channel: [input]
- Current CAC: $[input]
- Target CAC: $[input]
- LTV:CAC Ratio: [calculated or input]

**Section 4.2: Scale Plan**

Monthly budget allocation planner:
- Slider or input for each channel
- Visual pie chart of allocation
- Projected results based on Phase 2 CPAs

Growth projections chart:
- Input: Monthly budget
- Input: Expected CAC
- Output: Projected new users per month
- Visualization: Line chart of cumulative users over 6-12 months

**Section 4.3: Ongoing Operations**

Recurring tasks checklist (resets weekly/monthly):
- Weekly:
  - [ ] Review ad performance
  - [ ] Publish X social posts
  - [ ] Respond to comments/DMs
  - [ ] Check SEO rankings
- Monthly:
  - [ ] Performance report
  - [ ] Strategy review call
  - [ ] Content calendar planning
  - [ ] Influencer outreach batch

---

### 5. Resources & Assets Section

**Brand Assets:**
- Upload/link storage for:
  - Logos (various formats)
  - Brand colors (with hex codes displayed)
  - Fonts
  - Brand guidelines PDF
  - Product screenshots
  - Demo videos

**Credentials & Access (masked/secure display):**
- Social account links
- Ad platform access status
- Analytics access status
- (Note: Don't store actual passwords, just status indicators)

**Templates & Documents:**
- Link storage for:
  - Content templates
  - Email templates
  - Ad creative templates
  - Reporting templates

---

### 6. Notes & Collaboration

**Meeting Notes:**
- Chronological list of meeting notes
- Add new note with date and content
- Tagging system: [Strategy / Content / Ads / Review / Other]

**Ideas Parking Lot:**
- Quick-add ideas
- Vote/priority system
- Move to appropriate phase when ready

**Questions for Discussion:**
- List of open questions
- Mark as resolved with answer

---

## UI/UX Requirements

### Visual Design:
- Clean, modern dashboard aesthetic
- Use INrVO brand colors if defined, otherwise:
  - Primary: Calming blue/teal (#0D9488 or similar)
  - Secondary: Warm accent
  - Background: Light with subtle gradients
  - Cards: White with subtle shadows
- Smooth animations on interactions
- Progress indicators should feel satisfying (subtle celebrations on completion)

### Interactions:
- Auto-save all inputs to localStorage (with "Saved" indicator)
- Expandable/collapsible sections
- Drag-and-drop where appropriate (content calendar, kanban)
- Inline editing (click to edit, blur to save)
- Confirmation on destructive actions (delete)
- Undo capability for recent changes

### Navigation:
- Sticky sidebar or top navigation
- Breadcrumbs showing current location
- Quick jump to any section
- "Back to App" link to main INrVO app

### Export Functionality:
- Export entire strategy as Markdown
- Export entire strategy as PDF
- Export individual sections
- Include all filled-in data

### Mobile Responsiveness:
- Collapsible sidebar on mobile
- Cards stack vertically
- Tables become scrollable or card-based
- Touch-friendly interactions

---

## Data Structure Suggestion

```typescript
interface MarketingHub {
  lastUpdated: string;
  
  phase1: {
    positioning: {
      primaryValueProp: string;
      alternativeValueProps: { text: string; isWinner: boolean }[];
      competitorComparison: CompetitorRow[];
      personas: Persona[];
    };
    conversion: {
      landingPage: { status: string; url: string; conversionRate: number; notes: string };
      emailCapture: { leadMagnet: string; locations: string[]; subscribers: number };
      emailSequence: EmailDay[];
      analytics: { [key: string]: boolean };
    };
    content: {
      seoArticles: SEOArticle[];
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
    winningPlaybook: {
      bestMessage: string;
      bestAudience: string;
      bestChannel: string;
      currentCAC: number;
      targetCAC: number;
      ltv: number;
    };
    scalePlan: {
      monthlyBudget: number;
      channelAllocation: { [channel: string]: number };
    };
    recurringTasks: { [taskId: string]: boolean };
  };
  
  resources: {
    brandAssets: Asset[];
    credentials: Credential[];
    templates: Template[];
  };
  
  notes: {
    meetingNotes: Note[];
    ideasParkingLot: Idea[];
    questions: Question[];
  };
}
```

---

## File Structure Suggestion

```
src/
  pages/
    marketing/
      index.tsx (main hub layout with navigation)
      components/
        MarketingNav.tsx
        ProgressIndicator.tsx
        PhaseCard.tsx
        ChecklistItem.tsx
        EditableField.tsx
        PersonaCard.tsx
        CompetitorTable.tsx
        CampaignCard.tsx
        ContentCalendar.tsx
        KanbanBoard.tsx
        InfluencerTable.tsx
        ExportButton.tsx
        MeetingNotes.tsx
      phases/
        Phase1Foundation.tsx
        Phase2Validation.tsx
        Phase3Scale.tsx
        ResourcesAssets.tsx
        NotesCollaboration.tsx
      hooks/
        useMarketingData.ts (localStorage persistence)
        useAutoSave.ts
      utils/
        exportMarkdown.ts
        exportPDF.ts
      data/
        initialData.ts (pre-filled content from strategy)
```

---

## Pre-filled Content

Use the following pre-filled content from our strategy work:

### Personas (pre-fill these):

**1. The Overwhelmed Professional**
- Age: 35-50
- Pain: "Every meditation app feels the same. None address what I'm actually going through."
- Key Message: "5 minutes of meditation that actually addresses your 3pm meeting anxiety."

**2. The Spiritual Explorer**
- Age: 25-40
- Pain: "I've done all the basic meditations. I want something deeper and more personalized."
- Key Message: "Past life regressions, spirit guide connections, akashic records - personalized for you."

**3. The Anxious Sleeper**
- Age: 28-45
- Pain: "I need something that addresses MY specific worries, not generic 'ocean sounds'."
- Key Message: "Tell INrVO what's keeping you up. Get a meditation for exactly that."

**4. The Healing Parent**
- Age: 30-45
- Pain: "I want my kids to have the tools I never had, but kids' meditation content is so limited."
- Key Message: "Bedtime stories that calm YOUR child's specific fears."

**5. The Self-Improvement Enthusiast**
- Age: 22-35
- Pain: "Affirmation apps are so cheesy. I want something that actually feels authentic."
- Key Message: "Finally, affirmations that actually sound like you."

### Competitor Comparison (pre-fill):

| Feature | INrVO | Calm | Headspace | Insight Timer |
|---------|-------|------|-----------|---------------|
| Personalization | ✅ AI-generated per session | ❌ Pre-recorded | ❌ Pre-recorded | ❌ Pre-recorded |
| Voice Cloning | ✅ 30-second clone | ❌ | ❌ | ❌ |
| Content Types | ✅ 5 types (meditations, affirmations, hypnosis, journeys, stories) | ⚠️ Limited | ⚠️ Limited | ✅ Varied (user uploaded) |
| Price | TBD | $70/year | $70/year | Free + Premium |
| Generation Speed | ✅ < 60 seconds | N/A | N/A | N/A |
| Emotional Context | ✅ AI conversation first | ❌ | ❌ | ❌ |

### SEO Keywords to Target (pre-fill):

1. personalized meditation app
2. AI meditation generator
3. custom affirmations app
4. meditation for anxiety
5. meditation for sleep
6. voice cloning meditation
7. personalized guided meditation
8. AI wellness app
9. custom sleep meditation
10. meditation app like calm but personalized

### Creative Angles for Ads (pre-fill options):

1. Voice Cloning Demo - "Clone your voice in 30 seconds, hear meditations in YOUR voice"
2. Personalization Story - "Tired of generic 'breathe in, breathe out'? Try meditation that actually gets it."
3. vs. Generic Apps - Side-by-side comparison showing personalized vs. one-size-fits-all
4. Specific Use Case: Sleep - "Can't sleep because your mind won't shut up? Tell INrVO exactly what's bothering you."
5. Specific Use Case: Anxiety - "Meditation for YOUR specific anxiety, not generic stress relief #47"
6. The AI Conversation - Show the conversational flow before meditation generation
7. Testimonial/Results - Real user experiencing the difference

---

## Implementation Notes

1. **Start with the data structure and localStorage hook** - This is the foundation
2. **Build the navigation and layout shell** - Establish the frame
3. **Implement Phase 1 first** - It's the most detailed and sets patterns
4. **Add export functionality early** - Useful for testing
5. **Polish animations and micro-interactions last** - After functionality works

---

## Success Criteria

The marketing hub is complete when:
- [ ] All three phases are navigable and interactive
- [ ] All form fields save to localStorage automatically
- [ ] Progress is tracked and displayed
- [ ] Export to Markdown works
- [ ] Mobile responsive
- [ ] Pre-filled content is loaded on first visit
- [ ] Feels professional enough to present to a client/founder

---

## Optional Enhancements (if time permits)

- Dark mode toggle
- Print-friendly view
- Shareable read-only link (generate static HTML)
- Integration with actual analytics APIs (show real data)
- AI assistant integration (ask Claude questions about strategy from within the hub)
- Timeline/Gantt view of all phases
- Notification/reminder system for tasks

---

Now build this marketing hub. Start with the foundational data structure and navigation, then build out each phase systematically. Prioritize functionality over polish initially, but ensure the final result feels premium and professional.
