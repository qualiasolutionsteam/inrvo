import React, { useState } from 'react';
import { Trophy, TrendingUp, RefreshCw, Plus, Trash2, Check, RotateCcw } from 'lucide-react';
import { Section } from '../components/Section';
import { EditableField, EditableNumber } from '../components/EditableField';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { AttributionBadge } from '../components/AttributionBadge';
import {
  MarketingHubData,
  RecurringTask,
  ChannelAllocation,
} from '../types';
import { generateId } from '../data/initialData';
import { useMarketingUser } from '../contexts/MarketingUserContext';
import { createAttribution, updateAttribution } from '../utils/attribution';

interface Phase3ScaleProps {
  data: MarketingHubData['phase3'];
  onUpdate: (updates: Partial<MarketingHubData['phase3']>) => void;
}

const channelColors: Record<keyof ChannelAllocation, { bg: string; text: string }> = {
  meta: { bg: 'bg-blue-500', text: 'text-blue-400' },
  google: { bg: 'bg-red-500', text: 'text-red-400' },
  tiktok: { bg: 'bg-pink-500', text: 'text-pink-400' },
  influencer: { bg: 'bg-purple-500', text: 'text-purple-400' },
  content: { bg: 'bg-teal-500', text: 'text-teal-600' },
};

export function Phase3Scale({ data, onUpdate }: Phase3ScaleProps) {
  const { winningPlaybook, scalePlan, recurringTasks } = data;
  const { email } = useMarketingUser();

  // Calculate LTV:CAC ratio
  const ltvCacRatio = winningPlaybook.currentCAC > 0
    ? (winningPlaybook.ltv / winningPlaybook.currentCAC).toFixed(1)
    : 'N/A';

  // Calculate total allocation percentage
  const totalAllocation = Object.values(scalePlan.channelAllocation).reduce((sum, val) => sum + val, 0);

  // Update channel allocation
  const updateChannelAllocation = (channel: keyof ChannelAllocation, value: number) => {
    onUpdate({
      scalePlan: {
        ...scalePlan,
        channelAllocation: {
          ...scalePlan.channelAllocation,
          [channel]: value,
        },
      },
    });
  };

  // Recurring task helpers
  const addRecurringTask = (frequency: 'weekly' | 'monthly') => {
    const newTask: RecurringTask = {
      id: generateId(),
      title: `New ${frequency} task`,
      frequency,
      completed: false,
      lastReset: new Date().toISOString(),
      attribution: createAttribution(email),
    };
    onUpdate({ recurringTasks: [...recurringTasks, newTask] });
  };

  const updateRecurringTask = (id: string, updates: Partial<RecurringTask>) => {
    const tasks = recurringTasks.map((t) => (t.id === id ? { ...t, ...updates, attribution: updateAttribution(t.attribution, email) } : t));
    onUpdate({ recurringTasks: tasks });
  };

  const deleteRecurringTask = (id: string) => {
    onUpdate({
      recurringTasks: recurringTasks.filter((t) => t.id !== id),
    });
  };

  const resetTask = (id: string) => {
    updateRecurringTask(id, { completed: false, lastReset: new Date().toISOString() });
  };

  const resetAllTasks = (frequency: 'weekly' | 'monthly') => {
    const tasks = recurringTasks.map((t) =>
      t.frequency === frequency ? { ...t, completed: false, lastReset: new Date().toISOString() } : t
    );
    onUpdate({ recurringTasks: tasks });
  };

  const weeklyTasks = recurringTasks.filter((t) => t.frequency === 'weekly');
  const monthlyTasks = recurringTasks.filter((t) => t.frequency === 'monthly');
  const weeklyProgress = weeklyTasks.length > 0
    ? (weeklyTasks.filter((t) => t.completed).length / weeklyTasks.length) * 100
    : 0;
  const monthlyProgress = monthlyTasks.length > 0
    ? (monthlyTasks.filter((t) => t.completed).length / monthlyTasks.length) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Winning Playbook Section */}
      <Section
        title="Winning Playbook"
        description="Document what's working and your key growth metrics"
        icon={<Trophy size={20} />}
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* What's Working */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-900 flex items-center gap-2">
              <Trophy size={16} className="text-amber-400" />
              What's Working
            </h4>

            <div>
              <label className="block text-sm text-slate-500 mb-1">Best Performing Message</label>
              <EditableField
                value={winningPlaybook.bestMessage}
                onChange={(bestMessage) => onUpdate({ winningPlaybook: { ...winningPlaybook, bestMessage } })}
                placeholder="The value prop or hook that converts best..."
                multiline
              />
            </div>

            <div>
              <label className="block text-sm text-slate-500 mb-1">Best Target Audience</label>
              <EditableField
                value={winningPlaybook.bestAudience}
                onChange={(bestAudience) => onUpdate({ winningPlaybook: { ...winningPlaybook, bestAudience } })}
                placeholder="Demographics, interests, behaviors..."
                multiline
              />
            </div>

            <div>
              <label className="block text-sm text-slate-500 mb-1">Best Performing Channel</label>
              <EditableField
                value={winningPlaybook.bestChannel}
                onChange={(bestChannel) => onUpdate({ winningPlaybook: { ...winningPlaybook, bestChannel } })}
                placeholder="Which platform/channel drives best results..."
              />
            </div>
          </div>

          {/* Unit Economics */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-900 flex items-center gap-2">
              <TrendingUp size={16} className="text-teal-600" />
              Unit Economics
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <label className="block text-sm text-slate-500 mb-1">Current CAC</label>
                <EditableNumber
                  value={winningPlaybook.currentCAC}
                  onChange={(currentCAC) => onUpdate({ winningPlaybook: { ...winningPlaybook, currentCAC } })}
                  prefix="$"
                  className="text-2xl font-bold text-slate-900"
                />
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <label className="block text-sm text-slate-500 mb-1">Target CAC</label>
                <EditableNumber
                  value={winningPlaybook.targetCAC}
                  onChange={(targetCAC) => onUpdate({ winningPlaybook: { ...winningPlaybook, targetCAC } })}
                  prefix="$"
                  className="text-2xl font-bold text-teal-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <label className="block text-sm text-slate-500 mb-1">Customer LTV</label>
                <EditableNumber
                  value={winningPlaybook.ltv}
                  onChange={(ltv) => onUpdate({ winningPlaybook: { ...winningPlaybook, ltv } })}
                  prefix="$"
                  className="text-2xl font-bold text-slate-900"
                />
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <label className="block text-sm text-slate-500 mb-1">LTV:CAC Ratio</label>
                <div className={`text-2xl font-bold ${
                  typeof ltvCacRatio === 'string' && ltvCacRatio !== 'N/A'
                    ? parseFloat(ltvCacRatio) >= 3 ? 'text-teal-600' : parseFloat(ltvCacRatio) >= 2 ? 'text-amber-400' : 'text-red-400'
                    : 'text-slate-500'
                }`}>
                  {ltvCacRatio}x
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {typeof ltvCacRatio === 'string' && ltvCacRatio !== 'N/A' && (
                    parseFloat(ltvCacRatio) >= 3 ? 'Healthy' : parseFloat(ltvCacRatio) >= 2 ? 'Acceptable' : 'Needs improvement'
                  )}
                </div>
              </div>
            </div>

            {/* CAC Progress */}
            {winningPlaybook.currentCAC > 0 && winningPlaybook.targetCAC > 0 && (
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">CAC Reduction Progress</span>
                  <span className="text-sm text-slate-900">
                    ${winningPlaybook.currentCAC} → ${winningPlaybook.targetCAC}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, (1 - winningPlaybook.currentCAC / (winningPlaybook.currentCAC + winningPlaybook.targetCAC)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Scale Plan Section */}
      <Section
        title="Scale Plan"
        description="Budget allocation across channels for scaling"
        icon={<TrendingUp size={20} />}
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Budget */}
          <div>
            <div className="bg-slate-50 rounded-lg p-6">
              <label className="block text-sm text-slate-500 mb-2">Monthly Marketing Budget</label>
              <EditableNumber
                value={scalePlan.monthlyBudget}
                onChange={(monthlyBudget) => onUpdate({ scalePlan: { ...scalePlan, monthlyBudget } })}
                prefix="$"
                className="text-4xl font-bold text-slate-900"
              />
              <p className="text-sm text-slate-500 mt-2">
                Total allocation: {totalAllocation}%{' '}
                {totalAllocation !== 100 && (
                  <span className="text-amber-400">(should equal 100%)</span>
                )}
              </p>
            </div>
          </div>

          {/* Channel Allocation */}
          <div className="space-y-4">
            <h4 className="font-medium text-slate-900">Channel Allocation</h4>
            {(Object.keys(scalePlan.channelAllocation) as (keyof ChannelAllocation)[]).map((channel) => {
              const value = scalePlan.channelAllocation[channel];
              const dollarAmount = Math.round((value / 100) * scalePlan.monthlyBudget);
              const colors = channelColors[channel];

              return (
                <div key={channel} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`capitalize ${colors.text}`}>{channel}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-sm">${dollarAmount}</span>
                      <EditableNumber
                        value={value}
                        onChange={(v) => updateChannelAllocation(channel, v)}
                        suffix="%"
                        className="w-16 text-right"
                      />
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors.bg} transition-all duration-300`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Budget Breakdown Visual */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h4 className="font-medium text-slate-900 mb-4">Budget Breakdown</h4>
          <div className="flex h-8 rounded-lg overflow-hidden">
            {(Object.keys(scalePlan.channelAllocation) as (keyof ChannelAllocation)[]).map((channel) => {
              const value = scalePlan.channelAllocation[channel];
              const colors = channelColors[channel];
              if (value === 0) return null;
              return (
                <div
                  key={channel}
                  className={`${colors.bg} flex items-center justify-center text-xs font-medium text-slate-900 transition-all duration-300`}
                  style={{ width: `${value}%` }}
                  title={`${channel}: ${value}%`}
                >
                  {value >= 10 && `${value}%`}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            {(Object.keys(scalePlan.channelAllocation) as (keyof ChannelAllocation)[]).map((channel) => {
              const colors = channelColors[channel];
              return (
                <div key={channel} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${colors.bg}`} />
                  <span className="text-sm text-slate-500 capitalize">{channel}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* Recurring Tasks Section */}
      <Section
        title="Recurring Tasks"
        description="Weekly and monthly marketing tasks"
        icon={<RefreshCw size={20} />}
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Tasks */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h4 className="font-medium text-slate-900">Weekly Tasks</h4>
                <ProgressIndicator value={weeklyProgress} size="sm" showLabel />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => resetAllTasks('weekly')}
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  Reset All
                </button>
                <button
                  onClick={() => addRecurringTask('weekly')}
                  className="text-sm text-teal-600 hover:text-teal-500 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {weeklyTasks.map((task) => (
                <RecurringTaskItem
                  key={task.id}
                  task={task}
                  onUpdate={(updates) => updateRecurringTask(task.id, updates)}
                  onReset={() => resetTask(task.id)}
                  onDelete={() => deleteRecurringTask(task.id)}
                />
              ))}
              {weeklyTasks.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">No weekly tasks yet</p>
              )}
            </div>
          </div>

          {/* Monthly Tasks */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h4 className="font-medium text-slate-900">Monthly Tasks</h4>
                <ProgressIndicator value={monthlyProgress} size="sm" showLabel />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => resetAllTasks('monthly')}
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  Reset All
                </button>
                <button
                  onClick={() => addRecurringTask('monthly')}
                  className="text-sm text-teal-600 hover:text-teal-500 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {monthlyTasks.map((task) => (
                <RecurringTaskItem
                  key={task.id}
                  task={task}
                  onUpdate={(updates) => updateRecurringTask(task.id, updates)}
                  onReset={() => resetTask(task.id)}
                  onDelete={() => deleteRecurringTask(task.id)}
                />
              ))}
              {monthlyTasks.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">No monthly tasks yet</p>
              )}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

