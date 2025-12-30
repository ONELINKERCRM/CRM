import { useState, useRef, useEffect } from 'react';
import {
  Phone, MoreVertical, Send, Paperclip, Sparkles,
  User, Clock, Tag, Bot, UserCheck, ChevronDown,
  Check, CheckCheck, Image as ImageIcon, Mic, MicOff,
  X, Play, Pause, FileText, File, Smile
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { WhatsAppConversation, WhatsAppMessage } from './types';
import { cn } from '@/lib/utils';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

const quickReplies = [
  { id: '1', title: 'Schedule Viewing', content: 'I would be happy to schedule a property viewing for you. What day and time works best?' },
  { id: '2', title: 'Property Details', content: 'Let me send you the complete details of this property including floor plans and photos.' },
  { id: '3', title: 'Price Inquiry', content: 'The asking price for this property is competitive for the area. Would you like to discuss financing options?' },
  { id: '4', title: 'Thank You', content: 'Thank you for your interest! Please let me know if you have any other questions.' },
];

interface WhatsAppThreadProps {
  conversation: WhatsAppConversation;
  messages: WhatsAppMessage[];
  onSendMessage: (content: string) => void;
  onAssignAgent?: () => void;
}

export function WhatsAppThread({
  conversation,
  messages,
  onSendMessage,
  onAssignAgent,
}: WhatsAppThreadProps) {
  const { isRTL } = useLanguageSafe();
  const [newMessage, setNewMessage] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const initials = conversation.leadName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage);
    setNewMessage('');
    setShowAiSuggestion(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = (content: string) => {
    setNewMessage(content);
    textareaRef.current?.focus();
  };

  const handleAiSuggest = () => {
    setIsAiLoading(true);
    // Simulate AI response
    setTimeout(() => {
      const suggestion = `Based on ${conversation.leadName}'s interest in ${conversation.qualificationData?.propertyInterest || 'properties'}, I recommend discussing our exclusive ${conversation.qualificationData?.budgetRange?.includes('15') ? 'luxury' : 'premium'} listings. Would you like me to share some options that match your criteria?`;
      setAiSuggestion(suggestion);
      setShowAiSuggestion(true);
      setIsAiLoading(false);
      toast.success(isRTL ? 'تم إنشاء اقتراح AI' : 'AI suggestion generated');
    }, 1500);
  };

  const handleUseAiSuggestion = () => {
    setNewMessage(aiSuggestion);
    setShowAiSuggestion(false);
    textareaRef.current?.focus();
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success(isRTL ? 'بدأ التسجيل' : 'Recording started');
    } catch (error) {
      toast.error(isRTL ? 'فشل الوصول للميكروفون' : 'Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setAudioBlob(null);
    setRecordingTime(0);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  };

  const sendVoiceNote = () => {
    if (audioBlob) {
      toast.success(isRTL ? 'تم إرسال الملاحظة الصوتية' : 'Voice note sent');
      setAudioBlob(null);
      setRecordingTime(0);
    }
  };

  const playPreview = () => {
    if (audioBlob) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.onended = () => setIsPlayingPreview(false);
      audio.play();
      setIsPlayingPreview(true);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // File handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
      toast.success(isRTL ? `تم إضافة ${files.length} ملف` : `${files.length} file(s) added`);
    }
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const sendFiles = () => {
    if (selectedFiles.length > 0) {
      toast.success(isRTL ? `تم إرسال ${selectedFiles.length} ملف` : `${selectedFiles.length} file(s) sent`);
      setSelectedFiles([]);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (file.type.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const getQualificationBadge = (status: WhatsAppConversation['qualificationStatus']) => {
    switch (status) {
      case 'premium':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Premium Lead</Badge>;
      case 'qualified':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Qualified</Badge>;
      case 'unqualified':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Unqualified</Badge>;
      default:
        return <Badge variant="outline">Pending Qualification</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background/50 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          <Avatar className="h-9 w-9 md:h-10 md:w-10 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-green-500/20 to-green-500/10 text-green-600 text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-foreground text-sm md:text-base truncate">{conversation.leadName}</h3>
              {getQualificationBadge(conversation.qualificationStatus)}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground">
              <span className="truncate">{conversation.leadPhone}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Phone className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                {isRTL ? 'عرض العميل' : 'View Lead'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAssignAgent}>
                <UserCheck className="h-4 w-4 mr-2" />
                {isRTL ? 'تعيين وكيل' : 'Assign Agent'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Tag className="h-4 w-4 mr-2" />
                {isRTL ? 'تغيير المرحلة' : 'Change Stage'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Lead Info Bar */}
      <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-muted/30 border-b border-border/30 overflow-x-auto scrollbar-hide">
        <Badge variant="outline" className="shrink-0 bg-background/50 text-[10px] h-5">
          <Tag className="h-2.5 w-2.5 mr-1" />
          {conversation.leadStage}
        </Badge>
        {conversation.assignedAgent && (
          <Badge variant="outline" className="shrink-0 bg-background/50 text-[10px] h-5">
            <User className="h-2.5 w-2.5 mr-1" />
            {conversation.assignedAgent}
          </Badge>
        )}
        {conversation.qualificationData?.propertyInterest && (
          <Badge variant="outline" className="shrink-0 bg-background/50 text-[10px] h-5 hidden sm:flex">
            {conversation.qualificationData.propertyInterest}
          </Badge>
        )}
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-3 md:p-4">
        <div className="space-y-3 max-w-3xl mx-auto">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} isRTL={isRTL} />
          ))}
        </div>
      </ScrollArea>

      {/* AI Suggestion */}
      {showAiSuggestion && (
        <div className="mx-3 md:mx-4 mb-2">
          <Card className="p-3 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary mb-1">{isRTL ? 'اقتراح AI' : 'AI Suggestion'}</p>
                <p className="text-sm text-foreground">{aiSuggestion}</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" className="h-7 text-xs" onClick={handleUseAiSuggestion}>
                    {isRTL ? 'استخدام' : 'Use'}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAiSuggestion(false)}>
                    {isRTL ? 'تجاهل' : 'Dismiss'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Composer */}
      <div className="p-3 md:p-4 border-t border-border/50 bg-card/50">
        {/* Hidden file inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
        />
        <input
          type="file"
          ref={imageInputRef}
          onChange={handleFileSelect}
          className="hidden"
          multiple
          accept="image/*"
        />

        {/* Voice Recording UI */}
        {(isRecording || audioBlob) && (
          <div className="mb-3 p-3 bg-gradient-to-r from-green-500/10 to-green-500/5 rounded-xl border border-green-500/20">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                isRecording ? "bg-red-500 animate-pulse" : "bg-green-500"
              )}>
                <Mic className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {isRecording
                    ? (isRTL ? 'جاري التسجيل...' : 'Recording...')
                    : (isRTL ? 'معاينة التسجيل' : 'Recording Preview')}
                </p>
                <p className="text-xs text-muted-foreground">{formatRecordingTime(recordingTime)}</p>
              </div>
              <div className="flex items-center gap-1">
                {isRecording ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 hover:bg-red-500/20"
                    onClick={stopRecording}
                  >
                    <MicOff className="h-4 w-4 text-red-500" />
                  </Button>
                ) : (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={playPreview}
                    >
                      {isPlayingPreview ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:bg-destructive/20"
                      onClick={cancelRecording}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 bg-gradient-to-r from-green-500 to-green-600"
                      onClick={sendVoiceNote}
                    >
                      <Send className="h-3.5 w-3.5 mr-1" />
                      {isRTL ? 'إرسال' : 'Send'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="mb-3 p-2 bg-muted/50 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">
                {isRTL ? `${selectedFiles.length} ملفات مرفقة` : `${selectedFiles.length} file(s) attached`}
              </p>
              <Button
                size="sm"
                className="h-6 text-xs bg-gradient-to-r from-green-500 to-green-600"
                onClick={sendFiles}
              >
                <Send className="h-3 w-3 mr-1" />
                {isRTL ? 'إرسال الكل' : 'Send All'}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 px-2 py-1 bg-background rounded-md text-xs"
                >
                  {getFileIcon(file)}
                  <span className="max-w-[100px] truncate">{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-2 mb-2 overflow-x-auto scrollbar-hide">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] md:text-xs shrink-0 gap-1 bg-gradient-to-r from-green-500/10 to-green-500/5 border-green-500/20 hover:bg-green-500/20"
            onClick={handleAiSuggest}
            disabled={isAiLoading}
          >
            <Sparkles className={cn('h-3 w-3', isAiLoading && 'animate-spin')} />
            {isRTL ? 'اقتراح AI' : 'AI Suggest'}
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-[10px] md:text-xs shrink-0">
                <ChevronDown className="h-3 w-3 mr-1" />
                {isRTL ? 'ردود سريعة' : 'Quick Replies'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 md:w-80 p-2" align="start">
              <div className="space-y-1">
                {quickReplies.map((reply) => (
                  <button
                    key={reply.id}
                    onClick={() => handleQuickReply(reply.content)}
                    className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <p className="text-sm font-medium">{reply.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{reply.content}</p>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Input Area */}
        <div className="flex items-end gap-2 bg-background p-1 rounded-xl shadow-sm border focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          {/* Emoji Picker */}
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 hover:bg-muted text-muted-foreground hover:text-primary rounded-lg ml-0.5"
              >
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 border-0 shadow-lg rounded-xl overflow-hidden"
              side="top"
              align="start"
              sideOffset={8}
            >
              <Picker
                data={data}
                onEmojiSelect={(emoji: { native: string }) => {
                  setNewMessage(prev => prev + emoji.native);
                  setShowEmojiPicker(false);
                  textareaRef.current?.focus();
                }}
                theme="light"
                previewPosition="none"
                skinTonePosition="none"
                maxFrequentRows={2}
              />
            </PopoverContent>
          </Popover>

          <div className="flex-1 relative py-1">
            <Textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRTL ? 'اكتب رسالتك...' : 'Type your message...'}
              className="min-h-[44px] max-h-[150px] resize-none pr-28 bg-transparent border-0 focus-visible:ring-0 p-2.5 text-sm shadow-none"
            />
            <div className="absolute bottom-1 right-2 flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-primary rounded-full transition-colors"
                onClick={() => imageInputRef.current?.click()}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-primary rounded-full transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-full transition-colors",
                  isRecording
                    ? "text-red-500 bg-red-50 hover:bg-red-100"
                    : "hover:bg-muted text-muted-foreground hover:text-primary"
                )}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!!audioBlob}
              >
                <Mic className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="h-10 w-10 p-0 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm mr-0.5 mb-0.5"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: WhatsAppMessage;
  isRTL: boolean;
}

function MessageBubble({ message, isRTL }: MessageBubbleProps) {
  const isLead = message.sender === 'lead';
  const isBot = message.sender === 'bot';
  const time = format(message.timestamp, 'h:mm a', { locale: isRTL ? ar : undefined });

  return (
    <div className={cn(
      'flex gap-2',
      isLead ? 'justify-start' : 'justify-end'
    )}>
      {isLead && (
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="bg-muted text-xs">L</AvatarFallback>
        </Avatar>
      )}

      <div className={cn(
        'relative max-w-[85%] sm:max-w-[70%] px-4 py-2.5 shadow-sm',
        isLead
          ? 'bg-background border border-border/50 text-foreground rounded-2xl rounded-tl-sm'
          : isBot
            ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl rounded-tr-sm shadow-md'
            : 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm shadow-md'
      )}>
        {isBot && (
          <div className="flex items-center gap-1.5 mb-1.5 border-b border-white/20 pb-1">
            <Bot className="h-3.5 w-3.5" />
            <span className="text-[10px] font-semibold tracking-wide uppercase opacity-90">AI Assistant</span>
          </div>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
        <div className={cn(
          'flex items-center gap-1.5 mt-1.5',
          isLead ? 'justify-start' : 'justify-end'
        )}>
          <span className={cn(
            'text-[10px] font-medium',
            isLead ? 'text-muted-foreground' : 'text-white/70'
          )}>
            {time}
          </span>
          {!isLead && (
            <div className="opacity-90">
              {message.status === 'read' ? (
                <CheckCheck className="h-3.5 w-3.5" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="h-3.5 w-3.5 opacity-70" />
              ) : (
                <Check className="h-3.5 w-3.5 opacity-70" />
              )}
            </div>
          )}
        </div>
      </div>

      {!isLead && !isBot && (
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="bg-primary/20 text-primary text-xs">A</AvatarFallback>
        </Avatar>
      )}
      {isBot && (
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="bg-green-500/20 text-green-600 text-xs">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
