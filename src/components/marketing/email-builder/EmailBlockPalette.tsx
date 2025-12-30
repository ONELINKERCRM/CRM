import { useDraggable } from '@dnd-kit/core';
import { 
  Type, 
  Image, 
  MousePointerClick, 
  Minus, 
  Space, 
  Columns, 
  Share2, 
  FileText,
  Heading
} from 'lucide-react';
import { BlockType } from './types';

const blocks: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: 'header', label: 'Header', icon: <Heading className="h-5 w-5" /> },
  { type: 'text', label: 'Text Block', icon: <Type className="h-5 w-5" /> },
  { type: 'image', label: 'Image', icon: <Image className="h-5 w-5" /> },
  { type: 'button', label: 'Button', icon: <MousePointerClick className="h-5 w-5" /> },
  { type: 'divider', label: 'Divider', icon: <Minus className="h-5 w-5" /> },
  { type: 'spacer', label: 'Spacer', icon: <Space className="h-5 w-5" /> },
  { type: 'columns', label: 'Columns', icon: <Columns className="h-5 w-5" /> },
  { type: 'social', label: 'Social Links', icon: <Share2 className="h-5 w-5" /> },
  { type: 'footer', label: 'Footer', icon: <FileText className="h-5 w-5" /> },
];

function DraggableBlock({ type, label, icon }: { type: BlockType; label: string; icon: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type, isNew: true },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50 scale-95' : ''
      }`}
    >
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function EmailBlockPalette() {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Drag & Drop Blocks
      </h3>
      <div className="space-y-2">
        {blocks.map((block) => (
          <DraggableBlock key={block.type} {...block} />
        ))}
      </div>
    </div>
  );
}