// Recurring Task Item Component
interface RecurringTaskItemProps {
  key?: React.Key;
  task: RecurringTask;
  onUpdate: (updates: Partial<RecurringTask>) => void;
  onReset: () => void;
  onDelete: () => void;
}

function RecurringTaskItem({ task, onUpdate, onReset, onDelete }: RecurringTaskItemProps) {
  return (
    <div className={`p-3 rounded-lg transition-colors ${
      task.completed ? 'bg-teal-500/10' : 'bg-white'
    }`}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onUpdate({ completed: !task.completed })}
          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
            task.completed
              ? 'bg-teal-500 border-teal-500 text-slate-900'
              : 'border-slate-200 hover:border-teal-500'
          }`}
        >
          {task.completed && <Check size={12} />}
        </button>
        <EditableField
          value={task.title}
          onChange={(title) => onUpdate({ title })}
          className={`flex-1 ${task.completed ? 'line-through text-slate-500' : ''}`}
        />
        <div className="flex items-center gap-1">
          {task.completed && (
            <button
              onClick={onReset}
              className="p-1 text-slate-500 hover:text-slate-900"
              title="Reset task"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1 text-slate-500 hover:text-red-400"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {task.attribution && (
        <div className="mt-2 pl-8">
          <AttributionBadge attribution={task.attribution} compact />
        </div>
      )}
    </div>
  );
}
