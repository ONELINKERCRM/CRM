import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type LLMProvider = 'lovable' | 'openai' | 'anthropic' | 'google' | 'deepseek' | 'groq' | 'mistral' | 'xai' | 'cohere' | 'together' | 'perplexity' | 'fireworks' | 'replicate' | 'ai21' | 'cerebras' | 'sambanova' | 'custom';

export interface Chatbot {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  whatsapp_connection_id: string | null;
  llm_provider: LLMProvider;
  llm_model: string;
  llm_api_key_encrypted: string | null;
  system_prompt: string | null;
  welcome_message: string | null;
  qualification_questions: { question: string; field: string }[];
  is_active: boolean;
  auto_create_leads: boolean;
  max_tokens: number;
  temperature: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ChatbotInput {
  name: string;
  description?: string;
  whatsapp_connection_id?: string;
  llm_provider: LLMProvider;
  llm_model: string;
  llm_api_key?: string;
  system_prompt?: string;
  welcome_message?: string;
  qualification_questions?: { question: string; field: string }[];
  is_active?: boolean;
  auto_create_leads?: boolean;
  max_tokens?: number;
  temperature?: number;
}

export const LLM_PROVIDERS: Record<LLMProvider, {
  name: string;
  description: string;
  models: { id: string; name: string; description: string }[];
  requiresApiKey: boolean;
  baseUrl?: string;
}> = {
  lovable: {
    name: 'Lovable AI',
    description: 'Built-in AI (no API key required)',
    models: [
      { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast and efficient' },
      { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Most capable' },
      { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Fastest, cheapest' },
      { id: 'openai/gpt-5', name: 'GPT-5', description: 'Powerful all-rounder' },
      { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', description: 'Fast and affordable' },
    ],
    requiresApiKey: false,
  },
  openai: {
    name: 'OpenAI',
    description: 'GPT models from OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Latest flagship model' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and affordable' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'High capability' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast legacy model' },
    ],
    requiresApiKey: true,
    baseUrl: 'https://api.openai.com/v1',
  },
  anthropic: {
    name: 'Anthropic',
    description: 'Claude models from Anthropic',
    models: [
      { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', description: 'Most intelligent' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Balanced performance' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fastest responses' },
    ],
    requiresApiKey: true,
    baseUrl: 'https://api.anthropic.com',
  },
  google: {
    name: 'Google AI',
    description: 'Gemini models directly from Google',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Latest fast model' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Most capable' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast and efficient' },
    ],
    requiresApiKey: true,
    baseUrl: 'https://generativelanguage.googleapis.com',
  },
  deepseek: {
    name: 'DeepSeek',
    description: 'DeepSeek AI models',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'General purpose chat' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', description: 'Optimized for code' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', description: 'Advanced reasoning' },
    ],
    requiresApiKey: true,
    baseUrl: 'https://api.deepseek.com',
  },
  groq: {
    name: 'Groq',
    description: 'Ultra-fast inference with Groq',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Powerful and fast' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Ultra fast' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Great balance' },
    ],
    requiresApiKey: true,
    baseUrl: 'https://api.groq.com/openai/v1',
  },
  mistral: {
    name: 'Mistral AI',
    description: 'Mistral AI models',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', description: 'Most capable' },
      { id: 'mistral-medium-latest', name: 'Mistral Medium', description: 'Balanced' },
      { id: 'mistral-small-latest', name: 'Mistral Small', description: 'Fast and efficient' },
    ],
    requiresApiKey: true,
    baseUrl: 'https://api.mistral.ai/v1',
  },
  xai: {
    name: 'xAI (Grok)',
    description: 'Grok models from xAI',
    models: [
      { id: 'grok-2', name: 'Grok 2', description: 'Latest flagship model' },
      { id: 'grok-2-mini', name: 'Grok 2 Mini', description: 'Fast and efficient' },
      { id: 'grok-beta', name: 'Grok Beta', description: 'Experimental features' },
    ],
    requiresApiKey: true,
    baseUrl: 'https://api.x.ai/v1',
  },
  cohere: {
    name: 'Cohere',
    description: 'Enterprise-grade AI models',
    models: [
      { id: 'command-r-plus', name: 'Command R+', description: 'Most powerful' },
      { id: 'command-r', name: 'Command R', description: 'Balanced performance' },
      { id: 'command-light', name: 'Command Light', description: 'Fast responses' },
    ],
    requiresApiKey: true,
    baseUrl: 'https://api.cohere.ai/v1',
  },
  together: {
    name: 'Together AI',
    description: 'Open source models hosted by Together',
    models: [
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B', description: 'Powerful open model' },
      { id: 'meta-llama/Llama-3.1-8B-Instruct-Turbo', name: 'Llama 3.1 8B', description: 'Fast and efficient' },
      { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', name: 'Qwen 2.5 72B', description: 'High capability' },
      { id: 'mistralai/Mixtral-8x22B-Instruct-v0.1', name: 'Mixtral 8x22B', description: 'Large MoE model' },
    ],
    requiresApiKey: true,
    baseUrl: 'https://api.together.xyz/v1',
  },
  perplexity: {
    name: 'Perplexity',
    description: 'AI with real-time web search',
    models: [
      { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large Online', description: 'With web search' },
      { id: 'llama-3.1-sonar-small-128k-online', name: 'Sonar Small Online', description: 'Fast with search' },
      { id: 'llama-3.1-sonar-large-128k-chat', name: 'Sonar Large Chat', description: 'Chat without search' },
    ],
    requiresApiKey: true,
    baseUrl: 'https://api.perplexity.ai',
  },
  fireworks: {
    name: 'Fireworks AI',
    description: 'Fast inference for open models',
    models: [
      { id: 'accounts/fireworks/models/llama-v3p3-70b-instruct', name: 'Llama 3.3 70B', description: 'Powerful' },
      { id: 'accounts/fireworks/models/llama-v3p1-8b-instruct', name: 'Llama 3.1 8B', description: 'Fast' },
      { id: 'accounts/fireworks/models/mixtral-8x22b-instruct', name: 'Mixtral 8x22B', description: 'MoE model' },
    ],
    requiresApiKey: true,
    baseUrl: 'https://api.fireworks.ai/inference/v1',
  },
  replicate: {
    name: 'Replicate',
    description: 'Run open-source models',
    models: [
      { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', description: 'Powerful' },
      { id: 'meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', description: 'Fast' },
      { id: 'mistralai/mixtral-8x7b-instruct-v0.1', name: 'Mixtral 8x7B', description: 'Balanced' },
    ],
    requiresApiKey: true,
    baseUrl: 'https://api.replicate.com/v1',
  },
  ai21: {
    name: 'AI21 Labs',
    description: 'Jamba models from AI21',
    models: [
      { id: 'jamba-1.5-large', name: 'Jamba 1.5 Large', description: 'Most capable' },
      { id: 'jamba-1.5-mini', name: 'Jamba 1.5 Mini', description: 'Fast and efficient' },
    ],
    requiresApiKey: true,
    baseUrl: 'https://api.ai21.com/studio/v1',
  },
  cerebras: {
    name: 'Cerebras',
    description: 'Ultra-fast inference',
    models: [
      { id: 'llama3.3-70b', name: 'Llama 3.3 70B', description: 'Extremely fast' },
      { id: 'llama3.1-8b', name: 'Llama 3.1 8B', description: 'Ultra fast' },
    ],
    requiresApiKey: true,
    baseUrl: 'https://api.cerebras.ai/v1',
  },
  sambanova: {
    name: 'SambaNova',
    description: 'Enterprise AI platform',
    models: [
      { id: 'Meta-Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', description: 'High performance' },
      { id: 'Meta-Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', description: 'Fast' },
    ],
    requiresApiKey: true,
    baseUrl: 'https://api.sambanova.ai/v1',
  },
  custom: {
    name: 'Custom API',
    description: 'Use any OpenAI-compatible API',
    models: [
      { id: 'custom', name: 'Custom Model', description: 'Specify your own model' },
    ],
    requiresApiKey: true,
  },
};

export function useChatbots() {
  const { user, profile } = useAuth();
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChatbots = useCallback(async () => {
    if (!user || !profile?.company_id) {
      setChatbots([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('chatbots')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mapped: Chatbot[] = (data || []).map(row => ({
        ...row,
        llm_provider: row.llm_provider as LLMProvider,
        qualification_questions: (row.qualification_questions || []) as { question: string; field: string }[],
        temperature: Number(row.temperature),
      }));

      setChatbots(mapped);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching chatbots:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, profile?.company_id]);

  const createChatbot = useCallback(async (input: ChatbotInput): Promise<Chatbot | null> => {
    if (!user || !profile?.company_id) {
      toast.error('Please log in to create chatbots');
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('chatbots')
        .insert({
          company_id: profile.company_id,
          name: input.name,
          description: input.description,
          whatsapp_connection_id: input.whatsapp_connection_id,
          llm_provider: input.llm_provider,
          llm_model: input.llm_model,
          llm_api_key_encrypted: input.llm_api_key, // In production, encrypt this
          system_prompt: input.system_prompt,
          welcome_message: input.welcome_message,
          qualification_questions: input.qualification_questions || [],
          is_active: input.is_active ?? true,
          auto_create_leads: input.auto_create_leads ?? true,
          max_tokens: input.max_tokens ?? 1000,
          temperature: input.temperature ?? 0.7,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const mapped: Chatbot = {
        ...data,
        llm_provider: data.llm_provider as LLMProvider,
        qualification_questions: (data.qualification_questions || []) as { question: string; field: string }[],
        temperature: Number(data.temperature),
      };

      setChatbots(prev => [mapped, ...prev]);
      toast.success('Chatbot created successfully');
      return mapped;
    } catch (err: any) {
      console.error('Error creating chatbot:', err);
      toast.error('Failed to create chatbot');
      return null;
    }
  }, [user, profile?.company_id]);

  const updateChatbot = useCallback(async (id: string, updates: Partial<ChatbotInput>): Promise<boolean> => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.whatsapp_connection_id !== undefined) dbUpdates.whatsapp_connection_id = updates.whatsapp_connection_id;
      if (updates.llm_provider) dbUpdates.llm_provider = updates.llm_provider;
      if (updates.llm_model) dbUpdates.llm_model = updates.llm_model;
      if (updates.llm_api_key !== undefined) dbUpdates.llm_api_key_encrypted = updates.llm_api_key;
      if (updates.system_prompt !== undefined) dbUpdates.system_prompt = updates.system_prompt;
      if (updates.welcome_message !== undefined) dbUpdates.welcome_message = updates.welcome_message;
      if (updates.qualification_questions !== undefined) dbUpdates.qualification_questions = updates.qualification_questions;
      if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
      if (updates.auto_create_leads !== undefined) dbUpdates.auto_create_leads = updates.auto_create_leads;
      if (updates.max_tokens !== undefined) dbUpdates.max_tokens = updates.max_tokens;
      if (updates.temperature !== undefined) dbUpdates.temperature = updates.temperature;

      const { error: updateError } = await supabase
        .from('chatbots')
        .update(dbUpdates)
        .eq('id', id);

      if (updateError) throw updateError;

      setChatbots(prev =>
        prev.map(bot => bot.id === id ? { ...bot, ...updates } as Chatbot : bot)
      );
      toast.success('Chatbot updated');
      return true;
    } catch (err: any) {
      console.error('Error updating chatbot:', err);
      toast.error('Failed to update chatbot');
      return false;
    }
  }, []);

  const deleteChatbot = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('chatbots')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setChatbots(prev => prev.filter(bot => bot.id !== id));
      toast.success('Chatbot deleted');
      return true;
    } catch (err: any) {
      console.error('Error deleting chatbot:', err);
      toast.error('Failed to delete chatbot');
      return false;
    }
  }, []);

  const toggleChatbot = useCallback(async (id: string): Promise<boolean> => {
    const chatbot = chatbots.find(b => b.id === id);
    if (!chatbot) return false;
    return updateChatbot(id, { is_active: !chatbot.is_active });
  }, [chatbots, updateChatbot]);

  useEffect(() => {
    fetchChatbots();
  }, [fetchChatbots]);

  return {
    chatbots,
    isLoading,
    error,
    createChatbot,
    updateChatbot,
    deleteChatbot,
    toggleChatbot,
    refetch: fetchChatbots,
  };
}
