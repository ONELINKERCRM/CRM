import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  provider: string;
  model: string;
  apiKey?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

// Provider API endpoints
const PROVIDER_ENDPOINTS: Record<string, string> = {
  lovable: 'https://ai.gateway.lovable.dev/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  google: 'https://generativelanguage.googleapis.com/v1beta/models',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
  xai: 'https://api.x.ai/v1/chat/completions',
  cohere: 'https://api.cohere.ai/v1/chat',
  together: 'https://api.together.xyz/v1/chat/completions',
  perplexity: 'https://api.perplexity.ai/chat/completions',
  fireworks: 'https://api.fireworks.ai/inference/v1/chat/completions',
  replicate: 'https://api.replicate.com/v1/predictions',
  ai21: 'https://api.ai21.com/studio/v1/chat/completions',
  cerebras: 'https://api.cerebras.ai/v1/chat/completions',
  sambanova: 'https://api.sambanova.ai/v1/chat/completions',
};

// Handle OpenAI-compatible API calls (most providers)
async function callOpenAICompatible(
  endpoint: string,
  apiKey: string,
  messages: ChatMessage[],
  model: string,
  temperature: number,
  maxTokens: number,
  stream: boolean
): Promise<Response> {
  console.log(`Calling OpenAI-compatible API: ${endpoint}, model: ${model}`);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream,
    }),
  });

  return response;
}

// Handle Anthropic API (different format)
async function callAnthropic(
  apiKey: string,
  messages: ChatMessage[],
  model: string,
  temperature: number,
  maxTokens: number,
  stream: boolean
): Promise<Response> {
  console.log(`Calling Anthropic API, model: ${model}`);
  
  // Extract system message and convert format
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const chatMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role,
      content: m.content,
    }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system: systemMessage,
      messages: chatMessages,
      max_tokens: maxTokens,
      temperature,
      stream,
    }),
  });

  return response;
}

// Handle Google AI API (different format)
async function callGoogle(
  apiKey: string,
  messages: ChatMessage[],
  model: string,
  temperature: number,
  maxTokens: number,
  stream: boolean
): Promise<Response> {
  console.log(`Calling Google AI API, model: ${model}`);
  
  // Convert messages to Google format
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find(m => m.role === 'system')?.content;

  const endpoint = stream
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return response;
}

// Handle Cohere API (different format)
async function callCohere(
  apiKey: string,
  messages: ChatMessage[],
  model: string,
  temperature: number,
  maxTokens: number,
  stream: boolean
): Promise<Response> {
  console.log(`Calling Cohere API, model: ${model}`);
  
  // Extract the last user message
  const lastMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
  
  // Convert chat history
  const chatHistory = messages
    .slice(0, -1)
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'CHATBOT' : 'USER',
      message: m.content,
    }));

  const preamble = messages.find(m => m.role === 'system')?.content;

  const response = await fetch('https://api.cohere.ai/v1/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      message: lastMessage,
      chat_history: chatHistory,
      preamble,
      temperature,
      max_tokens: maxTokens,
      stream,
    }),
  });

  return response;
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      messages,
      provider,
      model,
      apiKey,
      systemPrompt,
      temperature = 0.7,
      maxTokens = 1000,
      stream = false,
    }: ChatRequest = await req.json();

    console.log(`Chat request - Provider: ${provider}, Model: ${model}, Stream: ${stream}`);

    // Prepare messages with system prompt
    const fullMessages: ChatMessage[] = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    // Get API key - use Lovable's key for 'lovable' provider
    const finalApiKey = provider === 'lovable'
      ? Deno.env.get('LOVABLE_API_KEY') || ''
      : apiKey || '';

    if (!finalApiKey) {
      console.error(`No API key provided for provider: ${provider}`);
      return new Response(
        JSON.stringify({ error: `API key required for ${provider}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let response: Response;

    // Route to appropriate provider
    switch (provider) {
      case 'lovable':
        response = await callOpenAICompatible(
          PROVIDER_ENDPOINTS.lovable,
          finalApiKey,
          fullMessages,
          model,
          temperature,
          maxTokens,
          stream
        );
        break;

      case 'anthropic':
        response = await callAnthropic(
          finalApiKey,
          fullMessages,
          model,
          temperature,
          maxTokens,
          stream
        );
        break;

      case 'google':
        response = await callGoogle(
          finalApiKey,
          fullMessages,
          model,
          temperature,
          maxTokens,
          stream
        );
        break;

      case 'cohere':
        response = await callCohere(
          finalApiKey,
          fullMessages,
          model,
          temperature,
          maxTokens,
          stream
        );
        break;

      case 'openai':
      case 'deepseek':
      case 'groq':
      case 'mistral':
      case 'xai':
      case 'together':
      case 'perplexity':
      case 'fireworks':
      case 'ai21':
      case 'cerebras':
      case 'sambanova':
        response = await callOpenAICompatible(
          PROVIDER_ENDPOINTS[provider],
          finalApiKey,
          fullMessages,
          model,
          temperature,
          maxTokens,
          stream
        );
        break;

      case 'replicate':
        // Replicate has a different API - simplified for now
        console.log('Replicate support coming soon');
        return new Response(
          JSON.stringify({ error: 'Replicate support coming soon' }),
          { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'custom':
        // For custom APIs, use OpenAI-compatible format
        response = await callOpenAICompatible(
          PROVIDER_ENDPOINTS.openai, // User should provide their own endpoint in future
          finalApiKey,
          fullMessages,
          model,
          temperature,
          maxTokens,
          stream
        );
        break;

      default:
        console.error(`Unknown provider: ${provider}`);
        return new Response(
          JSON.stringify({ error: `Unknown provider: ${provider}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Handle error responses
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Provider ${provider} error:`, response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Provider error: ${errorText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle streaming response
    if (stream) {
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Handle non-streaming response
    const data = await response.json();
    console.log(`Response received from ${provider}`);

    // Normalize response format
    let content = '';
    
    if (provider === 'anthropic') {
      content = data.content?.[0]?.text || '';
    } else if (provider === 'google') {
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (provider === 'cohere') {
      content = data.text || '';
    } else {
      // OpenAI-compatible format
      content = data.choices?.[0]?.message?.content || '';
    }

    return new Response(
      JSON.stringify({
        content,
        provider,
        model,
        usage: data.usage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Chatbot chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
