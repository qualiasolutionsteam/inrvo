/**
 * Marketing Portal Supabase Service Layer
 * CRUD operations for all marketing tables
 */

import { supabase, withRetry } from '../../lib/supabase';
// NOTE: localStorage caching disabled - all data fetched fresh from Supabase
// This improves reliability at the cost of slightly more API calls
import type {
  MarketingDeliverable,
  MarketingClientInput,
  MarketingContentCalendar,
  MarketingInfluencer,
  MarketingPartnership,
  MarketingReport,
  MarketingCommunication,
  MarketingDocument,
  MarketingDashboardStats,
  CategoryProgress,
  DeliverableCategory,
  DeliverableStatus,
  CalendarStatus,
  InfluencerStatus,
  PartnershipStatus,
} from '../types/marketing';

const DEBUG = true; // Force debug logging to trace loading issues

// Check if error is due to missing table
function isTableMissingError(error: any): boolean {
  const msg = String(error?.message || error?.code || '');
  return msg.includes('relation') && msg.includes('does not exist');
}

// Empty defaults for graceful degradation
const EMPTY_STATS: MarketingDashboardStats = {
  totalDeliverables: 0,
  completedDeliverables: 0,
  inProgressDeliverables: 0,
  pendingReviewDeliverables: 0,
  upcomingContent: 0,
  activeInfluencers: 0,
  activePartnerships: 0,
  unreadMessages: 0,
};

// ============================================================================
// Dashboard Analytics
// ============================================================================

export async function getMarketingDashboardStats(): Promise<MarketingDashboardStats> {
  console.log('[marketingSupabase] getMarketingDashboardStats called, supabase:', !!supabase);

  if (!supabase) {
    console.warn('[marketingSupabase] Supabase not configured, returning empty stats');
    return EMPTY_STATS;
  }

  try {
    console.log('[marketingSupabase] Starting dashboard stats queries...');
    const [
      deliverablesRes,
      calendarRes,
      influencersRes,
      partnershipsRes,
      communicationsRes,
    ] = await Promise.all([
      supabase.from('marketing_deliverables').select('status'),
      supabase.from('marketing_content_calendar').select('id').gte('scheduled_date', new Date().toISOString().split('T')[0]),
      supabase.from('marketing_influencers').select('id').in('status', ['contacted', 'negotiating', 'agreed', 'content_live']),
      supabase.from('marketing_partnerships').select('id').in('status', ['outreach', 'discussing', 'agreed', 'active']),
      supabase.from('marketing_communications').select('id').eq('is_resolved', false),
    ]);

    console.log('[marketingSupabase] All dashboard queries completed');
    console.log('[marketingSupabase] deliverablesRes.error:', deliverablesRes.error);
    console.log('[marketingSupabase] calendarRes.error:', calendarRes.error);
    console.log('[marketingSupabase] influencersRes.error:', influencersRes.error);

    // Check for table-not-found errors and return empty data gracefully
    if (deliverablesRes.error && isTableMissingError(deliverablesRes.error)) {
      console.warn('[marketingSupabase] Marketing tables not found, returning empty stats');
      return EMPTY_STATS;
    }

    const deliverables = deliverablesRes.data || [];
    const completedCount = deliverables.filter(d => d.status === 'completed').length;
    const inProgressCount = deliverables.filter(d => d.status === 'in_progress').length;
    const pendingReviewCount = deliverables.filter(d => d.status === 'pending_review').length;

    const result: MarketingDashboardStats = {
      totalDeliverables: deliverables.length,
      completedDeliverables: completedCount,
      inProgressDeliverables: inProgressCount,
      pendingReviewDeliverables: pendingReviewCount,
      upcomingContent: calendarRes.data?.length || 0,
      activeInfluencers: influencersRes.data?.length || 0,
      activePartnerships: partnershipsRes.data?.length || 0,
      unreadMessages: communicationsRes.data?.length || 0,
    };

    return result;
  } catch (error) {
    if (isTableMissingError(error)) {
      if (DEBUG) console.warn('[marketingSupabase] Marketing tables not found, returning empty stats');
      return EMPTY_STATS;
    }
    throw error;
  }
}

