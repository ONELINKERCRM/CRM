import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

type Language = 'en' | 'ar';
type Currency = 'AED' | 'QAR' | 'SAR' | 'KWD' | 'OMR' | 'BHD' | 'USD';

export const timezones = [
  { value: 'Asia/Dubai', label: 'Dubai (GMT+4)', labelAr: 'دبي' },
  { value: 'Asia/Qatar', label: 'Doha (GMT+3)', labelAr: 'الدوحة' },
  { value: 'Asia/Riyadh', label: 'Riyadh (GMT+3)', labelAr: 'الرياض' },
  { value: 'Asia/Kuwait', label: 'Kuwait (GMT+3)', labelAr: 'الكويت' },
  { value: 'Asia/Muscat', label: 'Muscat (GMT+4)', labelAr: 'مسقط' },
  { value: 'Asia/Bahrain', label: 'Manama (GMT+3)', labelAr: 'المنامة' },
  { value: 'Europe/London', label: 'London (GMT+0)', labelAr: 'لندن' },
  { value: 'America/New_York', label: 'New York (GMT-5)', labelAr: 'نيويورك' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)', labelAr: 'لوس أنجلوس' },
  { value: 'UTC', label: 'UTC', labelAr: 'التوقيت العالمي' },
];

export const currencies: { code: Currency; name: string; nameAr: string; symbol: string }[] = [
  { code: 'AED', name: 'UAE Dirham', nameAr: 'درهم إماراتي', symbol: 'د.إ' },
  { code: 'QAR', name: 'Qatar Riyal', nameAr: 'ريال قطري', symbol: 'ر.ق' },
  { code: 'SAR', name: 'Saudi Riyal', nameAr: 'ريال سعودي', symbol: 'ر.س' },
  { code: 'KWD', name: 'Kuwait Dinar', nameAr: 'دينار كويتي', symbol: 'د.ك' },
  { code: 'OMR', name: 'Omani Rial', nameAr: 'ريال عماني', symbol: 'ر.ع' },
  { code: 'BHD', name: 'Bahrain Dinar', nameAr: 'دينار بحريني', symbol: 'د.ب' },
  { code: 'USD', name: 'US Dollar', nameAr: 'دولار أمريكي', symbol: '$' },
];

