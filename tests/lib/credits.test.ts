import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockUser, mockCreditsData, mockUsageLimits, mockPerformCreditOperationResponse, createMockSupabase } from '../mocks/supabase';

// Mock the supabase import before importing creditService
vi.mock('../../lib/supabase', () => ({
  supabase: createMockSupabase(),
}));

import { creditService, _testing } from '../../src/lib/credits';
import { supabase } from '../../lib/supabase';

describe('creditService', () => {
  beforeEach(() => {
    // Enable credit system for testing (disabled by default in production)
    _testing.enableCredits();
    vi.clearAllMocks();
    // Clear credit cache before each test to ensure fresh state
    creditService.clearCache();
    // Reset the mock implementation for supabase.from to default
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'user_credits') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockCreditsData, error: null }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
        } as any;
      }
      if (table === 'voice_usage_limits') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockUsageLimits, error: null }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
        } as any;
      }
      if (table === 'voice_cloning_usage') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      } as any;
    });
    // Reset RPC mock
    vi.mocked(supabase.rpc).mockImplementation((fnName: string) => {
      if (fnName === 'check_user_credits_status') {
        return Promise.resolve({ data: [{ credits_remaining: 100000, clones_created: 0, clones_limit: 20, can_clone: true, clone_cost: 5000 }], error: null });
      }
      if (fnName === 'perform_credit_operation') {
        return Promise.resolve({ data: [{ success: true, message: 'Operation successful', credits_remaining: 95000 }], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
  });

  afterEach(() => {
    // Restore credit system to disabled state (production default)
    _testing.disableCredits();
  });

  describe('calculateTTSCost', () => {
    it('should calculate cost for empty string as 0', () => {
      expect(creditService.calculateTTSCost('')).toBe(0);
    });

    it('should calculate cost for 1000 characters as 280 credits', () => {
      const text = 'a'.repeat(1000);
      expect(creditService.calculateTTSCost(text)).toBe(280);
    });

    it('should round up for partial thousands', () => {
      // 1 character = 0.001 * 280 = 0.28, rounds up to 1
      expect(creditService.calculateTTSCost('a')).toBe(1);
    });

    it('should calculate cost for 1001 characters as 281 credits', () => {
      const text = 'a'.repeat(1001);
      // 1001 / 1000 * 280 = 280.28, ceil = 281
      expect(creditService.calculateTTSCost(text)).toBe(281);
    });

    it('should calculate cost for 2000 characters as 560 credits', () => {
      const text = 'a'.repeat(2000);
      expect(creditService.calculateTTSCost(text)).toBe(560);
    });

    it('should calculate cost for very large text (10K chars)', () => {
      const text = 'a'.repeat(10000);
      // 10000 / 1000 * 280 = 2800
      expect(creditService.calculateTTSCost(text)).toBe(2800);
    });

    it('should estimate cost based on word count', () => {
      // 100 words * 5 chars/word = 500 chars
      // 500 / 1000 * 280 = 140
      expect(creditService.calculateTTSCost('', 100)).toBe(140);
    });

    it('should estimate cost for 150 words (typical meditation)', () => {
      // 150 words * 5 chars/word = 750 chars
      // 750 / 1000 * 280 = 210
      expect(creditService.calculateTTSCost('', 150)).toBe(210);
    });

    it('should prefer estimated words over actual text if provided', () => {
      // Text has 5 chars, but we estimate for 100 words
      expect(creditService.calculateTTSCost('hello', 100)).toBe(140);
    });

    it('should handle unicode characters correctly', () => {
      // Unicode chars count as 1 char in JavaScript strings
      const text = '你好世界'.repeat(250); // 1000 chars
      expect(creditService.calculateTTSCost(text)).toBe(280);
    });

    it('should handle emoji correctly', () => {
      // Emoji are typically 2 chars in JavaScript (surrogate pairs)
      const text = '😀'.repeat(500); // Actually 1000 chars due to surrogate pairs
      expect(creditService.calculateTTSCost(text)).toBe(280);
    });
  });

  describe('getCostConfig', () => {
    it('should return immutable copy of cost config', () => {
      const config1 = creditService.getCostConfig();
      const config2 = creditService.getCostConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects
    });

    it('should have correct VOICE_CLONE cost', () => {
      const config = creditService.getCostConfig();
      expect(config.VOICE_CLONE).toBe(5000);
    });

    it('should have correct TTS_1K_CHARS cost', () => {
      const config = creditService.getCostConfig();
      expect(config.TTS_1K_CHARS).toBe(280);
    });

    it('should have correct FREE_MONTHLY_CREDITS', () => {
      const config = creditService.getCostConfig();
      expect(config.FREE_MONTHLY_CREDITS).toBe(100000);
    });

    it('should have correct FREE_MONTHLY_CLONES', () => {
      const config = creditService.getCostConfig();
      expect(config.FREE_MONTHLY_CLONES).toBe(20);
    });
  });

  describe('getCredits', () => {
    it('should return credits for authenticated user', async () => {
      const credits = await creditService.getCredits(mockUser.id);
      expect(credits).toBe(100000);
    });

    it('should fetch current user if no userId provided', async () => {
      const credits = await creditService.getCredits();
      expect(supabase.auth.getUser).toHaveBeenCalled();
    });

    it('should throw error for unauthenticated user with no userId', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      await expect(creditService.getCredits()).rejects.toThrow('User not authenticated');
    });

    it('should initialize credits if user has no record (PGRST116)', async () => {
      const mockFrom = vi.mocked(supabase.from);
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as any);

      // Mock the upsert call for initialization
      mockFrom.mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      const credits = await creditService.getCredits(mockUser.id);
      expect(credits).toBe(100000); // Returns FREE_MONTHLY_CREDITS
    });

    it('should throw on database error when using uncached method', async () => {
      // Reset and set fresh implementation for this test
      vi.mocked(supabase.from).mockReset();
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'OTHER_ERROR', message: 'Database error' },
        }),
      } as any);

      // Use getCreditsUncached which throws on error
      await expect(creditService.getCreditsUncached(mockUser.id)).rejects.toThrow();
    });

    it('should return FREE_MONTHLY_CREDITS if no user credits record exists', async () => {
      // Reset and set fresh implementation for this test
      vi.mocked(supabase.from).mockReset();
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as any);

      // When data is null, returns FREE_MONTHLY_CREDITS (100000) as default
      const credits = await creditService.getCredits(mockUser.id, true); // bypass cache
      expect(credits).toBe(100000);
    });
  });

  describe('canClone', () => {
    it('should return can: true when user has sufficient credits and clones', async () => {
      const result = await creditService.canClone(mockUser.id);
      expect(result.can).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return can: false when user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const result = await creditService.canClone();
      expect(result.can).toBe(false);
      expect(result.reason).toBe('User not authenticated');
    });

    it('should return can: false when credits are insufficient', async () => {
      // Mock RPC to return insufficient credits
      vi.mocked(supabase.rpc).mockImplementationOnce(() =>
        Promise.resolve({
          data: [{ credits_remaining: 4999, clones_created: 0, clones_limit: 20, can_clone: false, clone_cost: 5000 }],
          error: null,
        })
      );

      const result = await creditService.canClone(mockUser.id);
      expect(result.can).toBe(false);
      expect(result.reason).toContain('Insufficient credits');
      expect(result.reason).toContain('5000');
    });

    it('should return can: false when monthly clone limit reached', async () => {
      // Mock RPC to return clones at limit
      vi.mocked(supabase.rpc).mockImplementationOnce(() =>
        Promise.resolve({
          data: [{ credits_remaining: 100000, clones_created: 20, clones_limit: 20, can_clone: false, clone_cost: 5000 }],
          error: null,
        })
      );

      const result = await creditService.canClone(mockUser.id);
      expect(result.can).toBe(false);
      expect(result.reason).toContain('Monthly clone limit reached');
      expect(result.reason).toContain('20/20');
    });

    it('should allow clone when exactly at credit threshold', async () => {
      // Mock RPC to return exactly 5000 credits
      vi.mocked(supabase.rpc).mockImplementationOnce(() =>
        Promise.resolve({
          data: [{ credits_remaining: 5000, clones_created: 0, clones_limit: 20, can_clone: true, clone_cost: 5000 }],
          error: null,
        })
      );

      const result = await creditService.canClone(mockUser.id);
      expect(result.can).toBe(true);
    });
  });

  describe('getClonesRemaining', () => {
    it('should return remaining clones', async () => {
      // Uses the default mock setup in beforeEach which has mockUsageLimits
      const remaining = await creditService.getClonesRemaining(mockUser.id);
      expect(remaining).toBe(20); // clones_limit (20) - clones_created (0)
    });

    it('should return 0 for unauthenticated user', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const remaining = await creditService.getClonesRemaining();
      expect(remaining).toBe(0);
    });

    it('should return 0 when all clones used', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { ...mockUsageLimits, clones_created: 20, clones_limit: 20 },
          error: null,
        }),
      } as any);

      const remaining = await creditService.getClonesRemaining(mockUser.id);
      expect(remaining).toBe(0);
    });

    it('should never return negative (use Math.max)', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { ...mockUsageLimits, clones_created: 25, clones_limit: 20 }, // Over limit
          error: null,
        }),
      } as any);

      const remaining = await creditService.getClonesRemaining(mockUser.id);
      expect(remaining).toBe(0);
      expect(remaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('deductCredits', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      creditService.clearCache();
    });

    it('should deduct credits successfully using atomic RPC', async () => {
      const result = await creditService.deductCredits(
        1000,
        'TTS_GENERATE',
        'voice-123',
        mockUser.id
      );
      expect(result).toBe(true);
      // Check that perform_credit_operation RPC was called (new atomic method)
      expect(supabase.rpc).toHaveBeenCalledWith('perform_credit_operation', {
        p_user_id: mockUser.id,
        p_amount: 1000,
        p_operation_type: 'TTS_GENERATE',
        p_voice_profile_id: 'voice-123',
        p_character_count: null,
      });
    });

    it('should return false when atomic RPC returns insufficient credits', async () => {
      // Mock RPC to return insufficient credits
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [{ success: false, message: 'Insufficient credits', credits_remaining: 500 }],
        error: null,
      });

      const result = await creditService.deductCredits(
        1000,
        'TTS_GENERATE',
        undefined,
        mockUser.id
      );
      expect(result).toBe(false);
    });

    it('should fallback to legacy method when atomic RPC not available', async () => {
      // Mock perform_credit_operation to fail with function not found error
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { code: '42883', message: 'function perform_credit_operation does not exist' },
      });

      // Mock getCredits for legacy check
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { credits_remaining: 100000 },
          error: null,
        }),
      } as any);

      // Mock legacy deduct_credits RPC
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock insert for trackUsage
      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      const result = await creditService.deductCredits(
        100,
        'TTS_GENERATE',
        undefined,
        mockUser.id
      );
      expect(result).toBe(true);
    });

    it('should return false when legacy RPC also fails', async () => {
      // Mock perform_credit_operation to fail with function not found error
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { code: '42883', message: 'function perform_credit_operation does not exist' },
      });

      // Mock getCredits for legacy check
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { credits_remaining: 100000 },
          error: null,
        }),
      } as any);

      // Mock legacy deduct_credits RPC to fail
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' },
      });

      const result = await creditService.deductCredits(
        100,
        'TTS_GENERATE',
        undefined,
        mockUser.id
      );
      expect(result).toBe(false);
    });

    it('should use atomic RPC which handles clone count internally', async () => {
      // The atomic RPC handles everything in one transaction
      // So no separate updateMonthlyClones call is needed
      const result = await creditService.deductCredits(
        5000,
        'CLONE_CREATE',
        'voice-123',
        mockUser.id
      );

      expect(result).toBe(true);
      // Verify atomic RPC was called with CLONE_CREATE operation type
      expect(supabase.rpc).toHaveBeenCalledWith('perform_credit_operation', {
        p_user_id: mockUser.id,
        p_amount: 5000,
        p_operation_type: 'CLONE_CREATE',
        p_voice_profile_id: 'voice-123',
        p_character_count: null,
      });
    });

    it('should invalidate cache after successful deduction', async () => {
      // First, populate the cache
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { credits_remaining: 100000 },
          error: null,
        }),
      } as any);
      await creditService.getCredits(mockUser.id);

      // Now deduct credits
      await creditService.deductCredits(
        1000,
        'TTS_GENERATE',
        'voice-123',
        mockUser.id
      );

      // After deduction, cache should be invalidated
      // Next getCredits call should hit the database
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { credits_remaining: 99000 },
          error: null,
        }),
      } as any);

      const credits = await creditService.getCredits(mockUser.id);
      expect(credits).toBe(99000);
    });
  });

  describe('getMonthlyUsageLimits', () => {
    it('should return current month limits', async () => {
      const limits = await creditService.getMonthlyUsageLimits(mockUser.id);
      expect(limits.credits_limit).toBe(100000);
      expect(limits.clones_limit).toBe(20);
    });

    it('should initialize limits if not found (PGRST116)', async () => {
      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      } as any);

      // Mock upsert for initialization
      vi.mocked(supabase.from).mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      const limits = await creditService.getMonthlyUsageLimits(mockUser.id);
      expect(limits.credits_used).toBe(0);
      expect(limits.clones_created).toBe(0);
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      creditService.clearCache();
    });

    it('should handle concurrent deduction attempts safely', async () => {
      // Simulate two concurrent deductions - both use atomic RPC
      const promise1 = creditService.deductCredits(5000, 'CLONE_CREATE', 'v1', mockUser.id);
      const promise2 = creditService.deductCredits(5000, 'CLONE_CREATE', 'v2', mockUser.id);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Both should call perform_credit_operation RPC (atomic operation)
      const atomicCalls = vi.mocked(supabase.rpc).mock.calls.filter(
        call => call[0] === 'perform_credit_operation'
      );
      expect(atomicCalls.length).toBe(2);
    });

    it('should handle credits exactly at cost threshold (via atomic RPC)', async () => {
      // Mock atomic RPC to succeed (it handles the credit check internally)
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [{ success: true, message: 'Operation successful', credits_remaining: 0 }],
        error: null,
      });

      const result = await creditService.deductCredits(5000, 'CLONE_CREATE', 'v1', mockUser.id);
      expect(result).toBe(true);
    });

    it('should reject deduction when credits are 1 below cost (via atomic RPC)', async () => {
      // Mock atomic RPC to return insufficient credits
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [{ success: false, message: 'Insufficient credits', credits_remaining: 4999 }],
        error: null,
      });

      const result = await creditService.deductCredits(5000, 'CLONE_CREATE', 'v1', mockUser.id);
      expect(result).toBe(false);
    });
  });
});
