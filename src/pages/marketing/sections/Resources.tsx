import React, { useState } from 'react';
import {
  Palette,
  Key,
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Image,
  Video,
  Type,
  BookOpen,
  Download,
  Bot,
} from 'lucide-react';
import { Section } from '../components/Section';
import { EditableField } from '../components/EditableField';
import { AttributionBadge } from '../components/AttributionBadge';
import { MarketingHubData, Asset, Credential, Template } from '../types';
import { generateId } from '../data/initialData';
import { useMarketingUser } from '../contexts/MarketingUserContext';
import { createAttribution, updateAttribution } from '../utils/attribution';

// AI System Prompt - downloadable content
const MEDITATION_AGENT_SYSTEM_PROMPT = `# INrVO Meditation Agent System Prompt
# Location: src/lib/agent/MeditationAgent.ts (lines 128-234)
# This prompt is sent to gemini-chat edge function for conversational AI

---

You are a wise, compassionate meditation guide for INrVO. You are warm, grounded, and deeply present - like a trusted friend who happens to have profound wisdom.

## YOUR CORE PURPOSE

You are here to **listen and converse** with the user. You engage in meaningful dialogue, offering wisdom and perspective when helpful. You do NOT immediately generate meditations - you have conversations.

## CRITICAL: CONVERSATIONAL MODE

**DEFAULT BEHAVIOR**: Have a conversation. Listen. Respond thoughtfully. Share wisdom when relevant.

**DO NOT generate meditations unless the user explicitly asks.** Wait for clear requests like:
- "Can you create a meditation for me?"
- "I'd like a meditation"
- "Generate a meditation"
- "Make me a sleep story"
- "Create an affirmation for me"
- "I want a guided visualization"

## RESPONSE LENGTH RULES (CRITICAL)

**Match your response length to the user's message:**

1. **Greetings (hi, hello, hey)**: 1 sentence max. Just say hi warmly.
   - Example: "Hey there. What's on your mind today?"

2. **Simple shares (I'm anxious, stressed, etc.)**: 2-3 sentences max. Acknowledge, maybe ask one gentle question.
   - Example: "That sounds heavy. What's been weighing on you?"

3. **Deeper sharing**: 3-4 sentences. Reflect, offer perspective, perhaps suggest an option.
   - Example: "It sounds like there's a lot swirling inside. Sometimes when we're caught in that mental storm, just pausing to take three deep breaths can create a tiny opening. Would you like to talk through what's happening, or would a short meditation help right now?"

4. **Explicit meditation request**: Confirm briefly, then trigger generation.
   - Example: "I'll create a calming breathwork session for you."

## WISDOM YOU DRAW FROM

You naturally weave insights from teachers like:
- Buddha (compassion, impermanence), Rumi (love, wholeness)
- Thich Nhat Hanh (breathing, presence), Eckhart Tolle (now)
- Carl Jung (shadow, wholeness), Viktor Frankl (meaning)
- Joe Dispenza (neuroplasticity), Louise Hay (affirmations)

But don't lecture. Drop in wisdom sparingly and naturally.

## WHAT YOU CAN CREATE (when asked)

- **Meditations**: Guided visualizations, breathwork, body scans, loving-kindness, presence, etc.
- **Affirmations**: 4 styles - Power (I AM bursts), Guided (narrative-led), Sleep (fading/subliminal), Mirror Work (You are...)
- **Self-Hypnosis**: 3 depths - Light (relaxation), Standard (full session), Therapeutic (deep trance work)
- **Guided Journeys**: Inner journeys, past life regression, spirit guide connection, shamanic journeys, astral projection, akashic records, quantum field exploration
- **Children's Stories**: Bedtime stories for parents to read aloud - Toddlers (2-4) or Young Kids (5-8)

## MEDITATION GENERATION TRIGGERS

**ONLY use these exact trigger phrases when the user explicitly requests content:**
- "I'll craft a"
- "Let me create"
- "I'll create a"
- "Creating your"

**Examples of when to generate:**
- User: "Can you make me a meditation for anxiety?" → "I'll craft a calming meditation for you."
- User: "I need a sleep story" → "Let me create a gentle sleep story."
- User: "Give me an affirmation" → "Creating an affirmation just for you."

**Examples of when NOT to generate (just converse):**
- User: "I'm feeling anxious" → "What's got you feeling that way?" (conversation)
- User: "I can't sleep" → "I'm sorry to hear that. What's keeping you up?" (conversation)
- User: "I'm stressed about work" → "That's tough. Tell me more about what's happening." (conversation)

## YOUR CONVERSATIONAL STYLE

1. **Be concise.** Short sentences. Natural speech. No fluff.
2. **Ask questions** to understand before offering solutions.
3. **Acknowledge feelings** without immediately trying to fix them.
4. **Offer perspective** when it feels natural, not forced.
5. **Suggest options** - "Would you like to talk more, or would a meditation help?"
6. **Match their energy** - playful if they're playful, serious if they're serious.

## DO NOT

- Generate meditations without being asked
- Write long responses to simple messages
- Be preachy or lecture-y
- Use excessive emojis or spiritual jargon
- Say "I hear you" at the start of every message
- Force wisdom quotes into every response

## ABSOLUTELY FORBIDDEN (CRITICAL RULE)

**NEVER write meditation scripts, breathing exercises, visualization sequences, or guided content in your response UNLESS:**
1. The user EXPLICITLY asked (e.g., "create a meditation", "give me a visualization", "make me a breathing exercise")
2. AND you use one of the trigger phrases ("I'll craft a", "Let me create", "Creating your", etc.)

**If you write meditation content without BOTH conditions, you are BREAKING the application.**

These are CONVERSATION STARTERS, not meditation requests:
- "about life" → Ask what aspects interest them
- "I'm feeling down" → Ask what's going on
- "stress" → Ask what's causing it
- "anxiety" → Ask what's happening
- "sleep" → Ask about their sleep issues
- Generic topics like "peace", "calm", "relaxation" → Have a conversation about it

**Your response to these should be 1-3 sentences asking questions or offering perspective, NOT a meditation script.**

Remember: You're having a conversation with a friend, not performing a spiritual monologue.`;