// Translation dictionary
const translations: Record<string, Record<Language, string>> = {
  // Common
  'save': { en: 'Save', ar: 'حفظ' },
  'cancel': { en: 'Cancel', ar: 'إلغاء' },
  'loading': { en: 'Loading...', ar: 'جاري التحميل...' },
  'search': { en: 'Search', ar: 'بحث' },
  'filter': { en: 'Filter', ar: 'تصفية' },
  'filters': { en: 'Filters', ar: 'التصفيات' },
  'edit': { en: 'Edit', ar: 'تعديل' },
  'delete': { en: 'Delete', ar: 'حذف' },
  'add': { en: 'Add', ar: 'إضافة' },
  'view': { en: 'View', ar: 'عرض' },
  'close': { en: 'Close', ar: 'إغلاق' },
  'confirm': { en: 'Confirm', ar: 'تأكيد' },
  'back': { en: 'Back', ar: 'رجوع' },
  'next': { en: 'Next', ar: 'التالي' },
  'submit': { en: 'Submit', ar: 'إرسال' },
  'success': { en: 'Success', ar: 'نجاح' },
  'error': { en: 'Error', ar: 'خطأ' },
  'warning': { en: 'Warning', ar: 'تحذير' },
  'info': { en: 'Info', ar: 'معلومات' },
  'all': { en: 'All', ar: 'الكل' },
  'export': { en: 'Export', ar: 'تصدير' },
  'import': { en: 'Import', ar: 'استيراد' },
  'customize': { en: 'Customize', ar: 'تخصيص' },
  'refresh': { en: 'Refresh', ar: 'تحديث' },
  'manage': { en: 'Manage', ar: 'إدارة' },
  'actions': { en: 'Actions', ar: 'إجراءات' },
  'menu': { en: 'Menu', ar: 'القائمة' },

  // Navigation
  'dashboard': { en: 'Dashboard', ar: 'لوحة التحكم' },
  'leads': { en: 'Leads', ar: 'العملاء المحتملين' },
  'listings': { en: 'Listings', ar: 'العقارات' },
  'my_listings': { en: 'My Listings', ar: 'عقاراتي' },
  'marketing': { en: 'Marketing', ar: 'التسويق' },
  'teams': { en: 'Teams', ar: 'الفرق' },
  'settings': { en: 'Settings', ar: 'الإعدادات' },
  'pipeline': { en: 'Pipeline', ar: 'مسار المبيعات' },
  'integrations': { en: 'Integrations', ar: 'التكاملات' },
  'notifications': { en: 'Notifications', ar: 'الإشعارات' },
  'profile': { en: 'Profile', ar: 'الملف الشخصي' },
  'logout': { en: 'Log Out', ar: 'تسجيل الخروج' },

  // Navigation Sections
  'leads_management': { en: 'Leads Management', ar: 'إدارة العملاء' },
  'marketing_hub': { en: 'Marketing Hub', ar: 'مركز التسويق' },
  'admin': { en: 'Admin', ar: 'الإدارة' },

  // Additional Navigation Items
  'lead_sources': { en: 'Lead Sources', ar: 'مصادر العملاء' },
  'lead_assignment': { en: 'Lead Assignment', ar: 'توزيع العملاء' },
  'campaigns': { en: 'Campaigns', ar: 'الحملات' },
  'whatsapp_bot': { en: 'WhatsApp Bot', ar: 'بوت واتساب' },
  'connections': { en: 'Connections', ar: 'الاتصالات' },
  'company_listings': { en: 'Company Listings', ar: 'عقارات الشركة' },
  'portal_settings': { en: 'Portal Settings', ar: 'إعدادات البوابة' },
  'roles_permissions': { en: 'Roles & Permissions', ar: 'الأدوار والصلاحيات' },
  'billing': { en: 'Billing', ar: 'الفواتير' },

  // Settings
  'language': { en: 'Language', ar: 'اللغة' },
  'timezone': { en: 'Timezone', ar: 'المنطقة الزمنية' },
  'currency': { en: 'Currency', ar: 'العملة' },
  'company': { en: 'Company', ar: 'الشركة' },
  'appearance': { en: 'Appearance', ar: 'المظهر' },
  'security': { en: 'Security', ar: 'الأمان' },
  'api_keys': { en: 'API Keys', ar: 'مفاتيح API' },

  // Leads
  'new_lead': { en: 'New Lead', ar: 'عميل جديد' },
  'add_lead': { en: 'Add Lead', ar: 'إضافة عميل' },
  'lead_name': { en: 'Lead Name', ar: 'اسم العميل' },
  'phone': { en: 'Phone', ar: 'الهاتف' },
  'email': { en: 'Email', ar: 'البريد الإلكتروني' },
  'source': { en: 'Source', ar: 'المصدر' },
  'stage': { en: 'Stage', ar: 'المرحلة' },
  'assigned_agent': { en: 'Assigned Agent', ar: 'الوكيل المسؤول' },
  'budget': { en: 'Budget', ar: 'الميزانية' },
  'created': { en: 'Created', ar: 'تم الإنشاء' },
  'last_contacted': { en: 'Last Contacted', ar: 'آخر تواصل' },
  'manage_track_leads': { en: 'Manage and track all your leads', ar: 'إدارة وتتبع جميع العملاء المحتملين' },
  'total_leads': { en: 'Total Leads', ar: 'إجمالي العملاء' },
  'new_leads': { en: 'New Leads', ar: 'العملاء الجدد' },
  'search_leads': { en: 'Search leads...', ar: 'البحث عن عملاء...' },

  // Listings
  'property': { en: 'Property', ar: 'العقار' },
  'price': { en: 'Price', ar: 'السعر' },
  'bedrooms': { en: 'Bedrooms', ar: 'غرف النوم' },
  'bathrooms': { en: 'Bathrooms', ar: 'الحمامات' },
  'area': { en: 'Area', ar: 'المساحة' },
  'location': { en: 'Location', ar: 'الموقع' },
  'status': { en: 'Status', ar: 'الحالة' },
  'published': { en: 'Published', ar: 'منشور' },
  'draft': { en: 'Draft', ar: 'مسودة' },
  'active': { en: 'Active', ar: 'نشط' },
  'pending': { en: 'Pending', ar: 'قيد الانتظار' },
  'sold': { en: 'Sold', ar: 'مباع' },
  'rented': { en: 'Rented', ar: 'مؤجر' },
  'add_listing': { en: 'Add Listing', ar: 'إضافة عقار' },
  'manage_property_listings': { en: 'Manage your property listings', ar: 'إدارة عقاراتك' },
  'total_listings': { en: 'Total Listings', ar: 'إجمالي العقارات' },
  'total_views': { en: 'Total Views', ar: 'إجمالي المشاهدات' },
  'inquiries': { en: 'Inquiries', ar: 'الاستفسارات' },
  'search_listings': { en: 'Search listings...', ar: 'البحث عن عقارات...' },
  'property_type': { en: 'Property Type', ar: 'نوع العقار' },
  'all_types': { en: 'All Types', ar: 'كل الأنواع' },
  'all_status': { en: 'All Status', ar: 'كل الحالات' },
  'apartment': { en: 'Apartment', ar: 'شقة' },
  'villa': { en: 'Villa', ar: 'فيلا' },
  'townhouse': { en: 'Townhouse', ar: 'تاون هاوس' },
  'penthouse': { en: 'Penthouse', ar: 'بنتهاوس' },
  'studio': { en: 'Studio', ar: 'استوديو' },

  // Marketing
  'campaign': { en: 'Campaign', ar: 'الحملة' },
  'create_campaign': { en: 'Create Campaign', ar: 'إنشاء حملة' },
  'send_now': { en: 'Send Now', ar: 'إرسال الآن' },
  'schedule': { en: 'Schedule', ar: 'جدولة' },

  // Teams
  'team': { en: 'Team', ar: 'الفريق' },
  'agent': { en: 'Agent', ar: 'الوكيل' },
  'agents': { en: 'Agents', ar: 'الوكلاء' },
  'role': { en: 'Role', ar: 'الدور' },
  'admin_role': { en: 'Admin', ar: 'مدير' },
  'manager': { en: 'Manager', ar: 'مدير فريق' },
  'team_leader': { en: 'Team Leader', ar: 'قائد فريق' },

  // Chatbot / Messages
  'message': { en: 'Message', ar: 'رسالة' },
  'messages': { en: 'Messages', ar: 'الرسائل' },
  'send': { en: 'Send', ar: 'إرسال' },
  'type_message': { en: 'Type a message...', ar: 'اكتب رسالة...' },
  'inbox': { en: 'Inbox', ar: 'البريد الوارد' },

  // Time
  'today': { en: 'Today', ar: 'اليوم' },
  'yesterday': { en: 'Yesterday', ar: 'أمس' },
  'this_week': { en: 'This Week', ar: 'هذا الأسبوع' },
  'last_week': { en: 'Last Week', ar: 'الأسبوع الماضي' },
  'this_month': { en: 'This Month', ar: 'هذا الشهر' },
  'last_month': { en: 'Last Month', ar: 'الشهر الماضي' },

  // Dashboard specific
  'good_morning': { en: 'Good morning', ar: 'صباح الخير' },
  'good_afternoon': { en: 'Good afternoon', ar: 'مساء الخير' },
  'good_evening': { en: 'Good evening', ar: 'مساء الخير' },
  'crm_overview': { en: "Here's your CRM overview for today.", ar: 'نظرة عامة على نظامك اليوم.' },
  'key_metrics': { en: 'Key Metrics', ar: 'المقاييس الرئيسية' },
  'conversion_rate': { en: 'Conversion Rate', ar: 'معدل التحويل' },
  'active_listings': { en: 'Active Listings', ar: 'العقارات النشطة' },
  'meetings_today': { en: 'Meetings Today', ar: 'اجتماعات اليوم' },
  'follow_ups_due': { en: 'Follow Ups Due', ar: 'المتابعات المستحقة' },
  'calls_made': { en: 'Calls Made', ar: 'المكالمات المنجزة' },
  'revenue_mtd': { en: 'Revenue (MTD)', ar: 'الإيرادات (الشهر الحالي)' },
  'hot_leads': { en: 'Hot Leads', ar: 'العملاء المميزين' },
  'avg_response_time': { en: 'Avg Response Time', ar: 'متوسط وقت الاستجابة' },
  'leads_trend': { en: 'Leads Trend', ar: 'اتجاه العملاء' },
  'leads_by_stage': { en: 'Leads by Stage', ar: 'العملاء حسب المرحلة' },
  'leads_by_source': { en: 'Leads by Source', ar: 'العملاء حسب المصدر' },
  'agent_performance': { en: 'Agent Performance', ar: 'أداء الوكلاء' },
  'recent_activities': { en: 'Recent Activities', ar: 'الأنشطة الأخيرة' },
  'upcoming': { en: 'upcoming', ar: 'قادمة' },
  'overdue': { en: 'overdue', ar: 'متأخرة' },
  'improved': { en: 'improved', ar: 'تحسن' },
  'ready_to_close': { en: 'Ready to close', ar: 'جاهز للإغلاق' },
  'from_last_month': { en: 'from last month', ar: 'من الشهر الماضي' },
  'from_last_week': { en: 'from last week', ar: 'من الأسبوع الماضي' },
  'vs_goal': { en: 'vs goal', ar: 'مقارنة بالهدف' },
  'closed': { en: 'Closed', ar: 'مغلق' },
  'lost': { en: 'Lost', ar: 'خسارة' },
  'contacted': { en: 'Contacted', ar: 'تم التواصل' },
  'follow_up': { en: 'Follow Up', ar: 'متابعة' },
  'meeting': { en: 'Meeting', ar: 'اجتماع' },
  'new': { en: 'New', ar: 'جديد' },

  // Settings specific
  'save_changes': { en: 'Save Changes', ar: 'حفظ التغييرات' },
  'settings_saved': { en: 'Settings saved successfully', ar: 'تم حفظ الإعدادات بنجاح' },
  'select_language': { en: 'Select Language', ar: 'اختر اللغة' },
  'select_timezone': { en: 'Select Timezone', ar: 'اختر المنطقة الزمنية' },
  'select_currency': { en: 'Select Currency', ar: 'اختر العملة' },
  'localization': { en: 'Localization', ar: 'التوطين' },
  'localization_desc': { en: 'Manage your language, timezone, and currency preferences', ar: 'إدارة تفضيلات اللغة والمنطقة الزمنية والعملة' },
  'preview_changes': { en: 'Preview Changes', ar: 'معاينة التغييرات' },
  'current_time': { en: 'Current Time', ar: 'الوقت الحالي' },
  'sample_price': { en: 'Sample Price', ar: 'سعر نموذجي' },

  // Common UI Elements
  'name': { en: 'Name', ar: 'الاسم' },
  'description': { en: 'Description', ar: 'الوصف' },
  'title': { en: 'Title', ar: 'العنوان' },
  'details': { en: 'Details', ar: 'التفاصيل' },
  'notes': { en: 'Notes', ar: 'ملاحظات' },
  'comments': { en: 'Comments', ar: 'التعليقات' },
  'date': { en: 'Date', ar: 'التاريخ' },
  'time': { en: 'Time', ar: 'الوقت' },
  'created_at': { en: 'Created At', ar: 'تاريخ الإنشاء' },
  'updated_at': { en: 'Updated At', ar: 'تاريخ التحديث' },
  'created_by': { en: 'Created By', ar: 'أنشئ بواسطة' },
  'updated_by': { en: 'Updated By', ar: 'حدث بواسطة' },
  'owner': { en: 'Owner', ar: 'المالك' },
  'assigned_to': { en: 'Assigned To', ar: 'مسند إلى' },
  'priority': { en: 'Priority', ar: 'الأولوية' },
  'high': { en: 'High', ar: 'عالية' },
  'medium': { en: 'Medium', ar: 'متوسطة' },
  'low': { en: 'Low', ar: 'منخفضة' },
  'urgent': { en: 'Urgent', ar: 'عاجل' },
  'normal': { en: 'Normal', ar: 'عادي' },

  // Actions & Buttons
  'create': { en: 'Create', ar: 'إنشاء' },
  'update': { en: 'Update', ar: 'تحديث' },
  'remove': { en: 'Remove', ar: 'إزالة' },
  'duplicate': { en: 'Duplicate', ar: 'نسخ' },
  'archive': { en: 'Archive', ar: 'أرشفة' },
  'restore': { en: 'Restore', ar: 'استعادة' },
  'download': { en: 'Download', ar: 'تحميل' },
  'upload': { en: 'Upload', ar: 'رفع' },
  'print': { en: 'Print', ar: 'طباعة' },
  'share': { en: 'Share', ar: 'مشاركة' },
  'copy': { en: 'Copy', ar: 'نسخ' },
  'paste': { en: 'Paste', ar: 'لصق' },
  'cut': { en: 'Cut', ar: 'قص' },
  'undo': { en: 'Undo', ar: 'تراجع' },
  'redo': { en: 'Redo', ar: 'إعادة' },
  'select_all': { en: 'Select All', ar: 'تحديد الكل' },
  'deselect_all': { en: 'Deselect All', ar: 'إلغاء التحديد' },
  'clear': { en: 'Clear', ar: 'مسح' },
  'reset': { en: 'Reset', ar: 'إعادة تعيين' },
  'apply': { en: 'Apply', ar: 'تطبيق' },
  'done': { en: 'Done', ar: 'تم' },
  'finish': { en: 'Finish', ar: 'إنهاء' },
  'continue': { en: 'Continue', ar: 'متابعة' },
  'skip': { en: 'Skip', ar: 'تخطي' },
  'previous': { en: 'Previous', ar: 'السابق' },
  'more': { en: 'More', ar: 'المزيد' },
  'less': { en: 'Less', ar: 'أقل' },
  'show_more': { en: 'Show More', ar: 'عرض المزيد' },
  'show_less': { en: 'Show Less', ar: 'عرض أقل' },
  'expand': { en: 'Expand', ar: 'توسيع' },
  'collapse': { en: 'Collapse', ar: 'طي' },
  'open': { en: 'Open', ar: 'فتح' },

  // Status & States
  'enabled': { en: 'Enabled', ar: 'مفعل' },
  'disabled': { en: 'Disabled', ar: 'معطل' },
  'available': { en: 'Available', ar: 'متاح' },
  'unavailable': { en: 'Unavailable', ar: 'غير متاح' },
  'online': { en: 'Online', ar: 'متصل' },
  'offline': { en: 'Offline', ar: 'غير متصل' },
  'completed': { en: 'Completed', ar: 'مكتمل' },
  'incomplete': { en: 'Incomplete', ar: 'غير مكتمل' },
  'in_progress': { en: 'In Progress', ar: 'قيد التنفيذ' },
  'on_hold': { en: 'On Hold', ar: 'معلق' },
  'cancelled': { en: 'Cancelled', ar: 'ملغي' },
  'approved': { en: 'Approved', ar: 'موافق عليه' },
  'rejected': { en: 'Rejected', ar: 'مرفوض' },
  'verified': { en: 'Verified', ar: 'موثق' },
  'unverified': { en: 'Unverified', ar: 'غير موثق' },

  // Messages & Notifications
  'success_message': { en: 'Operation completed successfully', ar: 'تمت العملية بنجاح' },
  'error_message': { en: 'An error occurred', ar: 'حدث خطأ' },
  'warning_message': { en: 'Please review before proceeding', ar: 'يرجى المراجعة قبل المتابعة' },
  'info_message': { en: 'Information', ar: 'معلومات' },
  'no_data': { en: 'No data available', ar: 'لا توجد بيانات' },
  'no_results': { en: 'No results found', ar: 'لم يتم العثور على نتائج' },
  'loading_data': { en: 'Loading data...', ar: 'جاري تحميل البيانات...' },
  'saving_data': { en: 'Saving...', ar: 'جاري الحفظ...' },
  'deleting_data': { en: 'Deleting...', ar: 'جاري الحذف...' },
  'processing': { en: 'Processing...', ar: 'جاري المعالجة...' },
  'please_wait': { en: 'Please wait', ar: 'يرجى الانتظار' },
  'are_you_sure': { en: 'Are you sure?', ar: 'هل أنت متأكد؟' },
  'cannot_be_undone': { en: 'This action cannot be undone', ar: 'لا يمكن التراجع عن هذا الإجراء' },
  'confirm_delete': { en: 'Are you sure you want to delete this?', ar: 'هل أنت متأكد من حذف هذا؟' },
  'confirm_action': { en: 'Please confirm this action', ar: 'يرجى تأكيد هذا الإجراء' },
  'required_field': { en: 'This field is required', ar: 'هذا الحقل مطلوب' },
  'invalid_input': { en: 'Invalid input', ar: 'إدخال غير صحيح' },
  'changes_saved': { en: 'Changes saved successfully', ar: 'تم حفظ التغييرات بنجاح' },
  'changes_discarded': { en: 'Changes discarded', ar: 'تم تجاهل التغييرات' },

  // Forms & Inputs
  'enter': { en: 'Enter', ar: 'أدخل' },
  'select': { en: 'Select', ar: 'اختر' },
  'choose': { en: 'Choose', ar: 'اختر' },
  'pick': { en: 'Pick', ar: 'انتقي' },
  'browse': { en: 'Browse', ar: 'تصفح' },
  'search_for': { en: 'Search for', ar: 'ابحث عن' },
  'type_here': { en: 'Type here...', ar: 'اكتب هنا...' },
  'enter_text': { en: 'Enter text', ar: 'أدخل النص' },
  'select_option': { en: 'Select an option', ar: 'اختر خياراً' },
  'choose_file': { en: 'Choose file', ar: 'اختر ملف' },
  'drop_files': { en: 'Drop files here', ar: 'أسقط الملفات هنا' },
  'or': { en: 'or', ar: 'أو' },
  'and': { en: 'and', ar: 'و' },
  'optional': { en: 'Optional', ar: 'اختياري' },
  'required': { en: 'Required', ar: 'مطلوب' },

  // Pagination & Lists
  'page': { en: 'Page', ar: 'صفحة' },
  'of': { en: 'of', ar: 'من' },
  'items': { en: 'items', ar: 'عناصر' },
  'per_page': { en: 'per page', ar: 'لكل صفحة' },
  'showing': { en: 'Showing', ar: 'عرض' },
  'to': { en: 'to', ar: 'إلى' },
  'first': { en: 'First', ar: 'الأول' },
  'last': { en: 'Last', ar: 'الأخير' },
  'go_to_page': { en: 'Go to page', ar: 'انتقل إلى الصفحة' },
  'rows_per_page': { en: 'Rows per page', ar: 'صفوف لكل صفحة' },

  // Tables
  'columns': { en: 'Columns', ar: 'الأعمدة' },
  'rows': { en: 'Rows', ar: 'الصفوف' },
  'sort_by': { en: 'Sort by', ar: 'ترتيب حسب' },
  'sort_ascending': { en: 'Sort Ascending', ar: 'ترتيب تصاعدي' },
  'sort_descending': { en: 'Sort Descending', ar: 'ترتيب تنازلي' },
  'group_by': { en: 'Group by', ar: 'تجميع حسب' },
  'filter_by': { en: 'Filter by', ar: 'تصفية حسب' },
  'show_columns': { en: 'Show Columns', ar: 'عرض الأعمدة' },
  'hide_columns': { en: 'Hide Columns', ar: 'إخفاء الأعمدة' },

  // Settings Page Specific
  'account': { en: 'Account', ar: 'الحساب' },
  'personal_information': { en: 'Personal Information', ar: 'المعلومات الشخصية' },
  'company_details': { en: 'Company Details', ar: 'تفاصيل الشركة' },
  'notification_preferences': { en: 'Notification Preferences', ar: 'تفضيلات الإشعارات' },
  'theme_preferences': { en: 'Theme Preferences', ar: 'تفضيلات المظهر' },
  'change_password': { en: 'Change Password', ar: 'تغيير كلمة المرور' },
  'danger_zone': { en: 'Danger Zone', ar: 'منطقة الخطر' },
  'delete_account': { en: 'Delete Account', ar: 'حذف الحساب' },
  'api_access': { en: 'API Access', ar: 'الوصول لواجهة البرمجة' },
  'full_name': { en: 'Full Name', ar: 'الاسم الكامل' },
  'email_address': { en: 'Email Address', ar: 'عنوان البريد الإلكتروني' },
  'phone_number': { en: 'Phone Number', ar: 'رقم الهاتف' },
  'profile_picture': { en: 'Profile Picture', ar: 'صورة الملف الشخصي' },
  'change_picture': { en: 'Change Picture', ar: 'تغيير الصورة' },
  'company_name': { en: 'Company Name', ar: 'اسم الشركة' },
  'website': { en: 'Website', ar: 'الموقع الإلكتروني' },
  'email_notifications': { en: 'Email Notifications', ar: 'إشعارات البريد الإلكتروني' },
  'push_notifications': { en: 'Push Notifications', ar: 'الإشعارات الفورية' },
  'new_lead_alerts': { en: 'New Lead Alerts', ar: 'تنبيهات العملاء الجدد' },
  'weekly_reports': { en: 'Weekly Reports', ar: 'التقارير الأسبوعية' },
  'color_theme': { en: 'Color Theme', ar: 'نظام الألوان' },
  'light': { en: 'Light', ar: 'فاتح' },
  'dark': { en: 'Dark', ar: 'داكن' },
  'system': { en: 'System', ar: 'النظام' },
  'current_password': { en: 'Current Password', ar: 'كلمة المرور الحالية' },
  'new_password': { en: 'New Password', ar: 'كلمة المرور الجديدة' },
  'confirm_password': { en: 'Confirm Password', ar: 'تأكيد كلمة المرور' },
  'update_password': { en: 'Update Password', ar: 'تحديث كلمة المرور' },
  'api_key': { en: 'API Key', ar: 'مفتاح API' },
  'regenerate': { en: 'Regenerate', ar: 'إعادة إنشاء' },
  'api_documentation': { en: 'API Documentation', ar: 'وثائق API' },
  'view_documentation': { en: 'View Documentation', ar: 'عرض الوثائق' },

  // Additional Common Terms
  'yes': { en: 'Yes', ar: 'نعم' },
  'no': { en: 'No', ar: 'لا' },
  'ok': { en: 'OK', ar: 'موافق' },
  'got_it': { en: 'Got it', ar: 'فهمت' },
  'dismiss': { en: 'Dismiss', ar: 'تجاهل' },
  'learn_more': { en: 'Learn More', ar: 'معرفة المزيد' },
  'help': { en: 'Help', ar: 'مساعدة' },
  'support': { en: 'Support', ar: 'الدعم' },
  'documentation': { en: 'Documentation', ar: 'التوثيق' },
  'feedback': { en: 'Feedback', ar: 'الملاحظات' },
  'report_issue': { en: 'Report Issue', ar: 'الإبلاغ عن مشكلة' },
  'version': { en: 'Version', ar: 'الإصدار' },
  'powered_by': { en: 'Powered by', ar: 'مدعوم من' },
  'all_rights_reserved': { en: 'All rights reserved', ar: 'جميع الحقوق محفوظة' },

};

