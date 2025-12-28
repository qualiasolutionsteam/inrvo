import React, { useState } from 'react';
import { Plus, DollarSign, Calendar, Users, TrendingUp, Trash2, Award, Play, Pause } from 'lucide-react';
import { Section, SectionGrid } from '../components/Section';
import { EditableField, EditableNumber } from '../components/EditableField';
import { StatusSelect } from '../components/StatusBadge';
import { AttributionBadge } from '../components/AttributionBadge';
import {
  MarketingHubData,
  Campaign,
  CalendarItem,
  BacklogItem,
  Influencer,
  Platform,
  ContentType,
  CampaignStatus,
  SocialContentStatus,
  BacklogStatus,
  InfluencerStatus,
} from '../types';
import { generateId } from '../data/initialData';
import { useMarketingUser } from '../contexts/MarketingUserContext';
import { createAttribution, updateAttribution } from '../utils/attribution';

interface Phase2ValidationProps {
  data: MarketingHubData['phase2'];
  onUpdate: (updates: Partial<MarketingHubData['phase2']>) => void;
}

const platformColors: Record<Platform, string> = {
  meta: 'bg-blue-500/20 text-blue-600',
  tiktok: 'bg-pink-500/20 text-pink-600',
  google: 'bg-red-500/20 text-red-600',
  youtube: 'bg-red-500/20 text-red-600',
  instagram: 'bg-purple-500/20 text-purple-600',
  twitter: 'bg-sky-500/20 text-sky-600',
};

const creativeAngles = [
  'Pain point focus',
  'Benefit-driven',
  'Testimonial/Social proof',
  'Fear of missing out',
  'Educational/How-to',
  'Transformation story',
  'Custom',
];

