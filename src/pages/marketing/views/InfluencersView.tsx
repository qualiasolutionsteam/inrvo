import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Building2, Instagram, Plus, X, Star, MapPin, Globe, Mail, Sparkles } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { useInfluencers, usePartnerships } from '../../../hooks/useMarketingData';
import { suggestInfluencer, suggestPartnership } from '../../../lib/marketingSupabase';
import type { MarketingInfluencer, InfluencerStatus } from '../../../types/marketing';

// Influencer prospects data from research
const influencerProspects = [
  { name: 'Amanda Gloria Valdes', handle: 'amandagloriayoga', followers: '15.6K', tags: ['Meditation', 'Yoga'], focus: 'Meditation, yoga, pilates, and sound healing education. Perfect fit for Innrvo\'s guided meditation and voice synthesis features.', location: 'USA', priority: 1 },
  { name: 'Giuseppe Jay Moschella', handle: 'thathappyitalian', followers: '19.4K', tags: ['Mindfulness', 'Yoga'], focus: 'Finding happiness through NLP coaching, yoga, and mindfulness practices. Engaged community focused on mental wellness.', priority: 2 },
  { name: 'Lindsay Rose', handle: 'lindsayrose', followers: '18K', tags: ['Mindfulness', 'Manifestation'], focus: 'Manifestation coaching, self-awareness, and mindfulness practices. Great audience overlap with meditation app users.', priority: 3 },
  { name: 'Mandy Flannery', handle: 'thetealyogistudio', followers: '16.2K', tags: ['Yoga', 'Mindfulness'], focus: 'Healing after trauma, empowerment through yoga and mindfulness practices. Strong engagement with wellness-focused community.', location: 'USA', website: 'thetealyogi.com', priority: 4 },
  { name: 'Andrea T Ferretti', handle: 'andreaferretti', followers: '15.7K', tags: ['Wellness', 'Yoga'], focus: 'Wellness podcast hosting, neurodiversity advocacy, and yoga instruction. Podcast audience could be converted to app users.', website: 'jasonyoga.com/blog', priority: 5 },
  { name: 'Martina', handle: 'martina1qigong1yoga', followers: '12.8K', tags: ['Mindfulness', 'Qigong'], focus: 'Qigong, yoga, and Reiki master. Teaches mindfulness techniques and energy work - aligns well with meditation app use cases.', priority: 6 },
  { name: 'Taylor White', handle: 'yogini.taylor', followers: '12.6K', tags: ['Yoga', 'Mindfulness'], focus: 'Yoga practice, motherhood, and mindfulness techniques. Engaged mom community - potential for sleep/stress meditation content.', location: 'Vancouver, BC', priority: 7 },
  { name: 'Alexandra Fratella Thurston', handle: 'alexandrafratella', followers: '12.2K', tags: ['Breathwork', 'Wellness'], focus: 'Empowerment through movement and breath, wellness lifestyle. Breathwork focus aligns perfectly with Innrvo\'s breathing meditation features.', priority: 8 },
  { name: 'Silvia Mordini', handle: 'inspiredyogagal', followers: '11.7K', tags: ['Mental Health', 'Yoga'], focus: 'Mental health therapy, yoga teacher training, and mindfulness retreats. Professional background adds credibility.', location: 'Tuscany, Bali, USA', website: 'silviamordini.com' },
  { name: 'Gabriela Bozic', handle: 'gabriela.bozic', followers: '10.7K', tags: ['Yoga', 'Mindfulness'], focus: 'Yoga instruction, self-regulation, and mindfulness teacher training. Trains other teachers - could multiply reach.', location: 'Mallorca', website: 'gabrielabozic.com' },
  { name: 'Amina Agerman', handle: 'ellenaminayoga', followers: '10.5K', tags: ['Mindfulness', 'Yoga'], focus: 'Mindful movement, mindful living, and finding flow in life. Content style matches Innrvo\'s calm, centered brand voice.' },
  { name: 'The Good Body', handle: 'thegoodbodydotcom', followers: '8.7K', tags: ['Mindfulness', 'Wellness'], focus: 'Mindfulness research, yoga poses for stress and anxiety, meditation practices. Content-focused account with educational angle.', website: 'thegoodbody.com', email: 'contact@thegoodbody.com' },
  { name: 'Alex Dawson', handle: 'alexdawsonyoga', followers: '6.4K', tags: ['Meditation', 'Yoga'], focus: 'Yoga and meditation teaching with 20+ years experience. Credibility and experience make for authentic partnership potential.' },
  { name: 'Jorden Jones', handle: 'reallyjayyoh', followers: '5K+', tags: ['Mindfulness', 'Mental Health'], focus: 'Prioritizing peace, self-awareness, mental wellness practices. Authentic voice resonates with younger meditation audience.', location: 'New York, USA' },
  { name: 'Dalis Freixa', handle: 'realdalisg', followers: '5K+', tags: ['Mindfulness', 'Spirituality'], focus: 'Spiritual mentoring, grounding practices, daily self-improvement. Good for guided journey and hypnosis content promotion.', location: 'Florida, USA' },
];