export async function getCategoryProgress(): Promise<CategoryProgress[]> {
  const categories: DeliverableCategory[] = ['strategy', 'social', 'influencer', 'analytics'];
  const emptyProgress = categories.map(category => ({ category, total: 0, completed: 0, progress: 0 }));

  if (!supabase) {
    if (DEBUG) console.warn('[marketingSupabase] Supabase not configured');
    return emptyProgress;
  }

  try {
    const { data, error } = await supabase
      .from('marketing_deliverables')
      .select('category, status, progress');

    if (error) {
      if (isTableMissingError(error)) {
        if (DEBUG) console.warn('[marketingSupabase] marketing_deliverables table not found');
        return emptyProgress;
      }
      throw error;
    }

    return categories.map(category => {
      const items = data?.filter(d => d.category === category) || [];
      const total = items.length;
      const completed = items.filter(d => d.status === 'completed').length;
      const avgProgress = total > 0
        ? Math.round(items.reduce((sum, d) => sum + (d.progress || 0), 0) / total)
        : 0;

      return {
        category,
        total,
        completed,
        progress: avgProgress,
      };
    });
  } catch (error) {
    if (isTableMissingError(error)) {
      return emptyProgress;
    }
    throw error;
  }
}

// ============================================================================
// Deliverables CRUD
// ============================================================================

export async function getDeliverables(
  options?: {
    category?: DeliverableCategory;
    status?: DeliverableStatus;
  }
): Promise<MarketingDeliverable[]> {
  if (!supabase) {
    if (DEBUG) console.warn('[marketingSupabase] Supabase not configured');
    return [];
  }

  try {
    let query = supabase
      .from('marketing_deliverables')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false });

    if (options?.category) {
      query = query.eq('category', options.category);
    }
    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;

    if (error) {
      if (isTableMissingError(error)) {
        if (DEBUG) console.warn('[marketingSupabase] marketing_deliverables table not found');
        return [];
      }
      throw error;
    }

    if (DEBUG) console.log('[marketingSupabase] Fetched deliverables:', data?.length);
    return data || [];
  } catch (error) {
    if (isTableMissingError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getDeliverablesByCategory(): Promise<Record<DeliverableCategory, MarketingDeliverable[]>> {
  const all = await getDeliverables();

  const result: Record<DeliverableCategory, MarketingDeliverable[]> = {
    strategy: [],
    social: [],
    influencer: [],
    analytics: [],
  };

  all.forEach(d => {
    if (d.category in result) {
      result[d.category].push(d);
    }
  });

  return result;
}

export async function updateDeliverableStatus(
  id: string,
  status: DeliverableStatus,
  progress?: number
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const updates: Partial<MarketingDeliverable> = { status };
    if (progress !== undefined) {
      updates.progress = progress;
    }
    if (status === 'completed') {
      updates.progress = 100;
    }

    const { error } = await supabase!
      .from('marketing_deliverables')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  });
}

export async function updateDeliverableFeedback(
  id: string,
  feedback: string
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { error } = await supabase!
      .from('marketing_deliverables')
      .update({ client_feedback: feedback })
      .eq('id', id);

    if (error) throw error;
  });
}

// ============================================================================
// Client Inputs CRUD
// ============================================================================

export async function getClientInputs(): Promise<MarketingClientInput[]> {
  if (!supabase) {
    if (DEBUG) console.warn('[marketingSupabase] Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('marketing_client_inputs')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      if (isTableMissingError(error)) {
        if (DEBUG) console.warn('[marketingSupabase] marketing_client_inputs table not found');
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error) {
    if (isTableMissingError(error)) {
      return [];
    }
    console.error('[marketingSupabase] Error fetching client inputs:', error);
    return [];
  }
}

export async function updateClientInput(
  id: string,
  content: string
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { error } = await supabase!
      .from('marketing_client_inputs')
      .update({ content })
      .eq('id', id);

    if (error) throw error;
  });
}

export async function createClientInput(
  input: Omit<MarketingClientInput, 'id' | 'submitted_at'>
): Promise<MarketingClientInput> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { data, error } = await supabase!
      .from('marketing_client_inputs')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  });
}

// ============================================================================
// Content Calendar CRUD
// ============================================================================

