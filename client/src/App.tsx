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

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={WizardPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
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