export function Phase2Validation({ data, onUpdate }: Phase2ValidationProps) {
  const { paidAcquisition, organicContent, influencers } = data;
  const { email } = useMarketingUser();

  // Campaign helpers
  const addCampaign = () => {
    const newCampaign: Campaign = {
      id: generateId(),
      name: 'New Campaign',
      platform: 'meta',
      audience: '',
      creativeAngle: 'Pain point focus',
      customAngle: '',
      budget: 100,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      status: 'planning',
      impressions: 0,
      clicks: 0,
      conversions: 0,
      roas: 0,
      notes: '',
      isWinner: false,
      attribution: createAttribution(email),
    };
    onUpdate({
      paidAcquisition: {
        ...paidAcquisition,
        campaigns: [...paidAcquisition.campaigns, newCampaign],
      },
    });
  };

  const updateCampaign = (id: string, updates: Partial<Campaign>) => {
    const campaigns = paidAcquisition.campaigns.map((c) =>
      c.id === id ? { ...c, ...updates, attribution: updateAttribution(c.attribution, email) } : c
    );
    onUpdate({
      paidAcquisition: { ...paidAcquisition, campaigns },
    });
  };

  const deleteCampaign = (id: string) => {
    onUpdate({
      paidAcquisition: {
        ...paidAcquisition,
        campaigns: paidAcquisition.campaigns.filter((c) => c.id !== id),
      },
    });
  };

  // Calendar helpers
  const addCalendarItem = () => {
    const newItem: CalendarItem = {
      id: generateId(),
      date: new Date().toISOString().split('T')[0],
      platform: 'instagram',
      contentType: 'reel',
      hook: '',
      status: 'idea',
      performance: { views: 0, engagement: 0 },
      attribution: createAttribution(email),
    };
    onUpdate({
      organicContent: {
        ...organicContent,
        calendar: [...organicContent.calendar, newItem],
      },
    });
  };

  const updateCalendarItem = (id: string, updates: Partial<CalendarItem>) => {
    const calendar = organicContent.calendar.map((item) =>
      item.id === id ? { ...item, ...updates, attribution: updateAttribution(item.attribution, email) } : item
    );
    onUpdate({
      organicContent: { ...organicContent, calendar },
    });
  };

  const deleteCalendarItem = (id: string) => {
    onUpdate({
      organicContent: {
        ...organicContent,
        calendar: organicContent.calendar.filter((item) => item.id !== id),
      },
    });
  };

  // Backlog helpers
  const addBacklogItem = () => {
    const newItem: BacklogItem = {
      id: generateId(),
      title: 'New Content Idea',
      concept: '',
      status: 'ideas',
      platform: 'instagram',
      priority: organicContent.backlog.length + 1,
      attribution: createAttribution(email),
    };
    onUpdate({
      organicContent: {
        ...organicContent,
        backlog: [...organicContent.backlog, newItem],
      },
    });
  };

  const updateBacklogItem = (id: string, updates: Partial<BacklogItem>) => {
    const backlog = organicContent.backlog.map((item) =>
      item.id === id ? { ...item, ...updates, attribution: updateAttribution(item.attribution, email) } : item
    );
    onUpdate({
      organicContent: { ...organicContent, backlog },
    });
  };

  const deleteBacklogItem = (id: string) => {
    onUpdate({
      organicContent: {
        ...organicContent,
        backlog: organicContent.backlog.filter((item) => item.id !== id),
      },
    });
  };

  // Influencer helpers
  const addInfluencer = () => {
    const newInfluencer: Influencer = {
      id: generateId(),
      name: 'New Influencer',
      platform: 'instagram',
      followers: '',
      niche: '',
      status: 'researching',
      contentLink: '',
      performance: '',
      cost: '',
      notes: '',
      attribution: createAttribution(email),
    };
    onUpdate({ influencers: [...influencers, newInfluencer] });
  };

  const updateInfluencer = (id: string, updates: Partial<Influencer>) => {
    const updated = influencers.map((inf) => (inf.id === id ? { ...inf, ...updates, attribution: updateAttribution(inf.attribution, email) } : inf));
    onUpdate({ influencers: updated });
  };

  const deleteInfluencer = (id: string) => {
    onUpdate({
      influencers: influencers.filter((inf) => inf.id !== id),
    });
  };

  // Calculate metrics
  const totalSpend = paidAcquisition.campaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalConversions = paidAcquisition.campaigns.reduce((sum, c) => sum + c.conversions, 0);
  const avgROAS =
    paidAcquisition.campaigns.length > 0
      ? paidAcquisition.campaigns.reduce((sum, c) => sum + c.roas, 0) / paidAcquisition.campaigns.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Paid Acquisition Section */}
      <Section
        title="Paid Acquisition Tests"
        description="Test small budgets across platforms to find winning combinations"
        icon={<DollarSign size={20} />}
        defaultExpanded={true}
      >
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-slate-600">Total Budget</div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
              <span className="text-lg sm:text-xl font-bold text-slate-900">${paidAcquisition.totalBudget}</span>
              <EditableNumber
                value={paidAcquisition.totalBudget}
                onChange={(v) => onUpdate({ paidAcquisition: { ...paidAcquisition, totalBudget: v } })}
                className="text-xs text-slate-500"
                prefix="Set: $"
              />
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-slate-600">Total Spend</div>
            <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1">${totalSpend}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-slate-600">Conversions</div>
            <div className="text-lg sm:text-xl font-bold text-teal-600 mt-1">{totalConversions}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-slate-600">Avg ROAS</div>
            <div className="text-lg sm:text-xl font-bold text-amber-600 mt-1">{avgROAS.toFixed(2)}x</div>
          </div>
        </div>

        {/* Campaign Cards */}
        <div className="space-y-4">
          {paidAcquisition.campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onUpdate={(updates) => updateCampaign(campaign.id, updates)}
              onDelete={() => deleteCampaign(campaign.id)}
            />
          ))}

          <button
            onClick={addCampaign}
            className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:border-slate-500 transition-colors"
          >
            <Plus size={20} />
            Add Campaign Test
          </button>
        </div>
      </Section>

      {/* Organic Content Section */}
      <Section
        title="Organic Content Calendar"
        description="Plan and track your content across platforms"
        icon={<Calendar size={20} />}
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Content Calendar */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-slate-900">Scheduled Content</h4>
              <button
                onClick={addCalendarItem}
                className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-500"
              >
                <Plus size={16} />
                Add
              </button>
            </div>
            <div className="space-y-3">
              {organicContent.calendar.map((item) => (
                <ContentCalendarCard
                  key={item.id}
                  item={item}
                  onUpdate={(updates) => updateCalendarItem(item.id, updates)}
                  onDelete={() => deleteCalendarItem(item.id)}
                />
              ))}
              {organicContent.calendar.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">No scheduled content yet</p>
              )}
            </div>
          </div>

          {/* Content Backlog */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-slate-900">Content Backlog</h4>
              <button
                onClick={addBacklogItem}
                className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-500"
              >
                <Plus size={16} />
                Add
              </button>
            </div>
            <div className="space-y-3">
              {organicContent.backlog.map((item) => (
                <BacklogCard
                  key={item.id}
                  item={item}
                  onUpdate={(updates) => updateBacklogItem(item.id, updates)}
                  onDelete={() => deleteBacklogItem(item.id)}
                />
              ))}
              {organicContent.backlog.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">No content ideas yet</p>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Influencer Tracking Section */}
      <Section
        title="Influencer Tracking"
        description="Research and track influencer partnerships"
        icon={<Users size={20} />}
        defaultExpanded={true}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-2 text-slate-500 font-medium">Name</th>
                <th className="text-left py-3 px-2 text-slate-500 font-medium">Platform</th>
                <th className="text-left py-3 px-2 text-slate-500 font-medium">Followers</th>
                <th className="text-left py-3 px-2 text-slate-500 font-medium">Niche</th>
                <th className="text-left py-3 px-2 text-slate-500 font-medium">Status</th>
                <th className="text-left py-3 px-2 text-slate-500 font-medium">Cost</th>
                <th className="text-left py-3 px-2 text-slate-500 font-medium">Performance</th>
                <th className="text-right py-3 px-2 text-slate-500 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {influencers.map((influencer) => (
                <InfluencerRow
                  key={influencer.id}
                  influencer={influencer}
                  onUpdate={(updates) => updateInfluencer(influencer.id, updates)}
                  onDelete={() => deleteInfluencer(influencer.id)}
                />
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={addInfluencer}
          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:border-slate-500 transition-colors mt-4"
        >
          <Plus size={20} />
          Add Influencer
        </button>
      </Section>
    </div>
  );
}

