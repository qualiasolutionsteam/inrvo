/**
 * Agent Tools for INrVO Meditation Agent
 *
 * These tools connect the conversational agent to the app's core functionality:
 * - Script generation (Gemini)
 * - Audio synthesis (ElevenLabs)
 * - User history (Supabase)
 * - Wisdom quotes (Knowledge Base)
 */

import { geminiService } from '../../../geminiService';
import { voiceService } from '../voiceService';
import { creditService } from '../credits';
import {
  getMeditationHistory,
  saveMeditationHistory,
  getCurrentUser,
  getUserVoiceProfiles,
  type MeditationHistory,
  type VoiceProfile as DBVoiceProfile,
} from '../../../lib/supabase';
import {
  getRandomQuote,
  getQuotesByTheme,
  getMeditationRecommendation,
  MEDITATION_TYPES,
  WISDOM_TEACHERS,
  type MeditationType,
  type WisdomTeacher,
} from './knowledgeBase';
import type { VoiceProfile } from '../../../types';

// ============================================================================
// TYPES
// ============================================================================

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GeneratedMeditation {
  script: string;
  meditationType: MeditationType;
  duration: number; // estimated in seconds
  tradition?: string;
  teacherInfluence?: string;
}

export interface SynthesizedAudio {
  audioBuffer: AudioBuffer;
  base64: string;
  duration: number;
  creditsUsed: number;
}

export interface MeditationSuggestion {
  meditationType: MeditationType;
  name: string;
  description: string;
  benefits: string[];
  suggestedTeachers: string[];
  estimatedDuration: number;
  relevanceReason: string;
}

// ============================================================================
// AGENT TOOLS
// ============================================================================

/**
 * Generate a personalized meditation script using Gemini
 */
export async function generateMeditationScript(
  prompt: string,
  meditationType: MeditationType = 'guided_visualization',
  options?: {
    duration?: 'short' | 'medium' | 'long';
    tradition?: string;
    teacherInfluence?: string;
    audioTags?: string[];
  }
): Promise<ToolResult<GeneratedMeditation>> {
  try {
    // Get meditation type info
    const typeInfo = MEDITATION_TYPES.find(m => m.id === meditationType);
    if (!typeInfo) {
      return { success: false, error: `Unknown meditation type: ${meditationType}` };
    }

    // Determine word count based on duration
    // At meditative pace (~2 words/second with pauses), these create proper meditation lengths
    const durationMap = {
      short: { words: '300-400', seconds: 180 },    // 3-4 minutes
      medium: { words: '450-550', seconds: 300 },   // 5-6 minutes
      long: { words: '600-800', seconds: 480 },     // 8-10 minutes
    };
    const duration = options?.duration || 'medium';
    const wordRange = durationMap[duration].words;
    const estimatedSeconds = durationMap[duration].seconds;

    // Build enhanced prompt with wisdom tradition context
    let enhancedPrompt = prompt;

    if (options?.tradition) {
      const traditionTeachers = WISDOM_TEACHERS.filter(t => t.tradition === options.tradition);
      if (traditionTeachers.length > 0) {
        const teacher = traditionTeachers[0];
        enhancedPrompt += ` Draw from the wisdom of ${options.tradition.replace('_', ' ')} tradition. `;
        enhancedPrompt += `Core teaching to embody: "${teacher.coreTeaching}"`;
      }
    }

    if (options?.teacherInfluence) {
      const teacher = WISDOM_TEACHERS.find(t => t.name.toLowerCase() === options.teacherInfluence?.toLowerCase());
      if (teacher) {
        enhancedPrompt += ` Channel the energy and teachings of ${teacher.name}: "${teacher.coreTeaching}"`;
      }
    }

    // Add meditation type context
    enhancedPrompt += ` This is a ${typeInfo.name.toLowerCase()} meditation focused on ${typeInfo.benefits.slice(0, 2).join(' and ')}.`;
    enhancedPrompt += ` Target length: ${wordRange} words.`;

    // Generate the script
    const script = await geminiService.enhanceScript(enhancedPrompt, options?.audioTags);

    return {
      success: true,
      data: {
        script,
        meditationType,
        duration: estimatedSeconds,
        tradition: options?.tradition,
        teacherInfluence: options?.teacherInfluence,
      },
    };
  } catch (error: any) {
    console.error('Error generating meditation script:', error);
    return { success: false, error: error.message || 'Failed to generate meditation script' };
  }
}

