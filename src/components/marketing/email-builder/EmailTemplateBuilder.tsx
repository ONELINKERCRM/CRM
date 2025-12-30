import { useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Save, Eye, Code, Smartphone, Monitor, X } from 'lucide-react';
import { EmailBlock, EmailTemplate, BlockType, defaultBlockContent } from './types';
import { EmailBlockPalette } from './EmailBlockPalette';
import { EmailCanvas } from './EmailCanvas';
import { EmailBlockEditor } from './EmailBlockEditor';
import { EmailBlockRenderer } from './EmailBlockRenderer';

interface EmailTemplateBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: EmailTemplate | null;
  onSave: (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export function EmailTemplateBuilder({ open, onOpenChange, template, onSave }: EmailTemplateBuilderProps) {
  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [category, setCategory] = useState<EmailTemplate['category']>(template?.category || 'custom');
  const [blocks, setBlocks] = useState<EmailBlock[]>(template?.blocks || []);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [viewTab, setViewTab] = useState<'edit' | 'preview' | 'html'>('edit');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeData = active.data.current;

    // Adding new block from palette
    if (activeData?.isNew && over.id === 'canvas') {
      const blockType = activeData.type as BlockType;
      const newBlock: EmailBlock = {
        id: `block-${Date.now()}`,
        type: blockType,
        content: { ...defaultBlockContent[blockType] },
      };
      setBlocks([...blocks, newBlock]);
      setSelectedBlockId(newBlock.id);
      return;
    }

    // Reordering existing blocks
    if (active.id !== over.id) {
      const oldIndex = blocks.findIndex(b => b.id === active.id);
      const newIndex = blocks.findIndex(b => b.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setBlocks(arrayMove(blocks, oldIndex, newIndex));
      }
    }
  };

  const handleUpdateBlock = useCallback((updatedBlock: EmailBlock) => {
    setBlocks(blocks.map(b => b.id === updatedBlock.id ? updatedBlock : b));
  }, [blocks]);

  const handleDeleteBlock = useCallback(() => {
    if (selectedBlockId) {
      setBlocks(blocks.filter(b => b.id !== selectedBlockId));
      setSelectedBlockId(null);
    }
  }, [blocks, selectedBlockId]);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please enter an email subject');
      return;
    }
    if (blocks.length === 0) {
      toast.error('Please add at least one block to your template');
      return;
    }

    onSave({ name, subject, blocks, category });
    toast.success('Template saved successfully!');
    onOpenChange(false);
  };

  const generateHTML = () => {
    // Simple HTML generation for preview
    const blocksHtml = blocks.map(block => {
      switch (block.type) {
        case 'header':
          return `<h1 style="text-align:${block.content.alignment};font-size:${block.content.fontSize};color:${block.content.color};">${block.content.text}</h1>`;
        case 'text':
          return `<p style="text-align:${block.content.alignment};font-size:${block.content.fontSize};color:${block.content.color};line-height:1.6;">${block.content.text}</p>`;
        case 'image':
          return `<div style="text-align:${block.content.alignment};"><img src="${block.content.src}" alt="${block.content.alt}" style="width:${block.content.width};max-width:100%;" /></div>`;
        case 'button':
          return `<div style="text-align:${block.content.alignment};"><a href="${block.content.url}" style="display:inline-block;padding:12px 24px;background-color:${block.content.backgroundColor};color:${block.content.textColor};border-radius:${block.content.borderRadius};text-decoration:none;font-weight:600;">${block.content.text}</a></div>`;
        case 'divider':
          return `<hr style="border-color:${block.content.color};border-width:${block.content.thickness};border-style:${block.content.style};margin:${block.content.margin} 0;" />`;
        case 'spacer':
          return `<div style="height:${block.content.height};"></div>`;
        case 'footer':
          return `<footer style="text-align:${block.content.alignment};font-size:${block.content.fontSize};color:${block.content.color};">${block.content.text}</footer>`;
        default:
          return '';
      }
    }).join('\n');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;background-color:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;padding:20px;border-radius:8px;">
    ${blocksHtml}
  </div>
</body>
</html>`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Email Template Builder</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" /> Save Template
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Block Palette */}
          <div className="w-64 border-r bg-muted/20 p-4 overflow-auto">
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Template" />
              </div>
              <div className="space-y-2">
                <Label>Email Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Your email subject..." />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as EmailTemplate['category'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="transactional">Transactional</SelectItem>
                    <SelectItem value="welcome">Welcome</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <EmailBlockPalette />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as typeof viewTab)} className="flex-1 flex flex-col">
              <div className="border-b px-4 py-2 flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                  <TabsTrigger value="preview">
                    <Eye className="h-4 w-4 mr-1" /> Preview
                  </TabsTrigger>
                  <TabsTrigger value="html">
                    <Code className="h-4 w-4 mr-1" /> HTML
                  </TabsTrigger>
                </TabsList>
                {viewTab === 'preview' && (
                  <div className="flex items-center gap-1 border rounded-lg p-1">
                    <Button 
                      variant={previewMode === 'desktop' ? 'secondary' : 'ghost'} 
                      size="sm"
                      onClick={() => setPreviewMode('desktop')}
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant={previewMode === 'mobile' ? 'secondary' : 'ghost'} 
                      size="sm"
                      onClick={() => setPreviewMode('mobile')}
                    >
                      <Smartphone className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <TabsContent value="edit" className="flex-1 m-0 overflow-hidden">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <div className="h-full flex">
                    <EmailCanvas
                      blocks={blocks}
                      selectedBlockId={selectedBlockId}
                      onSelectBlock={setSelectedBlockId}
                    />
                  </div>

                  <DragOverlay>
                    {activeId && activeId.startsWith('palette-') ? (
                      <div className="p-3 rounded-lg border border-primary bg-primary/10 shadow-lg">
                        <span className="text-sm font-medium">
                          {activeId.replace('palette-', '').charAt(0).toUpperCase() + activeId.replace('palette-', '').slice(1)}
                        </span>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </TabsContent>

              <TabsContent value="preview" className="flex-1 m-0 overflow-auto bg-muted/30 p-6">
                <div 
                  className={`mx-auto bg-white rounded-lg shadow-lg p-6 transition-all ${
                    previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-[600px]'
                  }`}
                >
                  {blocks.map((block) => (
                    <EmailBlockRenderer 
                      key={block.id} 
                      block={block} 
                      isSelected={false} 
                      onClick={() => {}} 
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="html" className="flex-1 m-0 overflow-auto p-4">
                <ScrollArea className="h-full">
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                    <code>{generateHTML()}</code>
                  </pre>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar - Block Settings */}
          <div className="w-72 border-l bg-muted/20 p-4 overflow-auto">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Block Settings
            </h3>
            {selectedBlock ? (
              <EmailBlockEditor
                block={selectedBlock}
                onUpdate={handleUpdateBlock}
                onDelete={handleDeleteBlock}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a block to edit its properties
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
