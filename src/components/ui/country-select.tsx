import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface Country {
  code: string;
  name: string;
  nameAr: string;
  currency: string;
  timezone: string;
}

export const allCountries: Country[] = [
  // Middle East
  { code: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات العربية المتحدة', currency: 'AED', timezone: 'Asia/Dubai' },
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية', currency: 'SAR', timezone: 'Asia/Riyadh' },
  { code: 'QA', name: 'Qatar', nameAr: 'قطر', currency: 'QAR', timezone: 'Asia/Qatar' },
  { code: 'KW', name: 'Kuwait', nameAr: 'الكويت', currency: 'KWD', timezone: 'Asia/Kuwait' },
  { code: 'OM', name: 'Oman', nameAr: 'عُمان', currency: 'OMR', timezone: 'Asia/Muscat' },
  { code: 'BH', name: 'Bahrain', nameAr: 'البحرين', currency: 'BHD', timezone: 'Asia/Bahrain' },
  { code: 'IQ', name: 'Iraq', nameAr: 'العراق', currency: 'IQD', timezone: 'Asia/Baghdad' },
  { code: 'JO', name: 'Jordan', nameAr: 'الأردن', currency: 'JOD', timezone: 'Asia/Amman' },
  { code: 'LB', name: 'Lebanon', nameAr: 'لبنان', currency: 'LBP', timezone: 'Asia/Beirut' },
  { code: 'SY', name: 'Syria', nameAr: 'سوريا', currency: 'SYP', timezone: 'Asia/Damascus' },
  { code: 'PS', name: 'Palestine', nameAr: 'فلسطين', currency: 'ILS', timezone: 'Asia/Gaza' },
  { code: 'YE', name: 'Yemen', nameAr: 'اليمن', currency: 'YER', timezone: 'Asia/Aden' },
  // North Africa
  { code: 'EG', name: 'Egypt', nameAr: 'مصر', currency: 'EGP', timezone: 'Africa/Cairo' },
  { code: 'MA', name: 'Morocco', nameAr: 'المغرب', currency: 'MAD', timezone: 'Africa/Casablanca' },
  { code: 'TN', name: 'Tunisia', nameAr: 'تونس', currency: 'TND', timezone: 'Africa/Tunis' },
  { code: 'DZ', name: 'Algeria', nameAr: 'الجزائر', currency: 'DZD', timezone: 'Africa/Algiers' },
  { code: 'LY', name: 'Libya', nameAr: 'ليبيا', currency: 'LYD', timezone: 'Africa/Tripoli' },
  { code: 'SD', name: 'Sudan', nameAr: 'السودان', currency: 'SDG', timezone: 'Africa/Khartoum' },
  // Asia
  { code: 'TR', name: 'Turkey', nameAr: 'تركيا', currency: 'TRY', timezone: 'Europe/Istanbul' },
  { code: 'PK', name: 'Pakistan', nameAr: 'باكستان', currency: 'PKR', timezone: 'Asia/Karachi' },
  { code: 'IN', name: 'India', nameAr: 'الهند', currency: 'INR', timezone: 'Asia/Kolkata' },
  { code: 'BD', name: 'Bangladesh', nameAr: 'بنغلاديش', currency: 'BDT', timezone: 'Asia/Dhaka' },
  { code: 'ID', name: 'Indonesia', nameAr: 'إندونيسيا', currency: 'IDR', timezone: 'Asia/Jakarta' },
  { code: 'MY', name: 'Malaysia', nameAr: 'ماليزيا', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' },
  { code: 'SG', name: 'Singapore', nameAr: 'سنغافورة', currency: 'SGD', timezone: 'Asia/Singapore' },
  { code: 'TH', name: 'Thailand', nameAr: 'تايلاند', currency: 'THB', timezone: 'Asia/Bangkok' },
  { code: 'VN', name: 'Vietnam', nameAr: 'فيتنام', currency: 'VND', timezone: 'Asia/Ho_Chi_Minh' },
  { code: 'PH', name: 'Philippines', nameAr: 'الفلبين', currency: 'PHP', timezone: 'Asia/Manila' },
  { code: 'JP', name: 'Japan', nameAr: 'اليابان', currency: 'JPY', timezone: 'Asia/Tokyo' },
  { code: 'KR', name: 'South Korea', nameAr: 'كوريا الجنوبية', currency: 'KRW', timezone: 'Asia/Seoul' },
  { code: 'CN', name: 'China', nameAr: 'الصين', currency: 'CNY', timezone: 'Asia/Shanghai' },
  { code: 'HK', name: 'Hong Kong', nameAr: 'هونغ كونغ', currency: 'HKD', timezone: 'Asia/Hong_Kong' },
  // Europe
  { code: 'GB', name: 'United Kingdom', nameAr: 'المملكة المتحدة', currency: 'GBP', timezone: 'Europe/London' },
  { code: 'DE', name: 'Germany', nameAr: 'ألمانيا', currency: 'EUR', timezone: 'Europe/Berlin' },
  { code: 'FR', name: 'France', nameAr: 'فرنسا', currency: 'EUR', timezone: 'Europe/Paris' },
  { code: 'IT', name: 'Italy', nameAr: 'إيطاليا', currency: 'EUR', timezone: 'Europe/Rome' },
  { code: 'ES', name: 'Spain', nameAr: 'إسبانيا', currency: 'EUR', timezone: 'Europe/Madrid' },
  { code: 'PT', name: 'Portugal', nameAr: 'البرتغال', currency: 'EUR', timezone: 'Europe/Lisbon' },
  { code: 'NL', name: 'Netherlands', nameAr: 'هولندا', currency: 'EUR', timezone: 'Europe/Amsterdam' },
  { code: 'BE', name: 'Belgium', nameAr: 'بلجيكا', currency: 'EUR', timezone: 'Europe/Brussels' },
  { code: 'AT', name: 'Austria', nameAr: 'النمسا', currency: 'EUR', timezone: 'Europe/Vienna' },
  { code: 'CH', name: 'Switzerland', nameAr: 'سويسرا', currency: 'CHF', timezone: 'Europe/Zurich' },
  { code: 'SE', name: 'Sweden', nameAr: 'السويد', currency: 'SEK', timezone: 'Europe/Stockholm' },
  { code: 'NO', name: 'Norway', nameAr: 'النرويج', currency: 'NOK', timezone: 'Europe/Oslo' },
  { code: 'DK', name: 'Denmark', nameAr: 'الدنمارك', currency: 'DKK', timezone: 'Europe/Copenhagen' },
  { code: 'FI', name: 'Finland', nameAr: 'فنلندا', currency: 'EUR', timezone: 'Europe/Helsinki' },
  { code: 'IE', name: 'Ireland', nameAr: 'أيرلندا', currency: 'EUR', timezone: 'Europe/Dublin' },
  { code: 'PL', name: 'Poland', nameAr: 'بولندا', currency: 'PLN', timezone: 'Europe/Warsaw' },
  { code: 'CZ', name: 'Czech Republic', nameAr: 'التشيك', currency: 'CZK', timezone: 'Europe/Prague' },
  { code: 'GR', name: 'Greece', nameAr: 'اليونان', currency: 'EUR', timezone: 'Europe/Athens' },
  { code: 'RO', name: 'Romania', nameAr: 'رومانيا', currency: 'RON', timezone: 'Europe/Bucharest' },
  { code: 'HU', name: 'Hungary', nameAr: 'المجر', currency: 'HUF', timezone: 'Europe/Budapest' },
  { code: 'RU', name: 'Russia', nameAr: 'روسيا', currency: 'RUB', timezone: 'Europe/Moscow' },
  { code: 'UA', name: 'Ukraine', nameAr: 'أوكرانيا', currency: 'UAH', timezone: 'Europe/Kiev' },
  // Americas
  { code: 'US', name: 'United States', nameAr: 'الولايات المتحدة', currency: 'USD', timezone: 'America/New_York' },
  { code: 'CA', name: 'Canada', nameAr: 'كندا', currency: 'CAD', timezone: 'America/Toronto' },
  { code: 'MX', name: 'Mexico', nameAr: 'المكسيك', currency: 'MXN', timezone: 'America/Mexico_City' },
  { code: 'BR', name: 'Brazil', nameAr: 'البرازيل', currency: 'BRL', timezone: 'America/Sao_Paulo' },
  { code: 'AR', name: 'Argentina', nameAr: 'الأرجنتين', currency: 'ARS', timezone: 'America/Argentina/Buenos_Aires' },
  { code: 'CL', name: 'Chile', nameAr: 'تشيلي', currency: 'CLP', timezone: 'America/Santiago' },
  { code: 'CO', name: 'Colombia', nameAr: 'كولومبيا', currency: 'COP', timezone: 'America/Bogota' },
  { code: 'PE', name: 'Peru', nameAr: 'بيرو', currency: 'PEN', timezone: 'America/Lima' },
  // Africa
  { code: 'ZA', name: 'South Africa', nameAr: 'جنوب أفريقيا', currency: 'ZAR', timezone: 'Africa/Johannesburg' },
  { code: 'NG', name: 'Nigeria', nameAr: 'نيجيريا', currency: 'NGN', timezone: 'Africa/Lagos' },
  { code: 'KE', name: 'Kenya', nameAr: 'كينيا', currency: 'KES', timezone: 'Africa/Nairobi' },
  { code: 'GH', name: 'Ghana', nameAr: 'غانا', currency: 'GHS', timezone: 'Africa/Accra' },
  { code: 'ET', name: 'Ethiopia', nameAr: 'إثيوبيا', currency: 'ETB', timezone: 'Africa/Addis_Ababa' },
  { code: 'TZ', name: 'Tanzania', nameAr: 'تنزانيا', currency: 'TZS', timezone: 'Africa/Dar_es_Salaam' },
  // Oceania
  { code: 'AU', name: 'Australia', nameAr: 'أستراليا', currency: 'AUD', timezone: 'Australia/Sydney' },
  { code: 'NZ', name: 'New Zealand', nameAr: 'نيوزيلندا', currency: 'NZD', timezone: 'Pacific/Auckland' },
].sort((a, b) => a.name.localeCompare(b.name));

interface CountrySelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  isArabic?: boolean;
}

export function CountrySelect({
  value,
  onValueChange,
  placeholder = "Select country",
  disabled = false,
  className,
  isArabic = false,
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedCountry = allCountries.find((c) => c.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          {selectedCountry
            ? isArabic
              ? selectedCountry.nameAr
              : selectedCountry.name
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {allCountries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.nameAr}`}
                  onSelect={() => {
                    onValueChange(country.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === country.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1">
                    {isArabic ? country.nameAr : country.name}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {country.currency}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function getCurrencyByCountry(countryCode: string): string {
  const country = allCountries.find((c) => c.code === countryCode);
  return country?.currency || 'USD';
}

export function getTimezoneByCountry(countryCode: string): string {
  const country = allCountries.find((c) => c.code === countryCode);
  return country?.timezone || 'UTC';
}
