import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/compression.ts";
import { addSecurityHeaders } from "../_shared/securityHeaders.ts";

// Database query timeout (5 seconds)
const DB_TIMEOUT_MS = 5000;

// Lazy-load Supabase client (saves 20-30ms on cold start)
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && supabaseServiceKey) {
      supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    }
  }
  return supabaseClient;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    database: 'up' | 'down' | 'timeout';
    fishAudio: 'configured' | 'not_configured';
    openRouter: 'configured' | 'not_configured';
  };
  latency?: {
    database_ms: number;
  };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const allHeaders = addSecurityHeaders(corsHeaders);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: allHeaders });
  }

  try {
    // Check Supabase database connection using lazy-loaded client
    const supabase = getSupabaseClient();
    let databaseStatus: 'up' | 'down' | 'timeout' = 'down';
    let dbLatency = 0;

    if (supabase) {
      const dbStart = Date.now();

      try {
        // Add timeout protection for database query
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), DB_TIMEOUT_MS);

        const queryPromise = supabase
          .from('audio_tag_presets')
          .select('id')
          .limit(1);

        // Race between query and timeout
        const result = await Promise.race([
          queryPromise,
          new Promise<{ error: { message: string } }>((_, reject) =>
            setTimeout(() => reject(new Error('Database query timeout')), DB_TIMEOUT_MS)
          ),
        ]);

        clearTimeout(timeoutId);
        databaseStatus = result.error ? 'down' : 'up';
        dbLatency = Date.now() - dbStart;
      } catch (error) {
        if (error.message === 'Database query timeout') {
          databaseStatus = 'timeout';
        } else {
          databaseStatus = 'down';
        }
        dbLatency = Date.now() - dbStart;
      }
    }

    // Check if API keys are configured (not their validity, just presence)
    const fishAudioKey = Deno.env.get('FISH_AUDIO_API_KEY');
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');

    const healthStatus: HealthStatus = {
      status: databaseStatus === 'up' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: databaseStatus,
        fishAudio: fishAudioKey ? 'configured' : 'not_configured',
        openRouter: openRouterKey ? 'configured' : 'not_configured',
      },
      latency: {
        database_ms: dbLatency,
      },
    };

    // Determine overall status
    if (databaseStatus === 'down' || databaseStatus === 'timeout') {
      healthStatus.status = 'unhealthy';
    } else if (!fishAudioKey || !openRouterKey) {
      healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'unhealthy' ? 503 : 200;

    return new Response(
      JSON.stringify(healthStatus, null, 2),
      {
        status: statusCode,
        headers: {
          ...allHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Health check error:', error);

    const unhealthyStatus: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: 'down',
        fishAudio: 'not_configured',
        openRouter: 'not_configured',
      },
    };

    return new Response(
      JSON.stringify(unhealthyStatus, null, 2),
      {
        status: 503,
        headers: {
          ...allHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
