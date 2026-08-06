// AI Chat Proxy — Supabase Edge Function
//
// Holds the OpenRouter API key as a server secret and meters usage against
// the caller's credit balance. The browser never sees the key.
//
// Deploy:
//   supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...
//   supabase functions deploy ai-chat
//
// Request (POST, Authorization: Bearer <supabase user JWT>):
//   { model?: string, messages: {role, content}[], max_tokens?: number,
//     temperature?: number, feature?: string }
// Response:
//   200 { content, usage, cost, balance }
//   401 not signed in · 402 insufficient credits · 400 bad request
//   502 upstream (OpenRouter) error

import { createClient } from 'npm:@supabase/supabase-js@2';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Models callable through the proxy. Overridable via the ALLOWED_MODELS
// secret (comma-separated). Any ':free' model is always allowed.
const DEFAULT_ALLOWED_MODELS = [
  'anthropic/claude-sonnet-4',
  'anthropic/claude-sonnet-4.5',
  'openai/gpt-4o-mini',
  'qwen/qwen3-coder:free',
  'meta-llama/llama-3.3-70b-instruct:free',
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function allowedModels(): string[] {
  const env = Deno.env.get('ALLOWED_MODELS');
  return env ? env.split(',').map(m => m.trim()).filter(Boolean) : DEFAULT_ALLOWED_MODELS;
}

/** 1 credit per started 1k tokens for paid models; free models cost nothing. */
function costFor(model: string, totalTokens: number): number {
  if (model.endsWith(':free')) return 0;
  return Math.max(1, Math.ceil(totalTokens / 1000));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'method not allowed' });
  }

  const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!openrouterKey) {
    return json(500, { error: 'AI proxy is not configured (missing OPENROUTER_API_KEY secret)' });
  }

  // --- Authenticate the caller -------------------------------------------
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return json(401, { error: 'not signed in' });
  }

  // --- Validate the request ----------------------------------------------
  let body: {
    model?: string;
    messages?: Array<{ role: string; content: string }>;
    max_tokens?: number;
    temperature?: number;
    feature?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid JSON body' });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
    return json(400, { error: 'messages must be a non-empty array (max 40)' });
  }
  const totalChars = messages.reduce((n, m) => n + (typeof m.content === 'string' ? m.content.length : 0), 0);
  if (totalChars > 200_000) {
    return json(400, { error: 'request too large' });
  }

  const model = body.model && allowedModels().includes(body.model)
    ? body.model
    : allowedModels()[0];
  const maxTokens = Math.min(Math.max(1, body.max_tokens ?? 4096), 8192);
  const temperature = Math.min(Math.max(0, body.temperature ?? 0.7), 1.5);
  const feature = body.feature === 'ai_generation_advanced'
    ? 'ai_generation_advanced'
    : 'ai_generation_basic';

  // --- Pre-check balance (paid models only) ------------------------------
  if (!model.endsWith(':free')) {
    const { data: balanceRow } = await supabase
      .from('credit_balances')
      .select('balance')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (!balanceRow || balanceRow.balance < 1) {
      return json(402, { error: 'insufficient credits' });
    }
  }

  // --- Call OpenRouter ----------------------------------------------------
  const upstream = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openrouterKey}`,
      'HTTP-Referer': req.headers.get('Origin') ?? 'https://stochastic-music.com',
      'X-Title': 'Stochastic Canvas Generator',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  });

  if (!upstream.ok) {
    const detail = await upstream.text();
    return json(502, { error: `upstream error (${upstream.status})`, detail: detail.slice(0, 500) });
  }

  const completion = await upstream.json();
  const content: string = completion.choices?.[0]?.message?.content ?? '';
  const usage = completion.usage ?? {};
  const totalTokens: number = usage.total_tokens
    ?? (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0);

  // --- Meter usage --------------------------------------------------------
  const cost = costFor(model, totalTokens);
  const { data: newBalance, error: consumeError } = await supabase.rpc('consume_ai_credits', {
    p_cost: cost,
    p_feature: feature,
    p_metadata: { model, total_tokens: totalTokens },
  });

  if (consumeError) {
    // The completion already happened; report the metering failure honestly
    // (covers a race where the balance ran out mid-request).
    if (consumeError.message?.includes('insufficient')) {
      return json(402, { error: 'insufficient credits', content });
    }
    return json(500, { error: `credit metering failed: ${consumeError.message}`, content });
  }

  return json(200, { content, usage, cost, balance: newBalance });
});
