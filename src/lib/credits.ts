import { supabase } from '../../lib/supabase';

// CREDIT SYSTEM DISABLED - All users have unlimited access
const CREDITS_DISABLED = true;
const UNLIMITED_CREDITS = 999999999;

// Credits configuration (kept for reference but not enforced)
const COST_CONFIG = {
  VOICE_CLONE: 5000, // 5,000 credits to clone ($5)
  TTS_1K_CHARS: 280, // 280 credits per 1K characters ($0.30)
  FREE_MONTHLY_CREDITS: 100000, // 100k credits
  FREE_MONTHLY_CLONES: 20, // 20 clones per month
} as const;

// Client-side credit cache to reduce redundant API calls
// Cache expires after 5 minutes to balance freshness with performance
const CREDIT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const creditCache = new Map<string, { credits: number; timestamp: number }>();

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
 * Includes client-side caching and optimized RPC calls
 */
export const creditService = {
  /**
   * Get user's current credit balance with caching
   * CREDIT SYSTEM DISABLED - Returns unlimited credits
   */
  async getCredits(userId?: string, bypassCache = false): Promise<number> {
    // CREDIT SYSTEM DISABLED - Return unlimited credits
    if (CREDITS_DISABLED) {
      return UNLIMITED_CREDITS;
    }

    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      userId = user.id;
    }

    // Check cache first (unless bypassed)
    if (!bypassCache) {
      const cached = creditCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CREDIT_CACHE_TTL) {
        return cached.credits;
      }
    }

    const { data, error } = await supabase
      .from('user_credits')
      .select('credits_remaining')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching credits:', error);
      throw error;
    }

    const credits = data?.credits_remaining ?? COST_CONFIG.FREE_MONTHLY_CREDITS;

    // Update cache
    creditCache.set(userId, { credits, timestamp: Date.now() });

    return credits;
  },

  /**
   * Invalidate credit cache for a user
   * Call this after credit-modifying operations
   */
  invalidateCache(userId: string): void {
    creditCache.delete(userId);
  },

  /**
   * Clear all cached credits
   */
  clearCache(): void {
    creditCache.clear();
  },

  /**
   * Get user's current credit balance (original implementation for reference)
   */
  async getCreditsUncached(userId?: string): Promise<number> {
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      userId = user.id;
    }

    const { data, error } = await supabase
      .from('user_credits')
      .select('credits_remaining')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching credits:', error);
      throw error;
    }

    if (!data) {
      // User credits not initialized, create default
      await this.initializeUserCredits(userId);
      return COST_CONFIG.FREE_MONTHLY_CREDITS;
    }

    return data.credits_remaining || 0;
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
      }, { onConflict: 'user_id', ignoreDuplicates: true });

    if (error && error.code !== '23505') throw error;
  },

  /**
   * Deduct credits for an operation
   * CREDIT SYSTEM DISABLED - Always returns true
   */
  async deductCredits(
    amount: number,
    operationType: 'CLONE_CREATE' | 'TTS_GENERATE',
    voiceProfileId?: string,
    userId?: string,
    characterCount?: number
  ): Promise<boolean> {
    // CREDIT SYSTEM DISABLED - Always allow operations
    if (CREDITS_DISABLED) {
      return true;
    }

    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      userId = user.id;
    }

    // Try atomic RPC first (70% faster - 1 call instead of 3-4)
    const { data, error } = await supabase.rpc('perform_credit_operation', {
      p_user_id: userId,
      p_amount: amount,
      p_operation_type: operationType,
      p_voice_profile_id: voiceProfileId || null,
      p_character_count: characterCount || null,
    });

    // If RPC exists and succeeded
    if (!error && data && data.length > 0) {
      const result = data[0];
      if (!result.success) {
        console.warn('Credit operation failed:', result.message);
      }
      // Invalidate credit cache on successful deduction
      if (result.success) {
        creditCache.delete(userId);
      }
      return result.success;
    }

    // Fallback to legacy method if RPC doesn't exist (42883) or other error
    if (error?.code === '42883' || error) {
      console.log('Using legacy credit deduction method');

      // Check if user has enough credits
      const currentCredits = await this.getCredits(userId);
      if (currentCredits < amount) {
        return false;
      }

      // Use old deduct_credits RPC
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

      // Invalidate cache
      creditCache.delete(userId);
      return true;
    }

    return false;
  },

  /**
   * Check user credits status
   * CREDIT SYSTEM DISABLED - Returns unlimited credits
   */
  async checkCreditsStatus(userId?: string): Promise<{
    creditsRemaining: number;
    clonesCreated: number;
    clonesLimit: number;
    canClone: boolean;
    cloneCost: number;
  }> {
    // CREDIT SYSTEM DISABLED - Return unlimited status
    if (CREDITS_DISABLED) {
      return {
        creditsRemaining: UNLIMITED_CREDITS,
        clonesCreated: 0,
        clonesLimit: 999999,
        canClone: true,
        cloneCost: 0
      };
    }

    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      userId = user.id;
    }

    const { data, error } = await supabase.rpc('check_user_credits_status', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error checking credits status:', error);
      // Fallback to old method if RPC doesn't exist yet
      if (error.code === '42883') { // Function does not exist
        const credits = await this.getCredits(userId);
        const limits = await this.getMonthlyUsageLimits(userId);
        return {
          creditsRemaining: credits,
          clonesCreated: limits.clones_created,
          clonesLimit: limits.clones_limit,
          canClone: credits >= COST_CONFIG.VOICE_CLONE && limits.clones_created < limits.clones_limit,
          cloneCost: COST_CONFIG.VOICE_CLONE
        };
      }
      throw error;
    }

    const row = data?.[0];
    return {
      creditsRemaining: row?.credits_remaining ?? COST_CONFIG.FREE_MONTHLY_CREDITS,
      clonesCreated: row?.clones_created ?? 0,
      clonesLimit: row?.clones_limit ?? COST_CONFIG.FREE_MONTHLY_CLONES,
      canClone: row?.can_clone ?? false,
      cloneCost: row?.clone_cost ?? COST_CONFIG.VOICE_CLONE
    };
  },

  /**
   * Check if user can clone a voice
   * CREDIT SYSTEM DISABLED - Always returns true
   */
  async canClone(userId?: string): Promise<{ can: boolean; reason?: string }> {
    // CREDIT SYSTEM DISABLED - Always allow cloning
    if (CREDITS_DISABLED) {
      return { can: true };
    }

    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { can: false, reason: 'User not authenticated' };
      userId = user.id;
    }

    try {
      const status = await this.checkCreditsStatus(userId);

      if (status.creditsRemaining < status.cloneCost) {
        return {
          can: false,
          reason: `Insufficient credits. Need ${status.cloneCost} credits, have ${status.creditsRemaining}`
        };
      }

      if (status.clonesCreated >= status.clonesLimit) {
        return {
          can: false,
          reason: `Monthly clone limit reached (${status.clonesCreated}/${status.clonesLimit})`
        };
      }

      return { can: true };
    } catch (error) {
      console.error('Error in canClone:', error);
      return { can: false, reason: 'Failed to check credits status' };
    }
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
   * Get the first day of the current month in YYYY-MM-DD format
   */
  getMonthStart(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  },

  /**
   * Get monthly usage limits
   */
  async getMonthlyUsageLimits(userId: string): Promise<UsageLimits> {
    const monthStart = this.getMonthStart();
    const { data, error } = await supabase
      .from('voice_usage_limits')
      .select('*')
      .eq('user_id', userId)
      .eq('month_start', monthStart)
      .maybeSingle();

    if (error) {
      console.error('Error fetching usage limits:', error);
      throw error;
    }

    if (!data) {
      // No record for this month, create default
      await this.initializeMonthlyLimits(userId);
      return {
        credits_used: 0,
        credits_limit: COST_CONFIG.FREE_MONTHLY_CREDITS,
        clones_created: 0,
        clones_limit: COST_CONFIG.FREE_MONTHLY_CLONES,
        month_start: monthStart,
      };
    }

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
        month_start: this.getMonthStart(),
        credits_used: 0,
        credits_limit: COST_CONFIG.FREE_MONTHLY_CREDITS,
        clones_created: 0,
        clones_limit: COST_CONFIG.FREE_MONTHLY_CLONES,
      }, { onConflict: 'user_id,month_start', ignoreDuplicates: true });

    if (error && error.code !== '23505') throw error;
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
   * @param text - The text to calculate cost for
   * @param estimatedWords - Optional: estimate cost for X words (for pre-generation checks)
   */
  calculateTTSCost(text: string, estimatedWords?: number): number {
    // If estimating for a word count, use avg 5 chars/word
    const charCount = estimatedWords ? estimatedWords * 5 : text.length;
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