import { MessageCircle, Smartphone, Mail, Send, Camera } from 'lucide-react';
import { Channel, channelConfig } from './types';
import { cn } from '@/lib/utils';

interface ChannelBadgeProps {
  channel: Channel;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const iconMap = {
  whatsapp: MessageCircle,
  messenger: MessageCircle,
  sms: Smartphone,
  email: Mail,
  telegram: Send,
  instagram: Camera,
};

export function ChannelBadge({ channel, showLabel = false, size = 'md' }: ChannelBadgeProps) {
  const config = channelConfig[channel];
  const Icon = iconMap[channel];
  
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <div className={cn('flex items-center gap-1.5', showLabel && 'gap-2')}>
      <div className={cn(
        'rounded-full flex items-center justify-center',
        config.bgColor,
        sizeClasses[size]
      )}>
        <Icon className={cn(config.color, iconSizes[size])} />
      </div>
      {showLabel && (
        <span className={cn('text-xs font-medium', config.color)}>
          {config.label}
        </span>
      )}
    </div>
  );
}
