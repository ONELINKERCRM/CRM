import { EmailBlock, BlockType } from './types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface EmailBlockEditorProps {
  block: EmailBlock;
  onUpdate: (block: EmailBlock) => void;
  onDelete: () => void;
}

export function EmailBlockEditor({ block, onUpdate, onDelete }: EmailBlockEditorProps) {
  const updateContent = (key: string, value: any) => {
    onUpdate({
      ...block,
      content: { ...block.content, [key]: value },
    });
  };

  const renderEditor = () => {
    switch (block.type) {
      case 'header':
        return (
          <>
            <div className="space-y-2">
              <Label>Header Text</Label>
              <Input 
                value={block.content.text} 
                onChange={(e) => updateContent('text', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Logo URL (optional)</Label>
              <Input 
                value={block.content.logoUrl} 
                onChange={(e) => updateContent('logoUrl', e.target.value)} 
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Font Size</Label>
                <Select value={block.content.fontSize} onValueChange={(v) => updateContent('fontSize', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="18px">Small</SelectItem>
                    <SelectItem value="24px">Medium</SelectItem>
                    <SelectItem value="32px">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alignment</Label>
                <Select value={block.content.alignment} onValueChange={(v) => updateContent('alignment', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Text Color</Label>
              <Input type="color" value={block.content.color} onChange={(e) => updateContent('color', e.target.value)} />
            </div>
          </>
        );

      case 'text':
        return (
          <>
            <div className="space-y-2">
              <Label>Text Content</Label>
              <Textarea 
                value={block.content.text} 
                onChange={(e) => updateContent('text', e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Font Size</Label>
                <Select value={block.content.fontSize} onValueChange={(v) => updateContent('fontSize', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="14px">Small</SelectItem>
                    <SelectItem value="16px">Medium</SelectItem>
                    <SelectItem value="18px">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alignment</Label>
                <Select value={block.content.alignment} onValueChange={(v) => updateContent('alignment', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Text Color</Label>
              <Input type="color" value={block.content.color} onChange={(e) => updateContent('color', e.target.value)} />
            </div>
          </>
        );

      case 'image':
        return (
          <>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input 
                value={block.content.src} 
                onChange={(e) => updateContent('src', e.target.value)} 
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Alt Text</Label>
              <Input 
                value={block.content.alt} 
                onChange={(e) => updateContent('alt', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Link URL (optional)</Label>
              <Input 
                value={block.content.link} 
                onChange={(e) => updateContent('link', e.target.value)} 
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Width</Label>
              <Select value={block.content.width} onValueChange={(v) => updateContent('width', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="50%">50%</SelectItem>
                  <SelectItem value="75%">75%</SelectItem>
                  <SelectItem value="100%">100%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case 'button':
        return (
          <>
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input 
                value={block.content.text} 
                onChange={(e) => updateContent('text', e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Link URL</Label>
              <Input 
                value={block.content.url} 
                onChange={(e) => updateContent('url', e.target.value)} 
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Background</Label>
                <Input type="color" value={block.content.backgroundColor} onChange={(e) => updateContent('backgroundColor', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Text Color</Label>
                <Input type="color" value={block.content.textColor} onChange={(e) => updateContent('textColor', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alignment</Label>
              <Select value={block.content.alignment} onValueChange={(v) => updateContent('alignment', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case 'divider':
        return (
          <>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input type="color" value={block.content.color} onChange={(e) => updateContent('color', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Style</Label>
              <Select value={block.content.style} onValueChange={(v) => updateContent('style', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="dashed">Dashed</SelectItem>
                  <SelectItem value="dotted">Dotted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case 'spacer':
        return (
          <div className="space-y-2">
            <Label>Height</Label>
            <Select value={block.content.height} onValueChange={(v) => updateContent('height', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15px">Small</SelectItem>
                <SelectItem value="30px">Medium</SelectItem>
                <SelectItem value="50px">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case 'columns':
        return (
          <>
            <div className="space-y-2">
              <Label>Number of Columns</Label>
              <Select 
                value={String(block.content.columns)} 
                onValueChange={(v) => {
                  const numCols = parseInt(v);
                  const content = Array(numCols).fill({ text: 'Column content' });
                  updateContent('columns', numCols);
                  updateContent('content', content);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                  <SelectItem value="4">4 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {block.content.content.map((col: any, idx: number) => (
              <div key={idx} className="space-y-2">
                <Label>Column {idx + 1} Content</Label>
                <Textarea 
                  value={col.text}
                  onChange={(e) => {
                    const newContent = [...block.content.content];
                    newContent[idx] = { text: e.target.value };
                    updateContent('content', newContent);
                  }}
                  rows={2}
                />
              </div>
            ))}
          </>
        );

      case 'social':
        return (
          <div className="space-y-2">
            <Label>Alignment</Label>
            <Select value={block.content.alignment} onValueChange={(v) => updateContent('alignment', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case 'footer':
        return (
          <>
            <div className="space-y-2">
              <Label>Footer Text</Label>
              <Textarea 
                value={block.content.text} 
                onChange={(e) => updateContent('text', e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={block.content.showUnsubscribe}
                onCheckedChange={(v) => updateContent('showUnsubscribe', v)}
              />
              <Label>Show Unsubscribe Link</Label>
            </div>
          </>
        );

      default:
        return <p className="text-sm text-muted-foreground">No settings available</p>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold capitalize">{block.type} Settings</h3>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {renderEditor()}
    </div>
  );
}
