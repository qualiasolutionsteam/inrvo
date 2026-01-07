/**
 * Custom hooks for Marketing Portal data fetching
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getMarketingDashboardStats,
  getCategoryProgress,
  getDeliverables,
  getDeliverablesByCategory,
  updateDeliverableStatus,
  updateDeliverableFeedback,
  getClientInputs,
  updateClientInput,
  getContentCalendar,
  approveContent,
  requestContentChanges,
  getInfluencers,
  getInfluencersByStatus,
  updateInfluencerStatus,
  getPartnerships,
  getReports,
  acknowledgeReport,
  getCommunications,
  createCommunication,
  markCommunicationResolved,
  getDocuments,
  approveDocument,
} from '../lib/marketingSupabase';
import type {
  MarketingDashboardStats,
  CategoryProgress,
  MarketingDeliverable,
  MarketingClientInput,
  MarketingContentCalendar,
  MarketingInfluencer,
  MarketingPartnership,
  MarketingReport,
  MarketingCommunication,
  MarketingDocument,
  DeliverableCategory,
  DeliverableStatus,
  InfluencerStatus,
} from '../types/marketing';

// ============================================================================
// Dashboard Hook
// ============================================================================

export interface UseMarketingDashboardResult {
  stats: MarketingDashboardStats | null;
  categoryProgress: CategoryProgress[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMarketingDashboard(): UseMarketingDashboardResult {
  const [stats, setStats] = useState<MarketingDashboardStats | null>(null);
  const [categoryProgress, setCategoryProgress] = useState<CategoryProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    console.log('[useMarketingDashboard] fetchDashboard called');
    setIsLoading(true);
    setError(null);

    try {
      console.log('[useMarketingDashboard] Starting Promise.all...');
      const [statsData, progressData] = await Promise.all([
        getMarketingDashboardStats(),
        getCategoryProgress(),
      ]);

      console.log('[useMarketingDashboard] Data received:', { statsData, progressData });
      setStats(statsData);
      setCategoryProgress(progressData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch dashboard';
      console.error('[useMarketingDashboard] Error:', message, err);
      setError(message);
    } finally {
      console.log('[useMarketingDashboard] Setting isLoading=false');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('[useMarketingDashboard] useEffect triggered, calling fetchDashboard');
    fetchDashboard();
  }, [fetchDashboard]);

  return { stats, categoryProgress, isLoading, error, refetch: fetchDashboard };
}

// ============================================================================
// Deliverables Hook
// ============================================================================

export interface UseDeliverablesResult {
  deliverables: MarketingDeliverable[];
  deliverablesByCategory: Record<DeliverableCategory, MarketingDeliverable[]>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateStatus: (id: string, status: DeliverableStatus, progress?: number) => Promise<void>;
  updateFeedback: (id: string, feedback: string) => Promise<void>;
}

export function useDeliverables(category?: DeliverableCategory): UseDeliverablesResult {
  const [deliverables, setDeliverables] = useState<MarketingDeliverable[]>([]);
  const [deliverablesByCategory, setDeliverablesByCategory] = useState<Record<DeliverableCategory, MarketingDeliverable[]>>({
    strategy: [],
    social: [],
    influencer: [],
    analytics: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeliverables = useCallback(async () => {
    console.log('[useDeliverables] fetchDeliverables called, category:', category);
    setIsLoading(true);
    setError(null);

    try {
      if (category) {
        const data = await getDeliverables({ category });
        console.log('[useDeliverables] Got data for category:', data?.length);
        setDeliverables(data);
      } else {
        const byCategory = await getDeliverablesByCategory();
        console.log('[useDeliverables] Got all deliverables by category');
        setDeliverablesByCategory(byCategory);
        setDeliverables(Object.values(byCategory).flat());
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch deliverables';
      console.error('[useDeliverables] Error:', message, err);
      setError(message);
    } finally {
      console.log('[useDeliverables] Setting isLoading=false');
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    console.log('[useDeliverables] useEffect triggered');
    fetchDeliverables();
  }, [fetchDeliverables]);

  const updateStatus = useCallback(async (id: string, status: DeliverableStatus, progress?: number) => {
    await updateDeliverableStatus(id, status, progress);
    await fetchDeliverables();
  }, [fetchDeliverables]);

  const updateFeedback = useCallback(async (id: string, feedback: string) => {
    await updateDeliverableFeedback(id, feedback);
    await fetchDeliverables();
  }, [fetchDeliverables]);

  return {
    deliverables,
    deliverablesByCategory,
    isLoading,
    error,
    refetch: fetchDeliverables,
    updateStatus,
    updateFeedback,
  };
}

// ============================================================================
// Client Inputs Hook
// ============================================================================

export interface UseClientInputsResult {
  inputs: MarketingClientInput[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateInput: (id: string, content: string) => Promise<void>;
}

export function useClientInputs(): UseClientInputsResult {
  const [inputs, setInputs] = useState<MarketingClientInput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInputs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getClientInputs();
      setInputs(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch client inputs';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInputs();
  }, [fetchInputs]);

  const handleUpdateInput = useCallback(async (id: string, content: string) => {
    await updateClientInput(id, content);
    await fetchInputs();
  }, [fetchInputs]);

  return { inputs, isLoading, error, refetch: fetchInputs, updateInput: handleUpdateInput };
}

// ============================================================================
// Content Calendar Hook
// ============================================================================

export interface UseContentCalendarResult {
  items: MarketingContentCalendar[];
  itemsByDate: Map<string, MarketingContentCalendar[]>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  approve: (id: string) => Promise<void>;
  requestChanges: (id: string, feedback: string) => Promise<void>;
}

export function useContentCalendar(startDate?: string, endDate?: string): UseContentCalendarResult {
  const [items, setItems] = useState<MarketingContentCalendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendar = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getContentCalendar({ startDate, endDate });
      setItems(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch calendar';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, MarketingContentCalendar[]>();
    items.forEach(item => {
      const date = item.scheduled_date;
      const existing = map.get(date) || [];
      map.set(date, [...existing, item]);
    });
    return map;
  }, [items]);

  const approve = useCallback(async (id: string) => {
    await approveContent(id);
    await fetchCalendar();
  }, [fetchCalendar]);

  const handleRequestChanges = useCallback(async (id: string, feedback: string) => {
    await requestContentChanges(id, feedback);
    await fetchCalendar();
  }, [fetchCalendar]);

  return {
    items,
    itemsByDate,
    isLoading,
    error,
    refetch: fetchCalendar,
    approve,
    requestChanges: handleRequestChanges,
  };
}

// ============================================================================
// Influencers Hook
// ============================================================================

export interface UseInfluencersResult {
  influencers: MarketingInfluencer[];
  byStatus: Record<InfluencerStatus, MarketingInfluencer[]>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateStatus: (id: string, status: InfluencerStatus) => Promise<void>;
}

export function useInfluencers(): UseInfluencersResult {
  const [influencers, setInfluencers] = useState<MarketingInfluencer[]>([]);
  const [byStatus, setByStatus] = useState<Record<InfluencerStatus, MarketingInfluencer[]>>({
    researching: [],
    contacted: [],
    negotiating: [],
    agreed: [],
    content_live: [],
    completed: [],
    declined: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInfluencers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [all, grouped] = await Promise.all([
        getInfluencers(),
        getInfluencersByStatus(),
      ]);
      setInfluencers(all);
      setByStatus(grouped);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch influencers';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInfluencers();
  }, [fetchInfluencers]);

  const handleUpdateStatus = useCallback(async (id: string, status: InfluencerStatus) => {
    await updateInfluencerStatus(id, status);
    await fetchInfluencers();
  }, [fetchInfluencers]);

  return {
    influencers,
    byStatus,
    isLoading,
    error,
    refetch: fetchInfluencers,
    updateStatus: handleUpdateStatus,
  };
}

// ============================================================================
// Partnerships Hook
// ============================================================================

export interface UsePartnershipsResult {
  partnerships: MarketingPartnership[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePartnerships(): UsePartnershipsResult {
  const [partnerships, setPartnerships] = useState<MarketingPartnership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPartnerships = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getPartnerships();
      setPartnerships(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch partnerships';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartnerships();
  }, [fetchPartnerships]);

  return { partnerships, isLoading, error, refetch: fetchPartnerships };
}

// ============================================================================
// Reports Hook
// ============================================================================

export interface UseReportsResult {
  reports: MarketingReport[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  acknowledge: (id: string) => Promise<void>;
}

export function useReports(): UseReportsResult {
  const [reports, setReports] = useState<MarketingReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getReports();
      setReports(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch reports';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const acknowledge = useCallback(async (id: string) => {
    await acknowledgeReport(id);
    await fetchReports();
  }, [fetchReports]);

  return { reports, isLoading, error, refetch: fetchReports, acknowledge };
}

// ============================================================================
// Communications Hook
// ============================================================================

export interface UseCommunicationsResult {
  communications: MarketingCommunication[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  sendMessage: (content: string, title?: string) => Promise<void>;
  markResolved: (id: string) => Promise<void>;
}

export function useCommunications(): UseCommunicationsResult {
  const [communications, setCommunications] = useState<MarketingCommunication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommunications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getCommunications();
      setCommunications(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch communications';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunications();
  }, [fetchCommunications]);

  const unreadCount = useMemo(() => {
    return communications.filter(c => !c.is_resolved).length;
  }, [communications]);

  const sendMessage = useCallback(async (content: string, title?: string) => {
    await createCommunication({
      communication_type: 'feedback',
      title: title || null,
      content,
      from_agency: false,
      is_resolved: false,
    });
    await fetchCommunications();
  }, [fetchCommunications]);

  const markResolved = useCallback(async (id: string) => {
    await markCommunicationResolved(id);
    await fetchCommunications();
  }, [fetchCommunications]);

  return {
    communications,
    unreadCount,
    isLoading,
    error,
    refetch: fetchCommunications,
    sendMessage,
    markResolved,
  };
}

// ============================================================================
// Documents Hook
// ============================================================================

export interface UseDocumentsResult {
  documents: MarketingDocument[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  approve: (id: string) => Promise<void>;
}

export function useDocuments(): UseDocumentsResult {
  const [documents, setDocuments] = useState<MarketingDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getDocuments();
      setDocuments(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch documents';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const approve = useCallback(async (id: string) => {
    await approveDocument(id);
    await fetchDocuments();
  }, [fetchDocuments]);

  return { documents, isLoading, error, refetch: fetchDocuments, approve };
}

// ============================================================================
// Global Refresh (no-op since caching is disabled)
// ============================================================================

export function useMarketingRefresh() {
  // No-op: caching has been disabled in favor of direct Supabase fetches
  // Components can still call this, but it doesn't do anything
  return useCallback(() => {
    // Data is fetched fresh on each hook mount/refetch
  }, []);
}