// Download helper function
const downloadTextFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

interface ResourcesProps {
  data: MarketingHubData['resources'];
  onUpdate: (updates: Partial<MarketingHubData['resources']>) => void;
}

const assetTypeIcons: Record<Asset['type'], React.ElementType> = {
  logo: Image,
  color: Palette,
  font: Type,
  guideline: BookOpen,
  screenshot: Image,
  video: Video,
  other: FileText,
};

const credentialStatusColors: Record<Credential['status'], string> = {
  active: 'bg-teal-500/20 text-teal-600',
  pending: 'bg-amber-500/20 text-amber-400',
  expired: 'bg-red-500/20 text-red-400',
};

const templateTypeColors: Record<Template['type'], string> = {
  content: 'bg-cyan-500/20 text-cyan-400',
  email: 'bg-purple-500/20 text-purple-400',
  ad: 'bg-amber-500/20 text-amber-400',
  report: 'bg-blue-500/20 text-blue-400',
  other: 'bg-slate-500/20 text-slate-500',
};

export function Resources({ data, onUpdate }: ResourcesProps) {
  const { brandAssets, credentials, templates } = data;
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { email } = useMarketingUser();

  // Asset helpers
  const addAsset = (type: Asset['type']) => {
    const newAsset: Asset = {
      id: generateId(),
      name: `New ${type}`,
      type,
      url: '',
      value: type === 'color' ? '#000000' : undefined,
      attribution: createAttribution(email),
    };
    onUpdate({ brandAssets: [...brandAssets, newAsset] });
  };

  const updateAsset = (id: string, updates: Partial<Asset>) => {
    const assets = brandAssets.map((a) => (a.id === id ? { ...a, ...updates, attribution: updateAttribution(a.attribution, email) } : a));
    onUpdate({ brandAssets: assets });
  };

  const deleteAsset = (id: string) => {
    onUpdate({ brandAssets: brandAssets.filter((a) => a.id !== id) });
  };

  // Credential helpers
  const addCredential = () => {
    const newCredential: Credential = {
      id: generateId(),
      name: 'New Account',
      platform: '',
      status: 'pending',
      url: '',
    };
    onUpdate({ credentials: [...credentials, newCredential] });
  };

  const updateCredential = (id: string, updates: Partial<Credential>) => {
    const creds = credentials.map((c) => (c.id === id ? { ...c, ...updates } : c));
    onUpdate({ credentials: creds });
  };

  const deleteCredential = (id: string) => {
    onUpdate({ credentials: credentials.filter((c) => c.id !== id) });
  };

  // Template helpers
  const addTemplate = (type: Template['type']) => {
    const newTemplate: Template = {
      id: generateId(),
      name: `New ${type} template`,
      type,
      url: '',
    };
    onUpdate({ templates: [...templates, newTemplate] });
  };

  const updateTemplate = (id: string, updates: Partial<Template>) => {
    const temps = templates.map((t) => (t.id === id ? { ...t, ...updates } : t));
    onUpdate({ templates: temps });
  };

  const deleteTemplate = (id: string) => {
    onUpdate({ templates: templates.filter((t) => t.id !== id) });
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Group assets by type
  const assetsByType = brandAssets.reduce((acc, asset) => {
    if (!acc[asset.type]) acc[asset.type] = [];
    acc[asset.type].push(asset);
    return acc;
  }, {} as Record<Asset['type'], Asset[]>);

  return (
    <div className="space-y-6">
      {/* Brand Assets Section */}
      <Section
        title="Brand Assets"
        description="Logos, colors, fonts, and brand guidelines"
        icon={<Palette size={20} />}
        defaultExpanded={true}
      >
        {/* Colors */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">Colors</h4>
            <button
              onClick={() => addAsset('color')}
              className="text-sm text-teal-600 hover:text-teal-500 flex items-center gap-1"
            >
              <Plus size={14} />
              Add Color
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(assetsByType.color || []).map((asset) => (
              <div key={asset.id} className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-10 h-10 rounded-lg border border-slate-200"
                    style={{ backgroundColor: asset.value || '#000' }}
                  />
                  <div className="flex-1 min-w-0">
                    <EditableField
                      value={asset.name}
                      onChange={(name) => updateAsset(asset.id, { name })}
                      className="font-medium text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={asset.value || '#000000'}
                    onChange={(e) => updateAsset(asset.id, { value: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                  <code className="text-xs text-slate-500 flex-1">{asset.value}</code>
                  <button
                    onClick={() => copyToClipboard(asset.value || '', asset.id)}
                    className="p-1 text-slate-500 hover:text-slate-900"
                  >
                    {copiedId === asset.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={() => deleteAsset(asset.id)}
                    className="p-1 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Logos & Images */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">Logos & Images</h4>
            <button
              onClick={() => addAsset('logo')}
              className="text-sm text-teal-600 hover:text-teal-500 flex items-center gap-1"
            >
              <Plus size={14} />
              Add Logo
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...(assetsByType.logo || []), ...(assetsByType.screenshot || [])].map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onUpdate={(updates) => updateAsset(asset.id, updates)}
                onDelete={() => deleteAsset(asset.id)}
              />
            ))}
          </div>
        </div>

        {/* Fonts */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">Fonts</h4>
            <button
              onClick={() => addAsset('font')}
              className="text-sm text-teal-600 hover:text-teal-500 flex items-center gap-1"
            >
              <Plus size={14} />
              Add Font
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(assetsByType.font || []).map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onUpdate={(updates) => updateAsset(asset.id, updates)}
                onDelete={() => deleteAsset(asset.id)}
              />
            ))}
          </div>
        </div>

        {/* Guidelines */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">Brand Guidelines</h4>
            <button
              onClick={() => addAsset('guideline')}
              className="text-sm text-teal-600 hover:text-teal-500 flex items-center gap-1"
            >
              <Plus size={14} />
              Add Guideline
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(assetsByType.guideline || []).map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onUpdate={(updates) => updateAsset(asset.id, updates)}
                onDelete={() => deleteAsset(asset.id)}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* Platform Credentials Section */}
      <Section
        title="Platform Credentials"
        description="Quick access to your marketing platforms"
        icon={<Key size={20} />}
        defaultExpanded={true}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-2 text-slate-500 font-medium">Platform</th>
                <th className="text-left py-3 px-2 text-slate-500 font-medium">Account Name</th>
                <th className="text-left py-3 px-2 text-slate-500 font-medium">Status</th>
                <th className="text-left py-3 px-2 text-slate-500 font-medium">Link</th>
                <th className="text-right py-3 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {credentials.map((cred) => (
                <tr key={cred.id} className="border-b border-slate-200 hover:bg-white">
                  <td className="py-3 px-2">
                    <EditableField
                      value={cred.platform}
                      onChange={(platform) => updateCredential(cred.id, { platform })}
                      placeholder="e.g., Meta Ads"
                      className="font-medium"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <EditableField
                      value={cred.name}
                      onChange={(name) => updateCredential(cred.id, { name })}
                      placeholder="Account name"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <select
                      value={cred.status}
                      onChange={(e) =>
                        updateCredential(cred.id, { status: e.target.value as Credential['status'] })
                      }
                      className={`text-xs rounded px-2 py-1 ${credentialStatusColors[cred.status]}`}
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="expired">Expired</option>
                    </select>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <EditableField
                        value={cred.url}
                        onChange={(url) => updateCredential(cred.id, { url })}
                        placeholder="https://..."
                        className="text-xs"
                      />
                      {cred.url && (
                        <a
                          href={cred.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-slate-500 hover:text-teal-600"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <button
                      onClick={() => deleteCredential(cred.id)}
                      className="p-1 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={addCredential}
          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:border-slate-500 transition-colors mt-4"
        >
          <Plus size={20} />
          Add Platform
        </button>
      </Section>

      {/* Templates Section */}
      <Section
        title="Templates & Documents"
        description="Reusable templates for content, emails, ads, and reports"
        icon={<FileText size={20} />}
        defaultExpanded={true}
      >
        {/* Template Type Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(['content', 'email', 'ad', 'report', 'other'] as Template['type'][]).map((type) => (
            <button
              key={type}
              onClick={() => addTemplate(type)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${templateTypeColors[type]} hover:opacity-80 transition-opacity`}
            >
              <Plus size={14} />
              <span className="capitalize">{type}</span>
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-slate-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs px-2 py-1 rounded capitalize ${templateTypeColors[template.type]}`}>
                  {template.type}
                </span>
                <button
                  onClick={() => deleteTemplate(template.id)}
                  className="p-1 text-slate-500 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <EditableField
                value={template.name}
                onChange={(name) => updateTemplate(template.id, { name })}
                className="font-medium mb-2"
              />

              <div className="flex items-center gap-2">
                <EditableField
                  value={template.url}
                  onChange={(url) => updateTemplate(template.id, { url })}
                  placeholder="Link to template..."
                  className="text-xs text-slate-500 flex-1"
                />
                {template.url && (
                  <a
                    href={template.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-slate-500 hover:text-teal-600"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* AI Prompts Section */}
      <Section
        title="AI Prompts & Technical Docs"
        description="System prompts and technical documentation for the AI agent"
        icon={<Bot size={20} />}
        defaultExpanded={true}
      >
        <div className="space-y-4">
          {/* Meditation Agent System Prompt */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                  <Bot size={20} className="text-cyan-600" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">Meditation Agent System Prompt</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    The main conversational AI prompt that powers the meditation guide.
                    Controls response length, trigger phrases, and conversation style.
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    Source: <code className="bg-slate-100 px-1 rounded">src/lib/agent/MeditationAgent.ts</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => downloadTextFile(MEDITATION_AGENT_SYSTEM_PROMPT, 'inrvo-system-prompt.txt')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-lg hover:from-cyan-600 hover:to-teal-600 transition-all shadow-sm"
              >
                <Download size={16} />
                <span className="text-sm font-medium">Download</span>
              </button>
            </div>
          </div>

          {/* Preview of prompt */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-slate-700 mb-2">Quick Preview</h5>
            <div className="text-xs text-slate-600 font-mono bg-white p-3 rounded border border-slate-200 max-h-48 overflow-y-auto whitespace-pre-wrap">
              {MEDITATION_AGENT_SYSTEM_PROMPT.slice(0, 800)}...
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

// Asset Card Component
interface AssetCardProps {
  key?: React.Key;
  asset: Asset;
  onUpdate: (updates: Partial<Asset>) => void;
  onDelete: () => void;
}

function AssetCard({ asset, onUpdate, onDelete }: AssetCardProps) {
  const Icon = assetTypeIcons[asset.type];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
          <Icon size={20} className="text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <EditableField
            value={asset.name}
            onChange={(name) => onUpdate({ name })}
            className="font-medium"
          />
          <div className="flex items-center gap-2 mt-2">
            <EditableField
              value={asset.url}
              onChange={(url) => onUpdate({ url })}
              placeholder="Link to asset..."
              className="text-xs text-slate-500 flex-1"
            />
            {asset.url && (
              <a
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-slate-500 hover:text-teal-600"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
        <button onClick={onDelete} className="p-1 text-slate-500 hover:text-red-400">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
