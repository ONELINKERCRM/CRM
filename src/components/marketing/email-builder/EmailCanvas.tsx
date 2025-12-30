import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EmailBlock } from './types';
import { EmailBlockRenderer } from './EmailBlockRenderer';
import { GripVertical, Mail } from 'lucide-react';

interface SortableBlockProps {
  block: EmailBlock;
  isSelected: boolean;
  onSelect: () => void;
}

function SortableBlock({ block, isSelected, onSelect }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <EmailBlockRenderer block={block} isSelected={isSelected} onClick={onSelect} />
    </div>
  );
}

interface EmailCanvasProps {
  blocks: EmailBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
}

export function EmailCanvas({ blocks, selectedBlockId, onSelectBlock }: EmailCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });

  return (
    <div className="flex-1 bg-muted/30 p-6 overflow-auto">
      <div className="max-w-[600px] mx-auto">
        <div
          ref={setNodeRef}
          className={`min-h-[600px] bg-white rounded-lg shadow-lg p-6 transition-all ${
            isOver ? 'ring-2 ring-primary ring-offset-2' : ''
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) onSelectBlock(null);
          }}
        >
          {blocks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Mail className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Drag blocks here to build your email</p>
              <p className="text-sm">Start by adding a header, then content blocks</p>
            </div>
          ) : (
            <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {blocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    isSelected={selectedBlockId === block.id}
                    onSelect={() => onSelectBlock(block.id)}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </div>
    </div>
  );
}
