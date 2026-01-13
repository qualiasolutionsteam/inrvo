import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Check, Clock, User, Building2, ChevronDown } from 'lucide-react';
import GlassCard from '../../../../components/GlassCard';
import { useCommunications } from '../../../hooks/useMarketingData';
import type { MarketingCommunication, CommunicationType } from '../../../types/marketing';

const typeLabels: Record<CommunicationType, string> = {
  meeting: 'Meeting Notes',
  question: 'Question',
  feedback: 'Feedback',
  update: 'Update',
  decision: 'Decision',
};

const typeColors: Record<CommunicationType, string> = {
  meeting: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  question: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  feedback: 'bg-sky-500/20 text-sky-500 border-sky-500/30',
  update: 'bg-sky-500/20 text-sky-500 border-sky-500/30',
  decision: 'bg-green-500/20 text-green-400 border-green-500/30',
};

interface MessageBubbleProps {
  communication: MarketingCommunication;
  onMarkResolved: (id: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ communication, onMarkResolved }) => {
  const [expanded, setExpanded] = useState(false);
  const isFromAgency = communication.from_agency;

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isLongContent = communication.content.length > 200;
  const displayContent = expanded || !isLongContent
    ? communication.content
    : communication.content.slice(0, 200) + '...';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isFromAgency ? '' : 'flex-row-reverse'}`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isFromAgency ? 'bg-sky-500/20' : 'bg-purple-500/20'
      }`}>
        {isFromAgency ? (
          <Building2 className="w-4 h-4 text-sky-500" />
        ) : (
          <User className="w-4 h-4 text-purple-400" />
        )}
      </div>

      {/* Message */}
      <div className={`flex-1 max-w-[85%] ${isFromAgency ? '' : 'text-right'}`}>
        <div className={`inline-block text-left rounded-2xl p-4 ${
          isFromAgency
            ? 'bg-slate-800 rounded-tl-none'
            : 'bg-sky-900/30 rounded-tr-none'
        }`}>
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColors[communication.communication_type]}`}>
              {typeLabels[communication.communication_type]}
            </span>
            {!communication.is_resolved && !isFromAgency && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Pending
              </span>
            )}
            {communication.is_resolved && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Resolved
              </span>
            )}
          </div>

          {/* Title */}
          {communication.title && (
            <h4 className="text-sm font-medium text-white mb-1">{communication.title}</h4>
          )}

          {/* Content */}
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{displayContent}</p>

          {isLongContent && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-sky-500 hover:text-sky-400 mt-2 flex items-center gap-1"
            >
              {expanded ? 'Show less' : 'Show more'}
              <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700/50">
            <span className="text-xs text-slate-500">
              {isFromAgency ? 'Qualia Solutions' : 'You'} • {formatDate(communication.created_at)}
            </span>
            {!communication.is_resolved && isFromAgency && (
              <button
                onClick={() => onMarkResolved(communication.id)}
                className="text-xs text-sky-500 hover:text-sky-400"
              >
                Mark as resolved
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const CommunicationView: React.FC = () => {
  const { communications, unreadCount, isLoading, sendMessage, markResolved, refetch } = useCommunications();
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<CommunicationType>('question');
  const [isSending, setIsSending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unresolved'>('all');

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      await sendMessage(newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const filteredCommunications = filter === 'all'
    ? communications
    : communications.filter(c => !c.is_resolved);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-sky-500" />
          Communications
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
              {unreadCount} open
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-sky-500/20 text-sky-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unresolved')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === 'unresolved'
                ? 'bg-sky-500/20 text-sky-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Open
          </button>
        </div>
      </div>

      {/* New Message Form */}
      <GlassCard className="!p-4">
        <h3 className="text-sm font-medium text-white mb-3">Send a Message</h3>
        <textarea
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Ask a question, provide feedback, or share updates..."
          className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
          rows={3}
        />
        <div className="flex items-center justify-between mt-3">
          <select
            value={messageType}
            onChange={e => setMessageType(e.target.value as CommunicationType)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          >
            <option value="question">Question</option>
            <option value="feedback">Feedback</option>
            <option value="update">Update</option>
          </select>
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </GlassCard>

      {/* Messages */}
      {filteredCommunications.length === 0 ? (
        <GlassCard className="!p-8 text-center">
          <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">
            {filter === 'unresolved' ? 'No open messages' : 'No messages yet'}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Use the form above to start a conversation
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredCommunications.map(comm => (
              <MessageBubble
                key={comm.id}
                communication={comm}
                onMarkResolved={markResolved}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default CommunicationView;
