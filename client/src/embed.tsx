import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatButton } from "./components/chatbot/chat-button";
import "./index.css";

const container = document.getElementById("school-chat-widget");

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <ChatButton />
        </TooltipProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
} 