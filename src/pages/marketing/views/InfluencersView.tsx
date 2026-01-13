import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Building2, Instagram, ExternalLink, Plus, X } from 'lucide-react';
import GlassCard from '../../../../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import { useInfluencers, usePartnerships } from '../../../hooks/useMarketingData';
import { suggestInfluencer, suggestPartnership } from '../../../lib/marketingSupabase';
import type { MarketingInfluencer, MarketingPartnership, InfluencerStatus } from '../../../types/marketing';

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Suggest {type === 'influencer' ? 'an Influencer' : 'a Partnership'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1">
              {type === 'influencer' ? 'Name' : 'Organization Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={type === 'influencer' ? 'e.g., Jane Doe' : 'e.g., Mindful Living Podcast'}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              required
            />
          </div>

          {type === 'influencer' && (
            <>
              <div>
                <label className="text-sm text-slate-400 block mb-1">Handle (optional)</label>
                <input
                  type="text"
                  value={handle}
                  onChange={e => setHandle(e.target.value)}
                  placeholder="@username"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1">Platform</label>
                <select
                  value={platform}
                  onChange={e => setPlatform(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                >
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
              <label className="text-sm text-slate-400 block mb-1">Partnership Type</label>
              <select
                value={partnerType}
                onChange={e => setPartnerType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              >
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
            <label className="text-sm text-slate-400 block mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Why do you think this would be a good fit?"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
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
    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-sm font-medium text-white">{influencer.name}</h4>
          {influencer.handle && (
            <p className="text-xs text-slate-400">@{influencer.handle}</p>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Instagram className="w-3 h-3" />
          {formatFollowers(influencer.follower_count)}
        </div>
      </div>
      {influencer.niche && (
        <p className="text-xs text-sky-500 mb-2">{influencer.niche}</p>
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

  const isLoading = influencersLoading || partnershipsLoading;

  const handleSuggestionSubmit = () => {
    refetchInfluencers();
    refetchPartnerships();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  const activeStatuses = statusOrder.filter(status => (byStatus[status]?.length || 0) > 0);

  return (
    <div className="space-y-8">
      {/* Influencer Pipeline */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-500" />
            Influencer Pipeline
          </h2>
          <button
            onClick={() => setShowSuggestionModal('influencer')}
            className="flex items-center gap-2 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Suggest
          </button>
        </div>

        {activeStatuses.length === 0 ? (
          <GlassCard className="!p-8 text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No influencers in pipeline yet</p>
            <p className="text-sm text-slate-500 mt-1">Influencers will appear here as they are identified</p>
          </GlassCard>
        ) : (
          <div className="overflow-x-auto pb-4 -mx-3 px-3">
            <div className="flex gap-4 min-w-max">
              {statusOrder.map(status => {
                const items = byStatus[status] || [];
                if (items.length === 0 && status !== 'researching' && status !== 'contacted') return null;

                return (
                  <div key={status} className="w-64 flex-shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-slate-400">{statusLabels[status]}</h3>
                      <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                        {items.length}
                      </span>
                    </div>
                    <div className="space-y-2 min-h-[200px] bg-slate-800/30 rounded-xl p-2 border border-slate-700/30">
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
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Partnerships */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-500" />
            Partnership Opportunities
          </h2>
          <button
            onClick={() => setShowSuggestionModal('partnership')}
            className="flex items-center gap-2 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Suggest
          </button>
        </div>

        {partnerships.length === 0 ? (
          <GlassCard className="!p-8 text-center">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No partnerships tracked yet</p>
            <p className="text-sm text-slate-500 mt-1">Partnerships will appear here as they are identified</p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {partnerships.map(partner => (
              <GlassCard key={partner.id} className="!p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-white">{partner.organization_name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {partner.partnership_type?.replace(/_/g, ' ') || 'TBD'}
                    </p>
                    {partner.value_proposition && (
                      <p className="text-xs text-slate-500 mt-2">{partner.value_proposition}</p>
                    )}
                  </div>
                  <StatusBadge status={partner.status} size="sm" />
                </div>
                {partner.contact_name && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-400">
                    Contact: {partner.contact_name}
                    {partner.contact_email && ` • ${partner.contact_email}`}
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      {/* Suggestion Modal */}
      {showSuggestionModal && (
        <SuggestionModal
          type={showSuggestionModal}
          onClose={() => setShowSuggestionModal(null)}
          onSubmit={handleSuggestionSubmit}
        />
      )}
    </div>
  );
};

export default InfluencersView;
