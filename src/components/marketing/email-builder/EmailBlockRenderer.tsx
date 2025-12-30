import { EmailBlock } from './types';
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

interface EmailBlockRendererProps {
  block: EmailBlock;
  isSelected: boolean;
  onClick: () => void;
}

export function EmailBlockRenderer({ block, isSelected, onClick }: EmailBlockRendererProps) {
  const renderBlock = () => {
    switch (block.type) {
      case 'header':
        return (
          <div 
            style={{ 
              textAlign: block.content.alignment,
              fontSize: block.content.fontSize,
              color: block.content.color,
              fontWeight: 'bold',
            }}
          >
            {block.content.logoUrl ? (
              <img src={block.content.logoUrl} alt="Logo" className="max-h-16 inline-block mb-2" />
            ) : null}
            <div>{block.content.text}</div>
          </div>
        );
      
      case 'text':
        return (
          <div 
            style={{ 
              textAlign: block.content.alignment,
              fontSize: block.content.fontSize,
              color: block.content.color,
              lineHeight: '1.6',
            }}
          >
            {block.content.text}
          </div>
        );
      
      case 'image':
        return (
          <div style={{ textAlign: block.content.alignment }}>
            <img 
              src={block.content.src} 
              alt={block.content.alt}
              style={{ width: block.content.width, maxWidth: '100%' }}
              className="inline-block rounded"
            />
          </div>
        );
      
      case 'button':
        return (
          <div style={{ textAlign: block.content.alignment }}>
            <a
              href={block.content.url}
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: block.content.backgroundColor,
                color: block.content.textColor,
                borderRadius: block.content.borderRadius,
                textDecoration: 'none',
                fontWeight: '600',
              }}
            >
              {block.content.text}
            </a>
          </div>
        );
      
      case 'divider':
        return (
          <hr 
            style={{ 
              borderColor: block.content.color,
              borderWidth: block.content.thickness,
              borderStyle: block.content.style,
              margin: `${block.content.margin} 0`,
            }} 
          />
        );
      
      case 'spacer':
        return <div style={{ height: block.content.height }} />;
      
      case 'columns':
        return (
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: `repeat(${block.content.columns}, 1fr)`,
              gap: block.content.gap,
            }}
          >
            {block.content.content.map((col: any, idx: number) => (
              <div key={idx} className="p-3 bg-muted/30 rounded text-sm">
                {col.text}
              </div>
            ))}
          </div>
        );
      
      case 'social':
        const iconComponents: Record<string, React.ReactNode> = {
          facebook: <Facebook className="h-6 w-6" />,
          twitter: <Twitter className="h-6 w-6" />,
          instagram: <Instagram className="h-6 w-6" />,
          linkedin: <Linkedin className="h-6 w-6" />,
        };
        return (
          <div style={{ textAlign: block.content.alignment }} className="flex gap-4 justify-center">
            {block.content.icons.map((icon: string) => (
              <a key={icon} href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                {iconComponents[icon]}
              </a>
            ))}
          </div>
        );
      
      case 'footer':
        return (
          <div 
            style={{ 
              textAlign: block.content.alignment,
              fontSize: block.content.fontSize,
              color: block.content.color,
            }}
          >
            <p>{block.content.text}</p>
            {block.content.showUnsubscribe && (
              <p className="mt-2">
                <a href="#" className="underline">Unsubscribe</a> | <a href="#" className="underline">View in browser</a>
              </p>
            )}
          </div>
        );
      
      default:
        return <div>Unknown block type</div>;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
        isSelected 
          ? 'border-primary bg-primary/5' 
          : 'border-transparent hover:border-muted-foreground/20'
      }`}
    >
      {renderBlock()}
    </div>
  );
}
