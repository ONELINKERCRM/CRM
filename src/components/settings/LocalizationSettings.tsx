import { useState, useEffect } from 'react';
import { Globe, Clock, DollarSign, Check, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLocalization, timezones, currencies } from '@/contexts/LocalizationContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function LocalizationSettings() {
  const {
    language,
    timezone,
    currency,
    isRTL,
    isSaving,
    setLanguage,
    setTimezone,
    setCurrency,
    t,
    formatDateTime,
    formatCurrency,
  } = useLocalization();

  const [showPreview, setShowPreview] = useState(false);
  const [previewTime, setPreviewTime] = useState(new Date());

  // Update preview time every second
  useEffect(() => {
    const interval = setInterval(() => setPreviewTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <Globe className="h-5 w-5 text-primary" />
          {t('localization')}
        </CardTitle>
        <CardDescription className={isRTL ? "text-right" : ""}>
          {t('localization_desc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language Selection */}
        <div className="space-y-4">
          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <Globe className="h-4 w-4 text-amber-500" />
            <Label className="text-base font-medium">{t('language')}</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { code: 'en', label: 'English', native: 'English', dir: 'ltr' },
              { code: 'ar', label: 'Arabic', native: 'العربية', dir: 'rtl' },
            ].map((lang) => {
              const isSelected = language === lang.code;
              return (
                <motion.button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code as 'en' | 'ar')}
                  whileTap={{ scale: 0.98 }}
                  disabled={isSaving}
                  className={cn(
                    "relative p-4 rounded-xl text-center transition-all duration-200 border-2",
                    isSelected
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-border bg-muted/30 hover:border-amber-500/50"
                  )}
                >
                  <p className={cn("font-semibold text-lg", isSelected && "text-amber-600")}>
                    {lang.native}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lang.label} • {lang.dir.toUpperCase()}
                  </p>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2"
                    >
                      <Check className="h-4 w-4 text-amber-500" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Timezone Selection */}
        <div className="space-y-4">
          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <Clock className="h-4 w-4 text-amber-500" />
            <Label className="text-base font-medium">{t('timezone')}</Label>
          </div>
          <Select value={timezone} onValueChange={setTimezone} disabled={isSaving}>
            <SelectTrigger className="h-12 bg-muted/50">
              <SelectValue placeholder={t('select_timezone')} />
            </SelectTrigger>
            <SelectContent className="bg-popover max-h-64">
              {timezones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  <span className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                    <span>{isRTL ? tz.labelAr : tz.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Currency Selection */}
        <div className="space-y-4">
          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <DollarSign className="h-4 w-4 text-amber-500" />
            <Label className="text-base font-medium">{t('currency')}</Label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {currencies.map((curr) => {
              const isSelected = currency === curr.code;
              return (
                <motion.button
                  key={curr.code}
                  onClick={() => setCurrency(curr.code)}
                  whileTap={{ scale: 0.98 }}
                  disabled={isSaving}
                  className={cn(
                    "relative p-3 rounded-xl text-center transition-all duration-200 border-2",
                    isSelected
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-border bg-muted/30 hover:border-amber-500/50"
                  )}
                >
                  <p className={cn("font-bold text-lg", isSelected && "text-amber-600")}>
                    {curr.symbol}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {curr.code}
                  </p>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1 right-1"
                    >
                      <Check className="h-3 w-3 text-amber-500" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Preview Section */}
        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            className={cn("w-full", isRTL && "flex-row-reverse")}
          >
            <Eye className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {t('preview_changes')}
          </Button>

          {showPreview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 p-4 rounded-xl bg-gradient-to-br from-amber-500/5 to-amber-600/5 border border-amber-500/20"
            >
              <div className={cn("flex justify-between items-center", isRTL && "flex-row-reverse")}>
                <span className="text-sm text-muted-foreground">{t('current_time')}</span>
                <span className="font-mono text-lg font-semibold text-foreground">
                  {formatDateTime(previewTime)}
                </span>
              </div>
              <div className={cn("flex justify-between items-center", isRTL && "flex-row-reverse")}>
                <span className="text-sm text-muted-foreground">{t('sample_price')}</span>
                <span className="font-mono text-lg font-semibold text-amber-600">
                  {formatCurrency(1500000)}
                </span>
              </div>
              <div className={cn("flex justify-between items-center", isRTL && "flex-row-reverse")}>
                <span className="text-sm text-muted-foreground">{t('language')}</span>
                <span className="font-medium">
                  {language === 'ar' ? 'العربية (RTL)' : 'English (LTR)'}
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}