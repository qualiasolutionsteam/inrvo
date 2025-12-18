import { supabase } from '../lib/supabase';

// Credits configuration
const COST_CONFIG = {
  VOICE_CLONE: 5000, // 5,000 credits to clone ($5)
  TTS_1K_CHARS: 280, // 280 credits per 1K characters ($0.30)
  FREE_MONTHLY_CREDITS: 10000, // $10 worth
  FREE_MONTHLY_CLONES: 2,
} as const;

export interface UserCredits {
  total_credits: number;
  credits_used: number;
  credits_remaining: number;
  last_updated: string;
}

export interface UsageLimits {
  credits_used: number;
  credits_limit: number;
  clones_created: number;
  clones_limit: number;
  month_start: string;
}

/**
 * Credit management service for voice cloning and TTS
 */
export const creditService = {
  /**
   * Get user's current credit balance
   */
  async getCredits(userId?: string): Promise<number> {
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      userId = user.id;
    }

    const { data, error } = await supabase
      .from('user_credits')
      .select('credits_remaining')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // User credits not initialized, create default
      await this.initializeUserCredits(userId);
      return COST_CONFIG.FREE_MONTHLY_CREDITS;
    }

    if (error) throw error;
    return data?.credits_remaining || 0;
  },

  /**
   * Initialize user credits on first use
   */
  async initializeUserCredits(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_credits')
      .upsert({
        user_id: userId,
        total_credits: COST_CONFIG.FREE_MONTHLY_CREDITS,
        credits_used: 0,
      });

    if (error) throw error;
  },

  /**
   * Deduct credits for an operation
   */
  async deductCredits(
    amount: number,
    operationType: 'CLONE_CREATE' | 'TTS_GENERATE',
    voiceProfileId?: string,
    userId?: string
  ): Promise<boolean> {
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      userId = user.id;
    }

    // Check if user has enough credits
    const currentCredits = await this.getCredits(userId);
    if (currentCredits < amount) {
      return false;
    }

    // Start transaction
    const { error: updateError } = await supabase.rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: amount,
    });

    if (updateError) {
      console.error('Failed to deduct credits:', updateError);
      return false;
    }

    // Track usage
    await this.trackUsage(userId, voiceProfileId, amount, operationType);

    // Update monthly limits for voice cloning
    if (operationType === 'CLONE_CREATE') {
      await this.updateMonthlyClones(userId);
    }

    return true;
  },

  /**
   * Check if user can clone a voice
   */
  async canClone(userId?: string): Promise<{ can: boolean; reason?: string }> {
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { can: false, reason: 'User not authenticated' };
      userId = user.id;
    }

    // Check credit balance
    const credits = await this.getCredits(userId);
    if (credits < COST_CONFIG.VOICE_CLONE) {
      return {
        can: false,
        reason: `Insufficient credits. Need ${COST_CONFIG.VOICE_CLONE} credits, have ${credits}`
      };
    }

    // Check monthly clone limit
    const limits = await this.getMonthlyUsageLimits(userId);
    if (limits.clones_created >= limits.clones_limit) {
      return {
        can: false,
        reason: `Monthly clone limit reached (${limits.clones_created}/${limits.clones_limit})`
      };
    }

    return { can: true };
  },

  /**
   * Get remaining clones for the month
   */
  async getClonesRemaining(userId?: string): Promise<number> {
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      userId = user.id;
    }

    const limits = await this.getMonthlyUsageLimits(userId);
    return Math.max(0, limits.clones_limit - limits.clones_created);
  },

  /**
   * Get monthly usage limits
   */
  async getMonthlyUsageLimits(userId: string): Promise<UsageLimits> {
    const { data, error } = await supabase
      .from('voice_usage_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('month_start', new Date().toISOString().slice(0, 7)) // YYYY-MM format
      .single();

    if (error && error.code === 'PGRST116') {
      // No record for this month, create default
      await this.initializeMonthlyLimits(userId);
      return {
        credits_used: 0,
        credits_limit: COST_CONFIG.FREE_MONTHLY_CREDITS,
        clones_created: 0,
        clones_limit: COST_CONFIG.FREE_MONTHLY_CLONES,
        month_start: new Date().toISOString().slice(0, 7),
      };
    }

    if (error) throw error;
    return data;
  },

  /**
   * Initialize monthly usage limits
   */
  async initializeMonthlyLimits(userId: string): Promise<void> {
    const { error } = await supabase
      .from('voice_usage_limits')
      .upsert({
        user_id: userId,
        month_start: new Date().toISOString().slice(0, 7),
        credits_used: 0,
        credits_limit: COST_CONFIG.FREE_MONTHLY_CREDITS,
        clones_created: 0,
        clones_limit: COST_CONFIG.FREE_MONTHLY_CLONES,
      });

    if (error) throw error;
  },

  /**
   * Update monthly clone count
   */
  async updateMonthlyClones(userId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_clone_count', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Failed to update clone count:', error);
    }
  },

  /**
   * Track usage for analytics
   */
  async trackUsage(
    userId: string,
    voiceProfileId: string | undefined,
    creditsConsumed: number,
    operationType: string
  ): Promise<void> {
    const { error } = await supabase
      .from('voice_cloning_usage')
      .insert({
        user_id: userId,
        voice_profile_id: voiceProfileId,
        credits_consumed: creditsConsumed,
        operation_type: operationType,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });

    if (error) {
      console.error('Failed to track usage:', error);
    }
  },

  /**
   * Get cost configuration
   */
  getCostConfig() {
    return { ...COST_CONFIG };
  },

  /**
   * Calculate TTS cost based on text length
   */
  calculateTTSCost(text: string): number {
    const charCount = text.length;
    return Math.ceil((charCount / 1000) * COST_CONFIG.TTS_1K_CHARS);
  },
};

// SQL function for deducting credits (to be created in Supabase)
export const DEDUCT_CREDITS_SQL = `
CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, p_amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE user_credits
  SET
    credits_used = credits_used + p_amount,
    last_updated = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_clone_count(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO voice_usage_limits (user_id, month_start, clones_created)
  VALUES (p_user_id, DATE_TRUNC('month', CURRENT_DATE), 1)
  ON CONFLICT (user_id, month_start)
  DO UPDATE SET
    clones_created = voice_usage_limits.clones_created + 1;
END;
$$ LANGUAGE plpgsql;
`;