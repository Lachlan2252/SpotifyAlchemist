import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import MaximalistHome from "@/pages/maximalist-home";
import NotFound from "@/pages/not-found";
import AiAssistant from "@/components/ai-assistant";
import { motion } from "framer-motion";

function Router() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <Switch>
        <Route path="/" component={MaximalistHome} />
        <Route component={NotFound} />
      </Switch>
    </motion.div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="spotify-alchemist-theme">
        <TooltipProvider>
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 text-white overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(76,29,149,0.1),transparent)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,69,19,0.1),transparent)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(30,58,138,0.1),transparent)] pointer-events-none" />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative z-10"
            >
              <Toaster />
              <Router />
              <AiAssistant />
            </motion.div>
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