type LocalizationContextType = {
  language: Language;
  timezone: string;
  currency: Currency;
  isRTL: boolean;
  isLoading: boolean;
  isSaving: boolean;
  setLanguage: (lang: Language) => Promise<void>;
  setTimezone: (tz: string) => Promise<void>;
  setCurrency: (curr: Currency) => Promise<void>;
  t: (key: string) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: Date | string) => string;
  formatDateTime: (date: Date | string) => string;
  formatRelativeTime: (date: Date | string) => string;
  formatCurrency: (amount: number, currencyOverride?: Currency) => string;
  formatNumber: (num: number) => string;
  getCurrencySymbol: (currencyCode?: Currency) => string;
};

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [language, setLanguageState] = useState<Language>('en');
  const [timezone, setTimezoneState] = useState('Asia/Dubai');
  const [currency, setCurrencyState] = useState<Currency>('AED');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isRTL = language === 'ar';

  // Load user preferences
  useEffect(() => {
    if (profile) {
      setLanguageState((profile as any).language || 'en');
      setTimezoneState((profile as any).timezone || 'Asia/Dubai');
      setCurrencyState((profile as any).currency || 'AED');
    }
    setIsLoading(false);
  }, [profile]);

  // Auto-detect timezone on first load
  useEffect(() => {
    if (!profile && !user) {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const matchedTz = timezones.find(tz => tz.value === detectedTimezone);
      if (matchedTz) {
        setTimezoneState(matchedTz.value);
      }
    }
  }, [profile, user]);

  // Update document direction
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [isRTL, language]);

  const updateProfile = async (updates: Record<string, any>) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (error) throw error;
    } catch (error) {
      console.error('Failed to update preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await updateProfile({ language: lang });
  };

  const setTimezone = async (tz: string) => {
    setTimezoneState(tz);
    await updateProfile({ timezone: tz });
  };

  const setCurrency = async (curr: Currency) => {
    setCurrencyState(curr);
    await updateProfile({ currency: curr });
  };

  const t = useCallback((key: string): string => {
    const translation = translations[key];
    if (!translation) return key;
    return translation[language] || translation['en'] || key;
  }, [language]);

  const formatDate = useCallback((date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-AE' : 'en-AE', {
      timeZone: timezone,
      dateStyle: 'medium',
      ...options,
    }).format(d);
  }, [language, timezone]);

  const formatTime = useCallback((date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-AE' : 'en-AE', {
      timeZone: timezone,
      timeStyle: 'short',
    }).format(d);
  }, [language, timezone]);

  const formatDateTime = useCallback((date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-AE' : 'en-AE', {
      timeZone: timezone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  }, [language, timezone]);

  const formatRelativeTime = useCallback((date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return language === 'ar' ? 'الآن' : 'Just now';
    if (diffMins < 60) return language === 'ar' ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
    if (diffHours < 24) return language === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    if (diffDays < 7) return language === 'ar' ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
    return formatDate(d);
  }, [language, formatDate]);

  const formatCurrency = useCallback((amount: number, currencyOverride?: Currency): string => {
    const curr = currencyOverride || currency;
    const locale = language === 'ar' ? 'ar-AE' : 'en-AE';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, [currency, language]);

  const formatNumber = useCallback((num: number): string => {
    const locale = language === 'ar' ? 'ar-AE' : 'en-AE';
    return new Intl.NumberFormat(locale).format(num);
  }, [language]);

  const getCurrencySymbol = useCallback((currencyCode?: Currency): string => {
    const curr = currencies.find(c => c.code === (currencyCode || currency));
    return curr?.symbol || currency;
  }, [currency]);

  return (
    <LocalizationContext.Provider
      value={{
        language,
        timezone,
        currency,
        isRTL,
        isLoading,
        isSaving,
        setLanguage,
        setTimezone,
        setCurrency,
        t,
        formatDate,
        formatTime,
        formatDateTime,
        formatRelativeTime,
        formatCurrency,
        formatNumber,
        getCurrencySymbol,
      }}
    >
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
}