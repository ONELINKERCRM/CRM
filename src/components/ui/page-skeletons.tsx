import { Skeleton } from "./skeleton";
import { Card, CardContent, CardHeader } from "./card";
import { cn } from "@/lib/utils";

// Stat Card Skeleton
export function StatCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </Card>
  );
}

// Stats Grid Skeleton (2x2 on mobile, 4 columns on desktop)
export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
  );
}

// Listing/Property Card Skeleton
export function ListingCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full" />
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

// Mobile Listing Card Skeleton
export function MobileListingCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="flex gap-3 p-3">
        <Skeleton className="w-24 h-24 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-28" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </div>
    </Card>
  );
}

// Lead Row Skeleton for Table
export function LeadRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-4 w-24 hidden sm:block" />
      <Skeleton className="h-6 w-16 rounded-full hidden md:block" />
      <Skeleton className="h-4 w-20 hidden lg:block" />
      <Skeleton className="h-8 w-8 rounded" />
    </div>
  );
}

// Lead Card Skeleton for Mobile
export function LeadCardSkeleton() {
  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-6 w-6" />
      </div>
    </Card>
  );
}

// Filter Bar Skeleton
export function FilterBarSkeleton() {
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row">
        <Skeleton className="h-9 flex-1" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-[100px] sm:w-[130px]" />
          <Skeleton className="h-9 w-[100px] sm:w-[130px]" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
    </Card>
  );
}

// Page Header Skeleton
export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>
    </div>
  );
}

// Dashboard Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeaderSkeleton />
      <StatsGridSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Leads Page Skeleton
export function LeadsPageSkeleton({ isMobile }: { isMobile: boolean }) {
  return (
    <div className="space-y-4 md:space-y-6">
      {!isMobile && <PageHeaderSkeleton />}
      <FilterBarSkeleton />
      {isMobile ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <LeadCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <Card>
          {[...Array(6)].map((_, i) => (
            <LeadRowSkeleton key={i} />
          ))}
        </Card>
      )}
    </div>
  );
}

// Listings Page Skeleton
export function ListingsPageSkeleton({ isMobile }: { isMobile: boolean }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {!isMobile && <PageHeaderSkeleton />}
      <StatsGridSkeleton />
      <FilterBarSkeleton />
      {isMobile ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <MobileListingCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// Pipeline Skeleton
export function PipelineSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="w-72 flex-shrink-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <Card key={j} className="p-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-20" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Teams Page Skeleton
export function TeamsPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div className="space-y-6">
      {!isMobile && <PageHeaderSkeleton />}
      <FilterBarSkeleton />
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Marketing Page Skeleton
export function MarketingPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div className="space-y-6">
      {!isMobile && <PageHeaderSkeleton />}
      <StatsGridSkeleton />
      <FilterBarSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-5 w-5" />
            </div>
            <Skeleton className="h-5 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            <div className="flex gap-4">
              <div className="space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-8" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-8" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-10" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Integrations Page Skeleton
export function IntegrationsPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div className="space-y-6">
      {!isMobile && <PageHeaderSkeleton />}
      <StatsGridSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-4 w-full mb-4" />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-12 rounded-full" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-9" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Settings Page Skeleton
export function SettingsPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div className="space-y-6">
      {!isMobile && <PageHeaderSkeleton />}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="h-fit lg:col-span-1 p-2">
          <div className="space-y-1">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-4 w-48 mt-1" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Skeleton className="h-20 w-20 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
            <Skeleton className="h-px w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Menu Page Skeleton (Mobile)
export function MenuPageSkeleton() {
  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-1">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-36" />
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Card className="divide-y divide-border overflow-hidden">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-4" />
              </div>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}

// Lead Detail Page Skeleton
export function LeadDetailSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-7 w-40" />
      </div>
      
      <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3")}>
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-4">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <Skeleton className="h-5 w-24 mb-4" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-6 w-20 rounded-full" />
              ))}
            </div>
          </Card>
        </div>
        
        {/* Right Column - Timeline */}
        <div className="lg:col-span-2">
          <Card className="p-4">
            <Skeleton className="h-5 w-28 mb-4" />
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Listing Detail Page Skeleton
export function ListingDetailSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-7 w-48" />
      </div>
      
      {/* Image Gallery */}
      <Skeleton className="aspect-video w-full rounded-xl" />
      
      {/* Details */}
      <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3")}>
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-8 w-32 mb-2" />
            <div className="flex items-center gap-4 mb-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-1">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full mt-2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </Card>
        </div>
        
        <div className="lg:col-span-1">
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Generic Content Skeleton
export function ContentSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div className="space-y-6">
      {!isMobile && <PageHeaderSkeleton />}
      <Card className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// Lead Sources Page Skeleton
