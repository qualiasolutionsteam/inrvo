import React, { useState } from 'react';
import {
  MessageSquare,
  Lightbulb,
  HelpCircle,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
  ArrowRight,
  Calendar,
  Tag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Section } from '../components/Section';
import { EditableField } from '../components/EditableField';
import { AttributionBadge } from '../components/AttributionBadge';
import { MarketingHubData, MeetingNote, Idea, Question } from '../types';
import { generateId } from '../data/initialData';
import { useMarketingUser } from '../contexts/MarketingUserContext';
import { createAttribution, updateAttribution } from '../utils/attribution';

interface NotesProps {
  data: MarketingHubData['notes'];
  onUpdate: (updates: Partial<MarketingHubData['notes']>) => void;
}

export function Notes({ data, onUpdate }: NotesProps) {
  const { meetingNotes, ideasParkingLot, questions } = data;
  const { email } = useMarketingUser();

  // Meeting Notes helpers
  const addMeetingNote = () => {
    const newNote: MeetingNote = {
      id: generateId(),
      date: new Date().toISOString().split('T')[0],
      content: '',
      tags: [],
      attribution: createAttribution(email),
    };
    onUpdate({ meetingNotes: [newNote, ...meetingNotes] });
  };

  const updateMeetingNote = (id: string, updates: Partial<MeetingNote>) => {
    const notes = meetingNotes.map((n) =>
      n.id === id
        ? { ...n, ...updates, attribution: updateAttribution(n.attribution, email) }
        : n
    );
    onUpdate({ meetingNotes: notes });
  };

  const deleteMeetingNote = (id: string) => {
    onUpdate({ meetingNotes: meetingNotes.filter((n) => n.id !== id) });
  };

  // Ideas helpers
  const addIdea = () => {
    const newIdea: Idea = {
      id: generateId(),
      content: '',
      votes: 0,
      createdAt: new Date().toISOString(),
      attribution: createAttribution(email),
    };
    onUpdate({ ideasParkingLot: [...ideasParkingLot, newIdea] });
  };

  const updateIdea = (id: string, updates: Partial<Idea>) => {
    const ideas = ideasParkingLot.map((i) =>
      i.id === id
        ? { ...i, ...updates, attribution: updateAttribution(i.attribution, email) }
        : i
    );
    onUpdate({ ideasParkingLot: ideas });
  };

  const deleteIdea = (id: string) => {
    onUpdate({ ideasParkingLot: ideasParkingLot.filter((i) => i.id !== id) });
  };

  const voteIdea = (id: string, delta: number) => {
    const ideas = ideasParkingLot.map((i) =>
      i.id === id ? { ...i, votes: Math.max(0, i.votes + delta) } : i
    );
    // Sort by votes descending
    ideas.sort((a, b) => b.votes - a.votes);
    onUpdate({ ideasParkingLot: ideas });
  };

  // Questions helpers
  const addQuestion = () => {
    const newQuestion: Question = {
      id: generateId(),
      question: '',
      answer: '',
      resolved: false,
      createdAt: new Date().toISOString(),
      attribution: createAttribution(email),
    };
    onUpdate({ questions: [...questions, newQuestion] });
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    const qs = questions.map((q) =>
      q.id === id
        ? { ...q, ...updates, attribution: updateAttribution(q.attribution, email) }
        : q
    );
    onUpdate({ questions: qs });
  };

  const deleteQuestion = (id: string) => {
    onUpdate({ questions: questions.filter((q) => q.id !== id) });
  };

  // Sort questions: unresolved first
  const sortedQuestions = [...questions].sort((a, b) => {
    if (a.resolved === b.resolved) return 0;
    return a.resolved ? 1 : -1;
  });

  return (
    <div className="space-y-6">
      {/* Meeting Notes Section */}
      <Section
        title="Meeting Notes"
        description="Document decisions, action items, and insights from meetings"
        icon={<MessageSquare size={20} />}
        defaultExpanded={true}
      >
        <button
          onClick={addMeetingNote}
          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:border-slate-500 transition-colors mb-4"
        >
          <Plus size={20} />
          Add Meeting Note
        </button>

        <div className="space-y-4">
          {meetingNotes.map((note) => (
            <MeetingNoteCard
              key={note.id}
              note={note}
              onUpdate={(updates) => updateMeetingNote(note.id, updates)}
              onDelete={() => deleteMeetingNote(note.id)}
            />
          ))}
          {meetingNotes.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">
              No meeting notes yet. Add one to get started!
            </p>
          )}
        </div>
      </Section>

      {/* Ideas Parking Lot Section */}
      <Section
        title="Ideas Parking Lot"
        description="Capture ideas to explore later - vote to prioritize"
        icon={<Lightbulb size={20} />}
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ideasParkingLot.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onUpdate={(updates) => updateIdea(idea.id, updates)}
              onVote={(delta) => voteIdea(idea.id, delta)}
              onDelete={() => deleteIdea(idea.id)}
            />
          ))}
        </div>

        <button
          onClick={addIdea}
          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:border-slate-500 transition-colors mt-4"
        >
          <Plus size={20} />
          Add Idea
        </button>
      </Section>

      {/* Questions Section */}
      <Section
        title="Open Questions"
        description="Track questions that need answers"
        icon={<HelpCircle size={20} />}
        defaultExpanded={true}
      >
        <div className="space-y-3">
          {sortedQuestions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              onUpdate={(updates) => updateQuestion(question.id, updates)}
              onDelete={() => deleteQuestion(question.id)}
            />
          ))}
        </div>

        <button
          onClick={addQuestion}
          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:border-slate-500 transition-colors mt-4"
        >
          <Plus size={20} />
          Add Question
        </button>
      </Section>
    </div>
  );
}

