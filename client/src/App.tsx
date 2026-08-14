import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { useEffect } from "react";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Chat from "./pages/Chat";
import Companion from "./pages/Companion";
import Companions from "./pages/Companions";
import Home from "./pages/Home";
import OhapiStudio from "./pages/OhapiStudio";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/companions" component={Companions} />
      <Route path="/companion/:slug" component={Companion} />
      <Route path="/chat" component={Chat} />
      <Route path="/chat/:slug" component={Chat} />
      <Route path="/ops/ohapi" component={OhapiStudio} />
      {/* The technical pilot is gone; anyone holding an old link lands on the catalog. */}
      <Route path="/pilot">{() => <Redirect to="/companions" />}</Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
