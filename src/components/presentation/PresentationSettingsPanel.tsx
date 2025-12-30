import { PresentationSettings, themeColors } from './types';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Palette, Layout, Image, FileText, Images, Home, Map, User, Building2
} from 'lucide-react';

interface PresentationSettingsPanelProps {
  settings: PresentationSettings;
  onSettingsChange: (settings: PresentationSettings) => void;
}

export const PresentationSettingsPanel = ({ settings, onSettingsChange }: PresentationSettingsPanelProps) => {
  const updateSection = (key: keyof PresentationSettings['sections'], value: boolean) => {
    onSettingsChange({
      ...settings,
      sections: { ...settings.sections, [key]: value }
    });
  };

  const themes = [
    { value: 'classic', label: 'Classic', color: themeColors.classic.primary },
    { value: 'luxury', label: 'Luxury Gold', color: themeColors.luxury.primary },
    { value: 'minimal', label: 'Minimal White', color: themeColors.minimal.primary },
    { value: 'dark', label: 'Dark Mode', color: themeColors.dark.secondary },
  ] as const;

  const sections = [
    { key: 'cover', label: 'Cover Page', icon: Image },
    { key: 'summary', label: 'Quick Summary', icon: Layout },
    { key: 'description', label: 'Description', icon: FileText },
    { key: 'gallery', label: 'Image Gallery', icon: Images },
    { key: 'amenities', label: 'Amenities', icon: Home },
    { key: 'floorPlan', label: 'Floor Plans', icon: Layout },
    { key: 'map', label: 'Location Map', icon: Map },
    { key: 'agent', label: 'Agent Profile', icon: User },
    { key: 'company', label: 'Company Info', icon: Building2 },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <div>
        <Label className="flex items-center gap-2 mb-3">
          <Palette className="w-4 h-4" />
          Theme Style
        </Label>
        <RadioGroup
          value={settings.theme}
          onValueChange={(value) => onSettingsChange({ ...settings, theme: value as PresentationSettings['theme'] })}
          className="grid grid-cols-2 gap-3"
        >
          {themes.map((theme) => (
            <div key={theme.value}>
              <RadioGroupItem
                value={theme.value}
                id={`theme-${theme.value}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`theme-${theme.value}`}
                className="flex items-center gap-3 rounded-lg border-2 border-muted p-3 cursor-pointer hover:bg-accent peer-data-[state=checked]:border-primary transition-colors"
              >
                <div 
                  className="w-6 h-6 rounded-full border-2"
                  style={{ backgroundColor: theme.color }}
                />
                <span className="text-sm font-medium">{theme.label}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Cover Style */}
      <div>
        <Label className="flex items-center gap-2 mb-3">
          <Layout className="w-4 h-4" />
          Cover Style
        </Label>
        <RadioGroup
          value={settings.coverStyle}
          onValueChange={(value) => onSettingsChange({ ...settings, coverStyle: value as 'full' | 'half' })}
          className="grid grid-cols-2 gap-3"
        >
          <div>
            <RadioGroupItem value="full" id="cover-full" className="peer sr-only" />
            <Label
              htmlFor="cover-full"
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted p-4 cursor-pointer hover:bg-accent peer-data-[state=checked]:border-primary transition-colors"
            >
              <div className="w-full h-12 bg-muted rounded" />
              <span className="text-xs">Full Image</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem value="half" id="cover-half" className="peer sr-only" />
            <Label
              htmlFor="cover-half"
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted p-4 cursor-pointer hover:bg-accent peer-data-[state=checked]:border-primary transition-colors"
            >
              <div className="w-full h-12 flex gap-1">
                <div className="flex-1 bg-muted rounded" />
                <div className="flex-1 bg-muted/50 rounded" />
              </div>
              <span className="text-xs">Half + Text</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Section Toggles */}
      <div>
        <Label className="mb-3 block">Sections to Include</Label>
        <div className="space-y-3">
          {sections.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{label}</span>
              </div>
              <Switch
                checked={settings.sections[key]}
                onCheckedChange={(checked) => updateSection(key, checked)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