// Meeting Note Card Component
interface MeetingNoteCardProps {
  key?: React.Key;
  note: MeetingNote;
  onUpdate: (updates: Partial<MeetingNote>) => void;
  onDelete: () => void;
}

function MeetingNoteCard({ note, onUpdate, onDelete }: MeetingNoteCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newTag, setNewTag] = useState('');

  const addTag = () => {
    if (newTag.trim() && !note.tags.includes(newTag.trim())) {
      onUpdate({ tags: [...note.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    onUpdate({ tags: note.tags.filter((t) => t !== tag) });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Calendar size={16} className="text-slate-500" />
        <input
          type="date"
          value={note.date}
          onChange={(e) => onUpdate({ date: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          className="bg-transparent text-slate-900 text-sm"
        />
        <div className="flex-1 flex flex-wrap gap-1">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-teal-500/20 text-teal-600 rounded text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 text-slate-500 hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-200"
          >
            <div className="p-4 space-y-4">
              <textarea
                value={note.content}
                onChange={(e) => onUpdate({ content: e.target.value })}
                placeholder="Meeting notes, action items, decisions..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm min-h-[150px] resize-y"
              />

              {/* Tags */}
              <div className="flex items-center gap-2">
                <Tag size={14} className="text-slate-500" />
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  placeholder="Add tag..."
                  className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm text-slate-900 flex-1"
                />
                <button
                  onClick={addTag}
                  className="px-2 py-1 bg-teal-500/20 text-teal-600 rounded text-sm hover:bg-teal-500/30"
                >
                  Add
                </button>
              </div>

              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs group"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Attribution */}
              {note.attribution && (
                <div className="pt-2 border-t border-slate-100">
                  <AttributionBadge attribution={note.attribution} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Idea Card Component
interface IdeaCardProps {
  key?: React.Key;
  idea: Idea;
  onUpdate: (updates: Partial<Idea>) => void;
  onVote: (delta: number) => void;
  onDelete: () => void;
}

function IdeaCard({ idea, onUpdate, onVote, onDelete }: IdeaCardProps) {
  return (
    <div className={`bg-white border rounded-lg p-4 transition-colors ${
      idea.movedTo ? 'border-teal-500/30 bg-teal-500/5' : 'border-slate-200'
    }`}>
      <div className="flex items-start gap-3">
        {/* Voting */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => onVote(1)}
            className="p-1 text-slate-500 hover:text-teal-600"
          >
            <ChevronUp size={16} />
          </button>
          <span className={`text-sm font-medium ${idea.votes > 0 ? 'text-teal-600' : 'text-slate-500'}`}>
            {idea.votes}
          </span>
          <button
            onClick={() => onVote(-1)}
            className="p-1 text-slate-500 hover:text-red-400"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <EditableField
            value={idea.content}
            onChange={(content) => onUpdate({ content })}
            placeholder="Describe your idea..."
            multiline
          />

          {idea.movedTo && (
            <div className="flex items-center gap-1 mt-2 text-xs text-teal-600">
              <ArrowRight size={12} />
              <span>Moved to: {idea.movedTo}</span>
            </div>
          )}

          <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {new Date(idea.createdAt).toLocaleDateString()}
              </span>
              {idea.attribution && (
                <AttributionBadge attribution={idea.attribution} compact />
              )}
            </div>

            {!idea.movedTo && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    onUpdate({ movedTo: e.target.value });
                  }
                }}
                className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-1"
              >
                <option value="">Move to...</option>
                <option value="Phase 1 - Content">Phase 1 - Content</option>
                <option value="Phase 2 - Campaigns">Phase 2 - Campaigns</option>
                <option value="Phase 2 - Social">Phase 2 - Social</option>
                <option value="Phase 3 - Playbook">Phase 3 - Playbook</option>
                <option value="Archived">Archived</option>
              </select>
            )}
          </div>
        </div>

        {/* Delete */}
        <button onClick={onDelete} className="p-1 text-slate-500 hover:text-red-400">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// Question Card Component
interface QuestionCardProps {
  key?: React.Key;
  question: Question;
  onUpdate: (updates: Partial<Question>) => void;
  onDelete: () => void;
}

function QuestionCard({ question, onUpdate, onDelete }: QuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(!question.resolved);

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors ${
      question.resolved
        ? 'border-teal-500/30 bg-teal-500/5'
        : 'border-slate-200 bg-white'
    }`}>
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpdate({ resolved: !question.resolved });
          }}
          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
            question.resolved
              ? 'bg-teal-500 border-teal-500 text-slate-900'
              : 'border-slate-200 hover:border-teal-500'
          }`}
        >
          {question.resolved && <Check size={12} />}
        </button>

        <div className="flex-1 min-w-0">
          <EditableField
            value={question.question}
            onChange={(q) => onUpdate({ question: q })}
            placeholder="What's your question?"
            className={question.resolved ? 'line-through text-slate-500' : 'font-medium'}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {new Date(question.createdAt).toLocaleDateString()}
          </span>
          {question.attribution && (
            <AttributionBadge attribution={question.attribution} compact />
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 text-slate-500 hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Answer */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-200"
          >
            <div className="p-4">
              <label className="block text-sm text-slate-500 mb-2">Answer</label>
              <textarea
                value={question.answer}
                onChange={(e) => onUpdate({ answer: e.target.value })}
                placeholder="Add the answer here..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm min-h-[100px] resize-y"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