/**
 * Extend an existing meditation script to be longer
 */
export async function extendMeditationScript(
  existingScript: string
): Promise<ToolResult<{ script: string; estimatedDuration: number }>> {
  try {
    const extendedScript = await geminiService.extendScript(existingScript);

    // Estimate duration based on word count (~2.5 words per second for meditation pace)
    const wordCount = extendedScript.split(/\s+/).length;
    const estimatedDuration = Math.ceil(wordCount / 2.5);

    return {
      success: true,
      data: {
        script: extendedScript,
        estimatedDuration,
      },
    };
  } catch (error: any) {
    console.error('Error extending meditation script:', error);
    return { success: false, error: error.message || 'Failed to extend meditation script' };
  }
}

/**
 * Synthesize audio from a meditation script
 */
export async function synthesizeAudio(
  script: string,
  voice: VoiceProfile,
  audioContext?: AudioContext
): Promise<ToolResult<SynthesizedAudio>> {
  try {
    // Check if voice is ready
    if (!voice.isCloned || !voice.elevenlabsVoiceId) {
      return { success: false, error: 'Please clone a voice first to generate audio.' };
    }

    // Check credits
    const estimatedCost = voiceService.getEstimatedCost(script);
    const user = await getCurrentUser();
    if (user) {
      const credits = await creditService.getCredits(user.id);
      if (credits < estimatedCost) {
        return {
          success: false,
          error: `Insufficient credits. Need ${estimatedCost} credits, have ${credits}.`,
        };
      }
    }

    // Generate audio
    const ctx = audioContext || new AudioContext();
    const { audioBuffer, base64 } = await voiceService.generateSpeech(script, voice, ctx);

    // Deduct credits
    if (user) {
      await creditService.deductCredits(estimatedCost, 'TTS_GENERATE', undefined, user.id, script.length);
    }

    return {
      success: true,
      data: {
        audioBuffer,
        base64,
        duration: audioBuffer.duration,
        creditsUsed: estimatedCost,
      },
    };
  } catch (error: any) {
    console.error('Error synthesizing audio:', error);
    return { success: false, error: error.message || 'Failed to synthesize audio' };
  }
}

/**
 * Get user's meditation history
 */
export async function getUserMeditationHistory(
  limit: number = 20
): Promise<ToolResult<MeditationHistory[]>> {
  try {
    const history = await getMeditationHistory(limit);
    return { success: true, data: history };
  } catch (error: any) {
    console.error('Error fetching meditation history:', error);
    return { success: false, error: error.message || 'Failed to fetch meditation history' };
  }
}

/**
 * Save a meditation to user's history
 */
export async function saveMeditation(
  prompt: string,
  script: string,
  voiceId?: string,
  voiceName?: string,
  duration?: number,
  audioTags?: string[]
): Promise<ToolResult<MeditationHistory>> {
  try {
    const result = await saveMeditationHistory(
      prompt,
      script,
      voiceId,
      voiceName,
      undefined, // background track id
      undefined, // background track name
      duration,
      audioTags
    );

    if (result) {
      return { success: true, data: result };
    }
    return { success: false, error: 'Failed to save meditation' };
  } catch (error: any) {
    console.error('Error saving meditation:', error);
    return { success: false, error: error.message || 'Failed to save meditation' };
  }
}

/**
 * Suggest meditation based on mood and preferences
 */
export function suggestMeditation(
  mood: string,
  timeAvailable?: number, // minutes
  preferredTradition?: string
): ToolResult<MeditationSuggestion[]> {
  try {
    const recommendation = getMeditationRecommendation(mood);

    if (recommendation.meditations.length === 0) {
      // Default suggestions
      return {
        success: true,
        data: [
          {
            meditationType: 'breathwork',
            name: 'Calming Breathwork',
            description: 'A simple breathing practice to center yourself',
            benefits: ['Stress relief', 'Mental clarity'],
            suggestedTeachers: ['Thich Nhat Hanh'],
            estimatedDuration: 5,
            relevanceReason: 'A great starting point for any mood',
          },
        ],
      };
    }

    // Filter by time if specified
    let suggestions = recommendation.meditations;
    if (timeAvailable) {
      suggestions = suggestions.filter(m => m.duration.min <= timeAvailable);
    }

    // Filter by tradition if specified
    let teachers = recommendation.teachers;
    if (preferredTradition) {
      teachers = teachers.filter(t => t.tradition === preferredTradition);
    }

    const result: MeditationSuggestion[] = suggestions.slice(0, 3).map(m => ({
      meditationType: m.id,
      name: m.name,
      description: m.description,
      benefits: m.benefits,
      suggestedTeachers: teachers.slice(0, 2).map(t => t.name),
      estimatedDuration: m.duration.recommended,
      relevanceReason: recommendation.message,
    }));

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error suggesting meditation:', error);
    return { success: false, error: error.message || 'Failed to suggest meditation' };
  }
}

