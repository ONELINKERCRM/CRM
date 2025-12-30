import { useState } from 'react';
import { 
  Send, Clock, Calendar as CalendarIcon, Globe 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

const timezones = [
  { value: 'Asia/Dubai', label: 'Dubai (GMT+4)' },
  { value: 'Asia/Qatar', label: 'Doha (GMT+3)' },
  { value: 'Asia/Riyadh', label: 'Riyadh (GMT+3)' },
  { value: 'Europe/London', label: 'London (GMT+0)' },
  { value: 'America/New_York', label: 'New York (GMT-5)' },
];

const hours = Array.from({ length: 24 }, (_, i) => ({
  value: i.toString().padStart(2, '0'),
  label: `${i.toString().padStart(2, '0')}:00`,
}));

interface ScheduleStepProps {
  sendNow?: boolean;
  scheduledDate?: Date;
  timezone?: string;
  onSendNowChange: (sendNow: boolean) => void;
  onScheduledDateChange: (date: Date | undefined) => void;
  onTimezoneChange: (tz: string) => void;
  isRTL?: boolean;
}

export function ScheduleStep({ 
  sendNow = true,
  scheduledDate,
  timezone = 'Asia/Dubai',
  onSendNowChange,
  onScheduledDateChange,
  onTimezoneChange,
  isRTL = false 
}: ScheduleStepProps) {
  const [selectedHour, setSelectedHour] = useState('09');

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      const newDate = new Date(date);
      newDate.setHours(parseInt(selectedHour), 0, 0, 0);
      onScheduledDateChange(newDate);
    } else {
      onScheduledDateChange(undefined);
    }
  };

  const handleHourChange = (hour: string) => {
    setSelectedHour(hour);
    if (scheduledDate) {
      const newDate = new Date(scheduledDate);
      newDate.setHours(parseInt(hour), 0, 0, 0);
      onScheduledDateChange(newDate);
    }
  };

  return (
    <div className="space-y-6">
      <div className={cn("text-center", isRTL && "font-arabic")}>
        <h2 className="text-xl font-bold text-foreground mb-2">
          {isRTL ? 'جدولة الحملة' : 'Schedule Campaign'}
        </h2>
        <p className="text-muted-foreground">
          {isRTL 
            ? 'اختر متى تريد إرسال حملتك'
            : 'Choose when you want to send your campaign'}
        </p>
      </div>

      {/* Send Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          onClick={() => onSendNowChange(true)}
          className={cn(
            "cursor-pointer transition-all border-2",
            sendNow 
              ? "ring-2 ring-primary ring-offset-2 border-primary shadow-lg" 
              : "border-border/50 hover:border-primary/50 hover:shadow-md"
          )}
        >
          <CardContent className="p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Send className="h-7 w-7 text-primary" />
            </div>
            <h3 className={cn("font-bold text-lg mb-2", isRTL && "font-arabic")}>
              {isRTL ? 'إرسال الآن' : 'Send Now'}
            </h3>
            <p className={cn("text-sm text-muted-foreground", isRTL && "font-arabic")}>
              {isRTL 
                ? 'أرسل حملتك فوراً'
                : 'Send your campaign immediately'}
            </p>
          </CardContent>
        </Card>

        <Card
          onClick={() => onSendNowChange(false)}
          className={cn(
            "cursor-pointer transition-all border-2",
            !sendNow 
              ? "ring-2 ring-primary ring-offset-2 border-primary shadow-lg" 
              : "border-border/50 hover:border-primary/50 hover:shadow-md"
          )}
        >
          <CardContent className="p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-7 w-7 text-blue-600" />
            </div>
            <h3 className={cn("font-bold text-lg mb-2", isRTL && "font-arabic")}>
              {isRTL ? 'جدولة لاحقاً' : 'Schedule Later'}
            </h3>
            <p className={cn("text-sm text-muted-foreground", isRTL && "font-arabic")}>
              {isRTL 
                ? 'اختر تاريخ ووقت محدد'
                : 'Choose a specific date and time'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Details */}
      {!sendNow && (
        <Card className="border-primary/20">
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date Picker */}
              <div className="space-y-2">
                <Label className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <CalendarIcon className="h-4 w-4" />
                  {isRTL ? 'التاريخ' : 'Date'}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduledDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledDate 
                        ? format(scheduledDate, "PPP")
                        : (isRTL ? 'اختر التاريخ' : 'Pick a date')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={handleDateChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Picker */}
              <div className="space-y-2">
                <Label className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <Clock className="h-4 w-4" />
                  {isRTL ? 'الوقت' : 'Time'}
                </Label>
                <Select value={selectedHour} onValueChange={handleHourChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hours.map(hour => (
                      <SelectItem key={hour.value} value={hour.value}>
                        {hour.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                <Globe className="h-4 w-4" />
                {isRTL ? 'المنطقة الزمنية' : 'Timezone'}
              </Label>
              <Select value={timezone} onValueChange={onTimezoneChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            {scheduledDate && (
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  {isRTL ? 'ستُرسل الحملة في:' : 'Campaign will be sent on:'}
                </p>
                <p className="font-semibold text-lg">
                  {format(scheduledDate, "EEEE, MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