export async function getContentCalendar(
  options?: {
    startDate?: string;
    endDate?: string;
    platform?: string;
    status?: CalendarStatus;
  }
): Promise<MarketingContentCalendar[]> {
  if (!supabase) {
    if (DEBUG) console.warn('[marketingSupabase] Supabase not configured');
    return [];
  }

  try {
    let query = supabase
      .from('marketing_content_calendar')
      .select('*')
      .order('scheduled_date', { ascending: true });

    if (options?.startDate) {
      query = query.gte('scheduled_date', options.startDate);
    }
    if (options?.endDate) {
      query = query.lte('scheduled_date', options.endDate);
    }
    if (options?.platform) {
      query = query.eq('platform', options.platform);
    }
    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;
    if (error) {
      if (isTableMissingError(error)) {
        if (DEBUG) console.warn('[marketingSupabase] marketing_content_calendar table not found');
        return [];
      }
      throw error;
    }

    return data || [];
  } catch (error) {
    if (isTableMissingError(error)) {
      return [];
    }
    console.error('[marketingSupabase] Error fetching content calendar:', error);
    return [];
  }
}

export async function approveContent(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { error } = await supabase!
      .from('marketing_content_calendar')
      .update({ client_approved: true, status: 'approved' })
      .eq('id', id);

    if (error) throw error;
  });
}

export async function requestContentChanges(
  id: string,
  feedback: string
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    // Create a communication for the feedback
    await supabase!
      .from('marketing_communications')
      .insert({
        communication_type: 'feedback',
        title: 'Content Change Request',
        content: feedback,
        from_agency: false,
      });

    // Update content status back to created
    const { error } = await supabase!
      .from('marketing_content_calendar')
      .update({ status: 'created', client_approved: false })
      .eq('id', id);

    if (error) throw error;
  });
}

// ============================================================================
// Influencers CRUD
// ============================================================================

export async function getInfluencers(
  options?: { status?: InfluencerStatus }
): Promise<MarketingInfluencer[]> {
  if (!supabase) {
    if (DEBUG) console.warn('[marketingSupabase] Supabase not configured');
    return [];
  }

  try {
    let query = supabase
      .from('marketing_influencers')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;
    if (error) {
      if (isTableMissingError(error)) {
        if (DEBUG) console.warn('[marketingSupabase] marketing_influencers table not found');
        return [];
      }
      throw error;
    }

    return data || [];
  } catch (error) {
    if (isTableMissingError(error)) {
      return [];
    }
    console.error('[marketingSupabase] Error fetching influencers:', error);
    return [];
  }
}

export async function getInfluencersByStatus(): Promise<Record<InfluencerStatus, MarketingInfluencer[]>> {
  const all = await getInfluencers();

  const result: Record<InfluencerStatus, MarketingInfluencer[]> = {
    researching: [],
    contacted: [],
    negotiating: [],
    agreed: [],
    content_live: [],
    completed: [],
    declined: [],
  };

  all.forEach(inf => {
    if (inf.status in result) {
      result[inf.status].push(inf);
    }
  });

  return result;
}

export async function updateInfluencerStatus(
  id: string,
  status: InfluencerStatus
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { error } = await supabase!
      .from('marketing_influencers')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  });
}

export async function suggestInfluencer(
  suggestion: {
    name: string;
    handle?: string;
    platform: string;
    notes?: string;
  }
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  // Create a communication for the suggestion
  await supabase!
    .from('marketing_communications')
    .insert({
      communication_type: 'feedback',
      title: 'Influencer Suggestion',
      content: `Suggested influencer: ${suggestion.name} (@${suggestion.handle || 'N/A'}) on ${suggestion.platform}. Notes: ${suggestion.notes || 'None'}`,
      from_agency: false,
    });
}

// ============================================================================
// Partnerships CRUD
// ============================================================================