// Campaign Card Component
interface CampaignCardProps {
  key?: React.Key;
  campaign: Campaign;
  onUpdate: (updates: Partial<Campaign>) => void;
  onDelete: () => void;
}

function CampaignCard({ campaign, onUpdate, onDelete }: CampaignCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColors: Record<CampaignStatus, string> = {
    planning: 'border-slate-400',
    active: 'border-green-500',
    paused: 'border-amber-500',
    complete: 'border-teal-500',
  };

  const ctr = campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) : '0.00';
  const convRate = campaign.clicks > 0 ? ((campaign.conversions / campaign.clicks) * 100).toFixed(2) : '0.00';

  return (
    <div className={`border-l-4 ${statusColors[campaign.status]} bg-white rounded-lg overflow-hidden shadow-sm`}>
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 cursor-pointer hover:bg-slate-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <EditableField
              value={campaign.name}
              onChange={(name) => onUpdate({ name })}
              className="font-medium text-slate-900 text-sm sm:text-base"
              onClick={(e) => e.stopPropagation()}
            />
            {campaign.isWinner && (
              <Award size={16} className="text-amber-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded text-xs ${platformColors[campaign.platform]}`}>
              {campaign.platform}
            </span>
            <span className="text-slate-600 text-xs sm:text-sm">${campaign.budget}</span>
          </div>
        </div>

        {/* Stats - responsive grid */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
          <div className="text-center">
            <div className="text-slate-500">CTR</div>
            <div className="text-slate-900 font-medium">{ctr}%</div>
          </div>
          <div className="text-center">
            <div className="text-slate-500">Conv</div>
            <div className="text-slate-900 font-medium">{convRate}%</div>
          </div>
          <div className="text-center">
            <div className="text-slate-500">ROAS</div>
            <div className={`font-medium ${campaign.roas >= 2 ? 'text-teal-600' : campaign.roas >= 1 ? 'text-amber-600' : 'text-red-500'}`}>
              {campaign.roas.toFixed(2)}x
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2" onClick={(e) => e.stopPropagation()}>
          <StatusSelect
            value={campaign.status}
            onChange={(status) => onUpdate({ status: status as CampaignStatus })}
            options={['planning', 'active', 'paused', 'complete']}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ isWinner: !campaign.isWinner });
            }}
            className={`p-1.5 rounded ${campaign.isWinner ? 'text-amber-500 bg-amber-500/20' : 'text-slate-400 hover:text-amber-500'}`}
            title="Mark as winner"
          >
            <Award size={14} className="sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 text-slate-400 hover:text-red-500 rounded"
          >
            <Trash2 size={14} className="sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 sm:p-4 pt-0 border-t border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-3 sm:pt-4">
            {/* Platform */}
            <div>
              <label className="block text-sm text-slate-500 mb-1">Platform</label>
              <select
                value={campaign.platform}
                onChange={(e) => onUpdate({ platform: e.target.value as Platform })}
                className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-slate-900 text-sm"
              >
                <option value="meta">Meta</option>
                <option value="google">Google</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm text-slate-500 mb-1">Budget</label>
              <EditableNumber
                value={campaign.budget}
                onChange={(budget) => onUpdate({ budget })}
                prefix="$"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm text-slate-500 mb-1">Start Date</label>
              <input
                type="date"
                value={campaign.startDate}
                onChange={(e) => onUpdate({ startDate: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-slate-900 text-sm"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm text-slate-500 mb-1">End Date</label>
              <input
                type="date"
                value={campaign.endDate}
                onChange={(e) => onUpdate({ endDate: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-slate-900 text-sm"
              />
            </div>

            {/* Audience */}
            <div className="col-span-2">
              <label className="block text-sm text-slate-500 mb-1">Target Audience</label>
              <EditableField
                value={campaign.audience}
                onChange={(audience) => onUpdate({ audience })}
                placeholder="e.g., Women 25-45, interested in wellness"
              />
            </div>

            {/* Creative Angle */}
            <div className="col-span-2">
              <label className="block text-sm text-slate-500 mb-1">Creative Angle</label>
              <select
                value={campaign.creativeAngle}
                onChange={(e) => onUpdate({ creativeAngle: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-slate-900 text-sm"
              >
                {creativeAngles.map((angle) => (
                  <option key={angle} value={angle}>
                    {angle}
                  </option>
                ))}
              </select>
              {campaign.creativeAngle === 'Custom' && (
                <EditableField
                  value={campaign.customAngle}
                  onChange={(customAngle) => onUpdate({ customAngle })}
                  placeholder="Describe your custom angle..."
                  className="mt-2"
                />
              )}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Impressions</label>
              <EditableNumber
                value={campaign.impressions}
                onChange={(impressions) => onUpdate({ impressions })}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Clicks</label>
              <EditableNumber
                value={campaign.clicks}
                onChange={(clicks) => onUpdate({ clicks })}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Conversions</label>
              <EditableNumber
                value={campaign.conversions}
                onChange={(conversions) => onUpdate({ conversions })}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">ROAS</label>
              <EditableNumber
                value={campaign.roas}
                onChange={(roas) => onUpdate({ roas })}
                suffix="x"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label className="block text-sm text-slate-500 mb-1">Notes & Learnings</label>
            <EditableField
              value={campaign.notes}
              onChange={(notes) => onUpdate({ notes })}
              placeholder="What worked? What didn't? Key takeaways..."
              multiline
            />
          </div>

          {/* Attribution */}
          {campaign.attribution && (
            <div className="mt-4 pt-3 border-t border-slate-200">
              <AttributionBadge attribution={campaign.attribution} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Content Calendar Card Component
interface ContentCalendarCardProps {
  key?: React.Key;
  item: CalendarItem;
  onUpdate: (updates: Partial<CalendarItem>) => void;
  onDelete: () => void;
}

function ContentCalendarCard({ item, onUpdate, onDelete }: ContentCalendarCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="flex items-start gap-3">
        <input
          type="date"
          value={item.date}
          onChange={(e) => onUpdate({ date: e.target.value })}
          className="bg-white border border-slate-200 rounded px-2 py-1 text-sm text-slate-900"
        />
        <div className="flex-1 min-w-0">
          <EditableField
            value={item.hook}
            onChange={(hook) => onUpdate({ hook })}
            placeholder="Content hook/title..."
            className="font-medium"
          />
          <div className="flex items-center gap-2 mt-2">
            <select
              value={item.platform}
              onChange={(e) => onUpdate({ platform: e.target.value as Platform })}
              className={`text-xs rounded px-2 py-1 ${platformColors[item.platform]}`}
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="twitter">Twitter</option>
            </select>
            <select
              value={item.contentType}
              onChange={(e) => onUpdate({ contentType: e.target.value as ContentType })}
              className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-1"
            >
              <option value="reel">Reel</option>
              <option value="tiktok">TikTok</option>
              <option value="carousel">Carousel</option>
              <option value="story">Story</option>
              <option value="post">Post</option>
            </select>
            <StatusSelect
              value={item.status}
              onChange={(status) => onUpdate({ status: status as SocialContentStatus })}
              options={['idea', 'scripted', 'filmed', 'edited', 'posted']}
              className="text-xs"
            />
          </div>
        </div>
        <button onClick={onDelete} className="p-1 text-slate-500 hover:text-red-400">
          <Trash2 size={14} />
        </button>
      </div>
      {item.status === 'posted' && (
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200 text-sm">
          <div>
            <span className="text-slate-500">Views: </span>
            <EditableNumber
              value={item.performance.views}
              onChange={(views) => onUpdate({ performance: { ...item.performance, views } })}
              className="text-slate-900"
            />
          </div>
          <div>
            <span className="text-slate-500">Engagement: </span>
            <EditableNumber
              value={item.performance.engagement}
              onChange={(engagement) => onUpdate({ performance: { ...item.performance, engagement } })}
              suffix="%"
              className="text-slate-900"
            />
          </div>
        </div>
      )}
      {item.attribution && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <AttributionBadge attribution={item.attribution} compact />
        </div>
      )}
    </div>
  );
}

// Backlog Card Component
interface BacklogCardProps {
  key?: React.Key;
  item: BacklogItem;
  onUpdate: (updates: Partial<BacklogItem>) => void;
  onDelete: () => void;
}

function BacklogCard({ item, onUpdate, onDelete }: BacklogCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-xs text-slate-500">
          {item.priority}
        </div>
        <div className="flex-1 min-w-0">
          <EditableField
            value={item.title}
            onChange={(title) => onUpdate({ title })}
            className="font-medium"
          />
          <EditableField
            value={item.concept}
            onChange={(concept) => onUpdate({ concept })}
            placeholder="Brief concept description..."
            className="text-sm text-slate-500 mt-1"
          />
          <div className="flex items-center gap-2 mt-2">
            <select
              value={item.platform}
              onChange={(e) => onUpdate({ platform: e.target.value as Platform })}
              className={`text-xs rounded px-2 py-1 ${platformColors[item.platform]}`}
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="twitter">Twitter</option>
            </select>
            <StatusSelect
              value={item.status}
              onChange={(status) => onUpdate({ status: status as BacklogStatus })}
              options={['ideas', 'scripted', 'in_production', 'scheduled', 'posted', 'analyzed']}
              className="text-xs"
            />
          </div>
        </div>
        <button onClick={onDelete} className="p-1 text-slate-500 hover:text-red-400">
          <Trash2 size={14} />
        </button>
      </div>
      {item.attribution && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <AttributionBadge attribution={item.attribution} compact />
        </div>
      )}
    </div>
  );
}

// Influencer Row Component
interface InfluencerRowProps {
  key?: React.Key;
  influencer: Influencer;
  onUpdate: (updates: Partial<Influencer>) => void;
  onDelete: () => void;
}

function InfluencerRow({ influencer, onUpdate, onDelete }: InfluencerRowProps) {
  return (
    <tr className="border-b border-slate-200 hover:bg-white">
      <td className="py-3 px-2">
        <EditableField
          value={influencer.name}
          onChange={(name) => onUpdate({ name })}
          className="font-medium"
        />
      </td>
      <td className="py-3 px-2">
        <select
          value={influencer.platform}
          onChange={(e) => onUpdate({ platform: e.target.value as Platform })}
          className={`text-xs rounded px-2 py-1 ${platformColors[influencer.platform]}`}
        >
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="youtube">YouTube</option>
          <option value="twitter">Twitter</option>
        </select>
      </td>
      <td className="py-3 px-2">
        <EditableField
          value={influencer.followers}
          onChange={(followers) => onUpdate({ followers })}
          placeholder="e.g., 50K"
        />
      </td>
      <td className="py-3 px-2">
        <EditableField
          value={influencer.niche}
          onChange={(niche) => onUpdate({ niche })}
          placeholder="e.g., Wellness"
        />
      </td>
      <td className="py-3 px-2">
        <StatusSelect
          value={influencer.status}
          onChange={(status) => onUpdate({ status: status as InfluencerStatus })}
          options={['researching', 'contacted', 'negotiating', 'agreed', 'content_live', 'complete']}
        />
      </td>
      <td className="py-3 px-2">
        <EditableField
          value={influencer.cost}
          onChange={(cost) => onUpdate({ cost })}
          placeholder="$500"
        />
      </td>
      <td className="py-3 px-2">
        <EditableField
          value={influencer.performance}
          onChange={(performance) => onUpdate({ performance })}
          placeholder="Results..."
        />
      </td>
      <td className="py-3 px-2 text-right">
        <div className="flex items-center justify-end gap-2">
          {influencer.attribution && (
            <AttributionBadge attribution={influencer.attribution} compact />
          )}
          <button onClick={onDelete} className="p-1 text-slate-500 hover:text-red-400">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
