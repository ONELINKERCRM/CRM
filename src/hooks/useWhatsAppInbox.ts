
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppConversation, WhatsAppMessage } from '@/components/whatsapp-chatbot/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Mappers to convert DB snake_case to frontend camelCase
const mapConversation = (data: any): WhatsAppConversation => ({
    id: data.id,
    leadName: data.lead_name || data.lead_phone || 'Unknown',
    leadPhone: data.lead_phone,
    leadStage: data.lead_stage || 'New',
    qualificationStatus: data.qualification_status || 'pending',
    status: data.status,
    unreadCount: data.unread_count || 0,
    lastMessage: data.last_message || '',
    lastMessageTime: new Date(data.updated_at || new Date()),
    assignedAgent: data.assigned_agent_name,
    isPinned: data.is_pinned,
    qualificationData: data.qualification_data,
});

const mapMessage = (data: any): WhatsAppMessage => ({
    id: data.id,
    conversationId: data.conversation_id,
    content: data.content,
    sender: data.sender_type, // 'lead' | 'agent' | 'bot'
    timestamp: new Date(data.created_at),
    status: data.status,
    mediaUrl: data.media_url,
    mediaType: data.media_type,
    isAiGenerated: data.is_ai_generated,
});

export function useWhatsAppInbox() {
    const { user, profile } = useAuth();
    const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
    const [messages, setMessages] = useState<Record<string, WhatsAppMessage[]>>({});
    const [isLoading, setIsLoading] = useState(true);

    // Fetch conversations
    const fetchConversations = useCallback(async () => {
        if (!profile?.company_id) return;

        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('whatsapp_conversations')
                .select('*')
                .eq('company_id', profile.company_id)
                .order('updated_at', { ascending: false });

            if (error) {
                // Fallback to empty if table doesn't exist yet (dev environment safety)
                if (error.code === '42P01') {
                    console.warn('whatsapp_conversations table does not exist, using empty state');
                    setConversations([]);
                    return;
                }
                throw error;
            }

            setConversations(data.map(mapConversation));
        } catch (err: any) {
            console.error('Error fetching conversations:', err);
            // Don't show toast on initial load error if it's just missing tables in dev
        } finally {
            setIsLoading(false);
        }
    }, [profile?.company_id]);

    // Fetch messages for a conversation
    const fetchMessages = useCallback(async (conversationId: string) => {
        try {
            const { data, error } = await supabase
                .from('whatsapp_messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            setMessages(prev => ({
                ...prev,
                [conversationId]: data.map(mapMessage)
            }));
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    }, []);

    // Send message
    const sendMessage = useCallback(async (conversationId: string, content: string) => {
        try {
            // 1. Insert message
            const { data, error } = await supabase
                .from('whatsapp_messages')
                .insert({
                    conversation_id: conversationId,
                    content,
                    sender_type: 'agent',
                    status: 'sent',
                    created_by: user?.id
                })
                .select()
                .single();

            if (error) throw error;

            const newMessage = mapMessage(data);

            // 2. Update local state immediately
            setMessages(prev => ({
                ...prev,
                [conversationId]: [...(prev[conversationId] || []), newMessage]
            }));

            // 3. Update conversation last message
            setConversations(prev => prev.map(c =>
                c.id === conversationId
                    ? { ...c, lastMessage: content, lastMessageTime: new Date() }
                    : c
            ));

            // 4. Trigger backend processing (if needed, usually handled by triggers)
            // await supabase.rpc('process_outbound_whatsapp', { message_id: data.id });

            return newMessage;
        } catch (err: any) {
            console.error('Error sending message:', err);
            toast.error('Failed to send message');
            throw err;
        }
    }, [user?.id]);

    // Subscribe to realtime updates
    useEffect(() => {
        if (!profile?.company_id) return;

        const channel = supabase
            .channel('whatsapp-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'whatsapp_conversations',
                filter: `company_id=eq.${profile.company_id}`
            }, (payload) => {
                // Simple refetch or optimistic update could go here
                fetchConversations();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.company_id, fetchConversations]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    return {
        conversations,
        messages,
        isLoading,
        fetchMessages,
        sendMessage,
        refetchConversations: fetchConversations
    };
}