const tagColors: Record<string, string> = {
  'Meditation': 'bg-violet-500/20 text-violet-300',
  'Yoga': 'bg-emerald-500/20 text-emerald-300',
  'Breathwork': 'bg-sky-500/20 text-sky-300',
  'Mindfulness': 'bg-amber-500/20 text-amber-300',
  'Mental Health': 'bg-pink-500/20 text-pink-300',
  'Wellness': 'bg-teal-500/20 text-teal-300',
  'Manifestation': 'bg-purple-500/20 text-purple-300',
  'Qigong': 'bg-indigo-500/20 text-indigo-300',
  'Spirituality': 'bg-rose-500/20 text-rose-300',
};

const statusOrder: InfluencerStatus[] = ['researching', 'contacted', 'negotiating', 'agreed', 'content_live', 'completed'];

const statusLabels: Record<InfluencerStatus, string> = {
  researching: 'Researching',
  contacted: 'Contacted',
  negotiating: 'Negotiating',
  agreed: 'Agreed',
  content_live: 'Content Live',
  completed: 'Completed',
  declined: 'Declined',
};

interface SuggestionModalProps {
  type: 'influencer' | 'partnership';
  onClose: () => void;
  onSubmit: () => void;
}

const SuggestionModal: React.FC<SuggestionModalProps> = ({ type, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [partnerType, setPartnerType] = useState('community');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      if (type === 'influencer') {
        await suggestInfluencer({
          name: name.trim(),
          handle: handle.trim() || undefined,
          platform,
          notes: notes.trim() || undefined,
        });
      } else {
        await suggestPartnership({
          organization_name: name.trim(),
          partnership_type: partnerType,
          notes: notes.trim() || undefined,
        });
      }
      onSubmit();
      onClose();
    } catch (error) {
      console.error('Failed to submit suggestion:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = "w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/30";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-md glass-elevated rounded-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Suggest {type === 'influencer' ? 'an Influencer' : 'a Partnership'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1">
              {type === 'influencer' ? 'Name' : 'Organization Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={type === 'influencer' ? 'e.g., Jane Doe' : 'e.g., Mindful Living Podcast'}
              className={inputClasses}
              required
            />
          </div>

          {type === 'influencer' && (
            <>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1">Handle (optional)</label>
                <input type="text" value={handle} onChange={e => setHandle(e.target.value)} placeholder="@username" className={inputClasses} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1">Platform</label>
                <select value={platform} onChange={e => setPlatform(e.target.value)} className={inputClasses}>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                  <option value="twitter">Twitter/X</option>
                  <option value="multiple">Multiple</option>
                </select>
              </div>
            </>
          )}

          {type === 'partnership' && (
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-1">Partnership Type</label>
              <select value={partnerType} onChange={e => setPartnerType(e.target.value)} className={inputClasses}>
                <option value="community">Community</option>
                <option value="affiliate">Affiliate</option>
                <option value="cross_promotion">Cross Promotion</option>
                <option value="integration">Integration</option>
                <option value="media">Media</option>
                <option value="event">Event</option>
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Why do you think this would be a good fit?" className={`${inputClasses} resize-none`} rows={3} />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="w-full bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-400 hover:to-violet-400 disabled:opacity-50 text-white py-2.5 px-4 rounded-xl text-sm font-medium transition-all"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Suggestion'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

const InfluencerCard: React.FC<{ influencer: MarketingInfluencer }> = ({ influencer }) => {
  const formatFollowers = (count: number | null) => {
    if (!count) return 'N/A';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06] hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-sm font-semibold text-white">{influencer.name}</h4>
          {influencer.handle && (
            <p className="text-xs text-sky-400">@{influencer.handle}</p>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400 bg-white/[0.05] px-2 py-1 rounded-full border border-white/[0.06]">
          <Instagram className="w-3 h-3" />
          {formatFollowers(influencer.follower_count)}
        </div>
      </div>
      {influencer.niche && (
        <p className="text-xs text-emerald-400 mb-2 font-medium">{influencer.niche}</p>
      )}
      {influencer.notes && (
        <p className="text-xs text-slate-500 line-clamp-2">{influencer.notes}</p>
      )}
    </div>
  );
};

const InfluencersView: React.FC = () => {
  const { byStatus, isLoading: influencersLoading, refetch: refetchInfluencers } = useInfluencers();
  const { partnerships, isLoading: partnershipsLoading, refetch: refetchPartnerships } = usePartnerships();
  const [showSuggestionModal, setShowSuggestionModal] = useState<'influencer' | 'partnership' | null>(null);
  const [activeProspectFilter, setActiveProspectFilter] = useState<string>('all');

  const isLoading = influencersLoading || partnershipsLoading;

  const handleSuggestionSubmit = () => {
    refetchInfluencers();
    refetchPartnerships();
  };

  const filteredProspects = activeProspectFilter === 'all'
    ? influencerProspects
    : influencerProspects.filter(p => p.tags.some(t => t.toLowerCase().includes(activeProspectFilter.toLowerCase())));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Users className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-slate-400 font-medium">Loading influencers...</p>
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent" />
        </motion.div>
      </div>
    );
  }

  const activeStatuses = statusOrder.filter(status => (byStatus[status]?.length || 0) > 0);

  return (
    <div className="space-y-8">
      {/* Prospect List Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="glass rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/10">
                <Sparkles className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Influencer Prospects</h2>
                <p className="text-xs sm:text-sm text-slate-500">Meditation & Wellness Micro-Influencers (5K-20K Followers)</p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="px-3 py-1.5 bg-violet-500/20 text-violet-300 rounded-full font-semibold">{influencerProspects.length}</span>
                <span className="text-slate-500 hidden sm:inline">Total</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-full font-semibold">8</span>
                <span className="text-slate-500 hidden sm:inline">Priority</span>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {['all', 'meditation', 'yoga', 'breathwork', 'mindfulness', 'mental health'].map(filter => (
              <button
                key={filter}
                onClick={() => setActiveProspectFilter(filter)}
                className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  activeProspectFilter === filter
                    ? 'bg-gradient-to-r from-sky-500 to-violet-500 text-white shadow-lg'
                    : 'bg-white/[0.05] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          {/* Prospects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {filteredProspects.map((prospect, index) => (
              <motion.div
                key={prospect.handle}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`p-4 rounded-xl border transition-all hover:border-sky-500/20 ${
                  prospect.priority ? 'border-emerald-500/20 bg-emerald-500/[0.03]' : 'border-white/[0.06] bg-white/[0.02]'
                }`}
              >
                {prospect.priority && (
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">Priority #{prospect.priority}</span>
                  </div>
                )}
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-white text-sm">{prospect.name}</h4>
                  <span className="text-xs font-bold bg-gradient-to-r from-sky-500 to-violet-500 text-white px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                    {prospect.followers}
                  </span>
                </div>
                <a
                  href={`https://instagram.com/${prospect.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-sky-400 hover:text-sky-300 hover:underline mb-3 block"
                >
                  @{prospect.handle}
                </a>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {prospect.tags.map(tag => (
                    <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium ${tagColors[tag] || 'bg-white/[0.05] text-slate-400'}`}>
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mb-3 line-clamp-2">{prospect.focus}</p>
                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  {prospect.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {prospect.location}
                    </span>
                  )}
                  {prospect.website && (
                    <a href={`https://${prospect.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sky-400 hover:underline">
                      <Globe className="w-3 h-3" />
                      {prospect.website}
                    </a>
                  )}
                  {prospect.email && (
                    <a href={`mailto:${prospect.email}`} className="flex items-center gap-1 text-sky-400 hover:underline">
                      <Mail className="w-3 h-3" />
                      Email
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Outreach Strategy */}
          <div className="mt-6 p-5 bg-white/[0.02] rounded-xl border border-white/[0.06]">
            <h3 className="text-lg font-semibold text-sky-400 mb-3">Outreach Strategy</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-sky-500 font-bold mt-0.5">-</span>
                <span><strong className="text-white">Pitch Angle:</strong> "Create personalized guided meditations with YOUR voice" - unique AI voice cloning feature</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-500 font-bold mt-0.5">-</span>
                <span><strong className="text-white">Offer:</strong> Free premium account + affiliate commission (15-20%) on referrals</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-500 font-bold mt-0.5">-</span>
                <span><strong className="text-white">Content Ideas:</strong> "Creating my own meditation with AI" reels, voice cloning demo, before/after stress relief</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-500 font-bold mt-0.5">-</span>
                <span><strong className="text-white">Best Matches:</strong> Breathwork creators (Alexandra, Giuseppe), Sound healing (Amanda), Mental health (Silvia, Nicole)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-500 font-bold mt-0.5">-</span>
                <span><strong className="text-white">Timing:</strong> January-March is peak "new year wellness" season - act fast</span>
              </li>
            </ul>
          </div>
        </div>
      </motion.section>

      {/* Influencer Pipeline */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500" />
            <h2 className="text-xl font-bold text-white">Active Pipeline</h2>
          </div>
          <button
            onClick={() => setShowSuggestionModal('influencer')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-sm font-medium rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            Add to Pipeline
          </button>
        </div>

        {activeStatuses.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No influencers in pipeline yet</p>
            <p className="text-sm text-slate-500 mt-1">Influencers will appear here as they are added</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4 -mx-3 px-3 no-scrollbar">
            <div className="flex gap-4 min-w-max">
              {statusOrder.map(status => {
                const items = byStatus[status] || [];
                if (items.length === 0 && status !== 'researching' && status !== 'contacted') return null;

                return (
                  <div key={status} className="w-72 flex-shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-400">{statusLabels[status]}</h3>
                      <span className="text-xs bg-white/[0.05] text-slate-400 px-2.5 py-1 rounded-full font-medium">
                        {items.length}
                      </span>
                    </div>
                    <div className="glass rounded-2xl p-3 min-h-[200px]">
                      <div className="space-y-2">
                        {items.map(inf => (
                          <InfluencerCard key={inf.id} influencer={inf} />
                        ))}
                        {items.length === 0 && (
                          <div className="text-center py-8 text-slate-600 text-xs">
                            No influencers
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.section>

      {/* Partnerships */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full bg-gradient-to-b from-fuchsia-500 to-purple-500" />
            <h2 className="text-xl font-bold text-white">Partnership Opportunities</h2>
          </div>
          <button
            onClick={() => setShowSuggestionModal('partnership')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-fuchsia-500 to-purple-500 hover:from-fuchsia-400 hover:to-purple-400 text-white text-sm font-medium rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            Suggest Partnership
          </button>
        </div>

        {partnerships.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No partnerships tracked yet</p>
            <p className="text-sm text-slate-500 mt-1">Partnerships will appear here as they are identified</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {partnerships.map(partner => (
              <div key={partner.id} className="glass rounded-2xl p-5 hover:border-sky-500/20 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white">{partner.organization_name}</h3>
                    <p className="text-sm text-slate-500 mt-0.5 capitalize">
                      {partner.partnership_type?.replace(/_/g, ' ') || 'TBD'}
                    </p>
                    {partner.value_proposition && (
                      <p className="text-sm text-slate-400 mt-2">{partner.value_proposition}</p>
                    )}
                  </div>
                  <StatusBadge status={partner.status} size="sm" />
                </div>
                {partner.contact_name && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06] text-sm text-slate-500">
                    Contact: <span className="font-medium text-slate-300">{partner.contact_name}</span>
                    {partner.contact_email && <span> - {partner.contact_email}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.section>

      {/* Suggestion Modal */}
      <AnimatePresence>
        {showSuggestionModal && (
          <SuggestionModal
            type={showSuggestionModal}
            onClose={() => setShowSuggestionModal(null)}
            onSubmit={handleSuggestionSubmit}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default InfluencersView;