export async function getPartnerships(
  options?: { status?: PartnershipStatus }
): Promise<MarketingPartnership[]> {
  if (!supabase) {
    if (DEBUG) console.warn('[marketingSupabase] Supabase not configured');
    return [];
  }

  try {
    let query = supabase
      .from('marketing_partnerships')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;
    if (error) {
      if (isTableMissingError(error)) {
        if (DEBUG) console.warn('[marketingSupabase] marketing_partnerships table not found');
        return [];
      }
      throw error;
    }

    return data || [];
  } catch (error) {
    if (isTableMissingError(error)) {
      return [];
    }
    console.error('[marketingSupabase] Error fetching partnerships:', error);
    return [];
  }
}

export async function suggestPartnership(
  suggestion: {
    organization_name: string;
    partnership_type?: string;
    notes?: string;
  }
): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  // Create a communication for the suggestion
  await supabase!
    .from('marketing_communications')
    .insert({
      communication_type: 'feedback',
      title: 'Partnership Suggestion',
      content: `Suggested partner: ${suggestion.organization_name} (${suggestion.partnership_type || 'TBD'}). Notes: ${suggestion.notes || 'None'}`,
      from_agency: false,
    });
}

// ============================================================================
// Reports CRUD
// ============================================================================

export async function getReports(
  options?: { limit?: number }
): Promise<MarketingReport[]> {
  if (!supabase) {
    if (DEBUG) console.warn('[marketingSupabase] Supabase not configured');
    return [];
  }

  try {
    let query = supabase
      .from('marketing_reports')
      .select('*')
      .order('report_date', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      if (isTableMissingError(error)) {
        if (DEBUG) console.warn('[marketingSupabase] marketing_reports table not found');
        return [];
      }
      throw error;
    }

    return data || [];
  } catch (error) {
    if (isTableMissingError(error)) {
      return [];
    }
    console.error('[marketingSupabase] Error fetching reports:', error);
    return [];
  }
}

export async function acknowledgeReport(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { error } = await supabase!
      .from('marketing_reports')
      .update({ client_acknowledged: true })
      .eq('id', id);

    if (error) throw error;
  });
}

// ============================================================================
// Communications CRUD
// ============================================================================

export async function getCommunications(
  options?: { unreadOnly?: boolean; limit?: number }
): Promise<MarketingCommunication[]> {
  if (!supabase) {
    if (DEBUG) console.warn('[marketingSupabase] Supabase not configured');
    return [];
  }

  try {
    let query = supabase
      .from('marketing_communications')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.unreadOnly) {
      query = query.eq('is_resolved', false);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      if (isTableMissingError(error)) {
        if (DEBUG) console.warn('[marketingSupabase] marketing_communications table not found');
        return [];
      }
      throw error;
    }

    return data || [];
  } catch (error) {
    if (isTableMissingError(error)) {
      return [];
    }
    console.error('[marketingSupabase] Error fetching communications:', error);
    return [];
  }
}

export async function createCommunication(
  communication: Omit<MarketingCommunication, 'id' | 'created_at'>
): Promise<MarketingCommunication> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { data, error } = await supabase!
      .from('marketing_communications')
      .insert(communication)
      .select()
      .single();

    if (error) throw error;
    return data;
  });
}

export async function markCommunicationResolved(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { error } = await supabase!
      .from('marketing_communications')
      .update({ is_resolved: true })
      .eq('id', id);

    if (error) throw error;
  });
}

// ============================================================================
// Documents CRUD
// ============================================================================

export async function getDocuments(
  options?: { type?: string; clientVisible?: boolean }
): Promise<MarketingDocument[]> {
  if (!supabase) {
    if (DEBUG) console.warn('[marketingSupabase] Supabase not configured');
    return [];
  }

  try {
    let query = supabase
      .from('marketing_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.type) {
      query = query.eq('document_type', options.type);
    }

    const { data, error } = await query;
    if (error) {
      if (isTableMissingError(error)) {
        if (DEBUG) console.warn('[marketingSupabase] marketing_documents table not found');
        return [];
      }
      throw error;
    }

    return data || [];
  } catch (error) {
    if (isTableMissingError(error)) {
      return [];
    }
    console.error('[marketingSupabase] Error fetching documents:', error);
    return [];
  }
}

export async function approveDocument(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');

  return withRetry(async () => {
    const { error } = await supabase!
      .from('marketing_documents')
      .update({ client_approved: true, status: 'approved' })
      .eq('id', id);

    if (error) throw error;
  });
}