/**
 * Get a wisdom quote
 */
export function getWisdomQuote(
  teacherName?: string,
  theme?: string
): ToolResult<{ quote: string; teacher: string }> {
  try {
    if (theme) {
      const quotes = getQuotesByTheme(theme);
      if (quotes.length > 0) {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        return { success: true, data: randomQuote };
      }
    }

    const quote = getRandomQuote(teacherName);
    return { success: true, data: quote };
  } catch (error: any) {
    console.error('Error getting wisdom quote:', error);
    return { success: false, error: error.message || 'Failed to get wisdom quote' };
  }
}

/**
 * Get user's available voices
 */
export async function getAvailableVoices(): Promise<ToolResult<DBVoiceProfile[]>> {
  try {
    const voices = await getUserVoiceProfiles();
    return { success: true, data: voices };
  } catch (error: any) {
    console.error('Error fetching voices:', error);
    return { success: false, error: error.message || 'Failed to fetch voices' };
  }
}

/**
 * Get user's credit status
 */
export async function getCreditStatus(): Promise<ToolResult<{
  creditsRemaining: number;
  clonesRemaining: number;
  canGenerate: boolean;
}>> {
  try {
    const status = await creditService.checkCreditsStatus();
    return {
      success: true,
      data: {
        creditsRemaining: status.creditsRemaining,
        clonesRemaining: status.clonesLimit - status.clonesCreated,
        canGenerate: status.creditsRemaining > 100, // Minimum for a short meditation
      },
    };
  } catch (error: any) {
    console.error('Error checking credit status:', error);
    return { success: false, error: error.message || 'Failed to check credit status' };
  }
}

/**
 * Get information about a specific teacher
 */
export function getTeacherInfo(teacherName: string): ToolResult<WisdomTeacher> {
  const teacher = WISDOM_TEACHERS.find(
    t => t.name.toLowerCase() === teacherName.toLowerCase()
  );

  if (teacher) {
    return { success: true, data: teacher };
  }

  return { success: false, error: `Teacher "${teacherName}" not found in knowledge base` };
}

/**
 * Get teachers by tradition
 */
export function getTeachersByTradition(tradition: string): ToolResult<WisdomTeacher[]> {
  const teachers = WISDOM_TEACHERS.filter(
    t => t.tradition === tradition || t.tradition.includes(tradition.toLowerCase())
  );

  return { success: true, data: teachers };
}

/**
 * Analyze user input for meditation planning
 */
export function analyzeUserRequest(input: string): {
  detectedMood?: string;
  suggestedType?: MeditationType;
  mentionedDuration?: number;
  mentionedTeacher?: string;
  mentionedTradition?: string;
} {
  const lowered = input.toLowerCase();
  const result: ReturnType<typeof analyzeUserRequest> = {};

  // Detect duration mentions
  const durationMatch = lowered.match(/(\d+)\s*(minute|min|m\b)/);
  if (durationMatch) {
    result.mentionedDuration = parseInt(durationMatch[1], 10);
  }

  // Detect short/medium/long mentions
  if (lowered.includes('quick') || lowered.includes('short') || lowered.includes('brief')) {
    result.mentionedDuration = 5;
  } else if (lowered.includes('long') || lowered.includes('deep') || lowered.includes('extended')) {
    result.mentionedDuration = 20;
  }

  // Detect teacher mentions
  for (const teacher of WISDOM_TEACHERS) {
    if (lowered.includes(teacher.name.toLowerCase())) {
      result.mentionedTeacher = teacher.name;
      break;
    }
  }

  // Detect tradition mentions
  const traditions = ['buddhist', 'stoic', 'taoist', 'yogic', 'mindfulness', 'scientific'];
  for (const tradition of traditions) {
    if (lowered.includes(tradition)) {
      result.mentionedTradition = tradition;
      break;
    }
  }

  return result;
}