export function LeadSourcesPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div className="space-y-6">
      {!isMobile && <PageHeaderSkeleton />}
      <FilterBarSkeleton />
      {[...Array(3)].map((_, categoryIdx) => (
        <div key={categoryIdx} className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Billing Page Skeleton
export function BillingPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div className="space-y-6">
      {!isMobile && <PageHeaderSkeleton />}
      {/* Current Plan */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </Card>
      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-full" />
              <div className="space-y-2 pt-4">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-10 w-full mt-4" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Lead Assignment Page Skeleton
export function LeadAssignmentPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div className="space-y-6">
      {!isMobile && <PageHeaderSkeleton />}
      {/* Tabs */}
      <Skeleton className="h-10 w-full max-w-lg" />
      {/* Rules List */}
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-6" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-12 rounded-full" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Assignment Logs Page Skeleton
export function AssignmentLogsPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div className="space-y-6">
      {!isMobile && <PageHeaderSkeleton />}
      <FilterBarSkeleton />
      <Card>
        {/* Table Header */}
        <div className="border-b p-4">
          <div className="flex items-center gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
        {/* Table Rows */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </Card>
    </div>
  );
}

// Portal Settings Page Skeleton
export function PortalSettingsPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div className="space-y-6">
      {!isMobile && <PageHeaderSkeleton />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-10 rounded-full" />
              </div>
              <Skeleton className="h-9 w-full" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Roles & Permissions Page Skeleton
export function RolesPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div className="space-y-6">
      {!isMobile && <PageHeaderSkeleton />}
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Roles Section */}
        <Card className="p-4">
          <Skeleton className="h-5 w-24 mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
        {/* Permissions Section */}
        <Card className="p-4">
          <Skeleton className="h-5 w-28 mb-4" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <div className="grid grid-cols-4 gap-2">
                  {[...Array(4)].map((_, j) => (
                    <Skeleton key={j} className="h-8 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// Connections Page Skeleton
export function ConnectionsPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div className="space-y-6">
      {!isMobile && <PageHeaderSkeleton />}
      {/* Health Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-6 w-8" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </Card>
        ))}
      </div>
      {/* Tabs */}
      <Skeleton className="h-10 w-full max-w-md" />
      {/* Connection Cards */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-9" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Campaigns Page Skeleton
export function CampaignsPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      {/* Step Indicator */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              {i < 6 && <Skeleton className="h-0.5 w-8 hidden sm:block" />}
            </div>
          ))}
        </div>
      </Card>
      {/* Step Content */}
      <Card className="min-h-[400px] p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

// WhatsApp Chatbot Page Skeleton
export function WhatsAppChatbotPageSkeleton({ isMobile }: { isMobile?: boolean }) {
  return (
    <div className="space-y-6">
      {!isMobile && <PageHeaderSkeleton />}
      <Skeleton className="h-10 w-full max-w-sm" />
      <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3")}>
        {/* Conversations List */}
        <Card className="lg:col-span-1 p-0">
          <div className="p-3 border-b">
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="divide-y">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-full" />
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </Card>
        {/* Chat Area */}
        <Card className="lg:col-span-2 p-0">
          <div className="p-3 border-b flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="p-4 space-y-4 min-h-[300px]">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                <Skeleton className={cn("h-12 rounded-xl", i % 2 === 0 ? "w-2/3" : "w-1/2")} />
              </div>
            ))}
          </div>
          <div className="p-3 border-t flex items-center gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-10" />
          </div>
        </Card>
      </div>
    </div>
  );
}
