import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ScrollToTop } from "./components/layout/ScrollToTop";
import { AppLayout } from "./components/layout/AppLayout";
import { StagesProvider } from "./contexts/StagesContext";
import { GroupsProvider } from "./contexts/GroupsContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { LocalizationProvider } from "./contexts/LocalizationContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { WhatsAppConnectionProvider } from "./contexts/WhatsAppConnectionContext";
import { EmailConnectionProvider } from "./contexts/EmailConnectionContext";
import { SMSConnectionProvider } from "./contexts/SMSConnectionContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";

// CRM Pages
import Dashboard from "./pages/Dashboard";
import LeadsPage from "./pages/LeadsPage";
import LeadDetailPage from "./pages/LeadDetailPage";
import ActivitiesPage from "./pages/ActivitiesPage";
import PipelinePage from "./pages/PipelinePage";
import LeadSourcesPage from "./pages/LeadSourcesPage";
import LeadAssignmentPage from "./pages/LeadAssignmentPage";
import AssignmentLogsPage from "./pages/AssignmentLogsPage";
import ListingsPage from "./pages/ListingsPage";
import ListingDetailPage from "./pages/ListingDetailPage";
import PublishToPortalsPage from "./pages/PublishToPortalsPage";
import ListingPresentationPage from "./pages/ListingPresentationPage";
import CompanyListingsPage from "./pages/CompanyListingsPage";
import CompanyListingDetailPage from "./pages/CompanyListingDetailPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import PortalSettingsPage from "./pages/PortalSettingsPage";
import SettingsPage from "./pages/SettingsPage";
import BillingPage from "./pages/BillingPage";
import RolesPermissionsPage from "./pages/RolesPermissionsPage";
import MarketingPage from "./pages/MarketingPage";
import CampaignsPage from "./pages/CampaignsPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import WhatsAppChatbotPage from "./pages/WhatsAppChatbotPage";
import TeamsPage from "./pages/TeamsPage";
import MenuPage from "./pages/MenuPage";
import AuthPage from "./pages/AuthPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

const AppRoutes = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/login" element={<Navigate to="/auth" replace />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />

      {/* Protected CRM Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/leads/:id" element={<LeadDetailPage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/activities" element={<ActivitiesPage />} />
        <Route path="/lead-sources" element={<LeadSourcesPage />} />
        <Route path="/lead-assignment" element={<LeadAssignmentPage />} />
        <Route path="/assignment-logs" element={<AssignmentLogsPage />} />
        <Route path="/listings" element={<ListingsPage />} />
        <Route path="/listings/:id" element={<ListingDetailPage />} />
        <Route path="/listings/:id/publish" element={<PublishToPortalsPage />} />
        <Route path="/listings/:id/presentation" element={<ListingPresentationPage />} />
        <Route path="/company-listings" element={<CompanyListingsPage />} />
        <Route path="/company-listings/:id" element={<CompanyListingDetailPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/portal-settings" element={<PortalSettingsPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/agents" element={<Navigate to="/teams" replace />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/roles" element={<RolesPermissionsPage />} />
        <Route path="/marketing" element={<MarketingPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/connections" element={<ConnectionsPage />} />
        <Route path="/whatsapp-chatbot" element={<WhatsAppChatbotPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/menu" element={<MenuPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <OrganizationProvider>
              <LocalizationProvider>
                <WhatsAppConnectionProvider>
                  <EmailConnectionProvider>
                    <SMSConnectionProvider>
                      <SubscriptionProvider>
                        <StagesProvider>
                          <GroupsProvider>
                            <Toaster />
                            <Sonner />
                            <BrowserRouter>
                              <ScrollToTop />
                              <AppRoutes />
                            </BrowserRouter>
                          </GroupsProvider>
                        </StagesProvider>
                      </SubscriptionProvider>
                    </SMSConnectionProvider>
                  </EmailConnectionProvider>
                </WhatsAppConnectionProvider>
              </LocalizationProvider>
            </OrganizationProvider>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;