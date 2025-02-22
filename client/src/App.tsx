import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import WizardPage from "@/pages/wizard";
import { AuthProvider } from "@/hooks/use-auth";
import { Navigation } from "@/components/Navigation";
import AuthPage from "@/pages/auth";
import ProfilePage from "@/pages/profile";
import VerifyEmailPage from "@/pages/verify-email";
import { useAuth } from "@/hooks/use-auth";
import { UserManagement } from "@/components/admin/UserManagement";
import { ModelSettings } from "@/components/admin/ModelSettings";
import { UsageStats } from "@/components/admin/UsageStats";

function AdminRoute({ component: Component, ...rest }: { component: React.ComponentType<any> }) {
  const { user } = useAuth();

  if (!user?.isAdmin) {
    return <NotFound />;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={WizardPage} />
      <Route path="/wizard" component={WizardPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/admin/users">
        {() => <AdminRoute component={UserManagement} />}
      </Route>
      <Route path="/admin/model-settings">
        {() => <AdminRoute component={ModelSettings} />}
      </Route>
      <Route path="/admin/usage-stats">
        {() => <AdminRoute component={UsageStats} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Navigation />
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;