import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, RotateCcw, Calendar, ArrowLeft, Book, User, FileText, DollarSign, Store, HelpCircle, Users, Calendar as CalendarIcon, BarChart2, ClipboardList, Truck, Library, LayoutDashboard, UserCheck, MessageCircle, ShieldCheck, Settings, Layers, Briefcase, Building2, Globe, Inbox, CheckSquare, CreditCard, Utensils, Box, User as UserIcon, Phone as PhoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import { QuickActions } from "./quick-actions";
import { TypingIndicator } from "./typing-indicator";
import { useChat } from "@/hooks/use-chat";
import { workflow, WorkflowNode } from "@/lib/workflow";
import { nanoid } from "nanoid";

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

// Add new type for demo enquiry fields
const demoFields = [
  { name: "name", label: "Your Name", type: "text", required: true },
  { name: "designation", label: "Designation", type: "text", required: true },
  { name: "phone", label: "Mobile Number", type: "tel", required: true },
  { name: "school", label: "School Name", type: "text", required: true },
  { name: "location", label: "Location (State/City)", type: "text", required: true },
  { name: "strength", label: "Student Strength", type: "number", required: true },
  { name: "serviceType", label: "Select Service for Demo", type: "select", required: true, options: ["ERP", "LMS", "DC", "All Services"] },
];

const moduleIcons: Record<string, any> = {
  "Exam and Assessment": FileText,
  "Student Information": User,
  "Student Registration": ClipboardList,
  "Fee and Billing": DollarSign,
  "Book Store": Store,
  "Enquiry": HelpCircle,
  "Staff Payroll": Users,
  "Student Attendance": CheckSquare,
  "Transport Information": Truck,
  "Library Management": Library,
  "Management Dashboard": LayoutDashboard,
  "Parent Portal": UserCheck,
  "Task Management": Briefcase,
  "Healthcare": ShieldCheck,
  "Lesson Plan": CalendarIcon,
  "Staff Information": Users,
  "SMS Communication": MessageCircle,
  "Front Office": Inbox,
  "School Online": Globe,
  "Online Assessment": FileText,
  "Timetable Management": CalendarIcon,
  "Fleet Management": Truck,
  "Inventory Management": Box,
  "Financial Accounting": CreditCard,
  "Hostel Management": Building2,
  "WhatsApp Integration": MessageCircle,
  "Email Integration": Inbox,
  "Cafeteria Management": Utensils,
};

// Add logChatMessage helper
async function logChatMessage({ sessionId, content, isUser, nodeKey, type = "menu" }: { sessionId: string, content: string, isUser: boolean, nodeKey?: string, type?: string }) {
  try {
    await fetch("/api/chat/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, content, isUser, nodeKey, type }),
    });
  } catch (err) {
    // Optionally handle error 
    console.error("Failed to log chat message", err);
  }
}

// Helper to detect if device is phone (mobile)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 600);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export function ChatInterface({ isOpen, onClose }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const { messages, sendMessage, isLoading, sessionId } = useChat();
  const [localMessages, setLocalMessages] = useState<any[]>([]); // Local chat history for workflow/menu
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);

  // Workflow state
  const [workflowKey, setWorkflowKey] = useState<string | null>("mainMenu");
  const [workflowHistory, setWorkflowHistory] = useState<string[]>([]);
  const [collectedContact, setCollectedContact] = useState<any>({});
  const [contactStep, setContactStep] = useState(0);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [inDemoForm, setInDemoForm] = useState(false);
  const [showEntabForm, setShowEntabForm] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // Chat-based onboarding state
  const [onboardingStep, setOnboardingStep] = useState(
    typeof window !== 'undefined' && !localStorage.getItem('entab_user_registered') ? 0 : null
  ); // 0: ask name, 1: ask phone, 2: ask school name, 3: ask student count, null: done
  const [userInfo, setUserInfo] = useState({ name: '', phone: '', schoolName: '', studentCount: '' });
  const [submitting, setSubmitting] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  // Use the backend proxy for registration
  const webhookUrl = '/api/register-user';

  // Add state for image modal
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // Detect if mobile
  const isMobile = useIsMobile();

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, localMessages, isLoading]);

  useEffect(() => {
    // Show Entab form immediately when workflowKey is 'scheduleDemo'
    if (workflowKey === 'scheduleDemo') {
      setShowEntabForm(true);
    } else {
      setShowEntabForm(false);
    }
  }, [workflowKey]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    await sendMessage(message);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = (query: string) => {
    sendMessage(query);
  };

  // Workflow navigation
  const currentNode: WorkflowNode | undefined = workflowKey ? workflow[workflowKey] : undefined;

  const handleWorkflowOption = (nextKey?: string) => {
    if (!nextKey) return;
    setWorkflowHistory((h) => [...h, workflowKey!]);
    setWorkflowKey(nextKey);
    setContactSubmitted(false);
  };

  const handleBack = () => {
    if (workflowHistory.length > 0) {
      const prev = [...workflowHistory];
      const last = prev.pop();
      setWorkflowHistory(prev);
      setWorkflowKey(last || "mainMenu");
      setContactSubmitted(false);
    } else {
      setWorkflowKey("mainMenu");
      setContactSubmitted(false);
    }
  };

  // Demo form logic
  const handleDemoStart = () => {
    setInDemoForm(true);
    setContactStep(0);
    setCollectedContact({});
  };
  const handleDemoFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCollectedContact({ ...collectedContact, [e.target.name]: e.target.value });
  };
  const handleDemoNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (contactStep < demoFields.length - 1) {
      setContactStep(contactStep + 1);
    } else {
      setContactSubmitted(true);
      setInDemoForm(false);
      setShowEntabForm(true);
      // TODO: Optionally, send collectedContact to backend
    }
  };
  const handleRestart = () => {
    setWorkflowKey("mainMenu");
    setWorkflowHistory([]);
    setContactStep(0);
    setCollectedContact({});
    setContactSubmitted(false);
    setInDemoForm(false);
    setShowEntabForm(false);
  };

  // Helper: open demo form
  const openDemoForm = () => {
    setWorkflowKey("scheduleDemo");
    setShowEntabForm(true);
  };

  // Helper: go back to main menu
  const handleBackToMenu = () => {
    setWorkflowKey("mainMenu");
    setWorkflowHistory([]);
    setShowEntabForm(false);
  };

  // Helper to push a workflow/menu message into local chat history
  const pushWorkflowMessage = (nodeKey: string) => {
    const node = workflow[nodeKey];
    if (!node) return;
    setLocalMessages((msgs) => [
      ...msgs,
      {
        id: nanoid(),
        content: node.message || '',
        isUser: false,
        timestamp: new Date(),
        options: node.options,
        image: node.image,
        nodeKey,
      },
    ]);
    logChatMessage({
      sessionId,
      content: node.message || '',
      isUser: false,
      nodeKey,
      type: "menu",
    });
  };

  // On mount, push the main menu as the first message
  useEffect(() => {
    if (localMessages.length === 0) {
      pushWorkflowMessage('mainMenu');
    }
  }, []);

  // Handler for menu option click
  const handleMenuOption = (opt: { label: string; next?: string; query?: string }) => {
    // Push the user's selection as a user message bubble
    setLocalMessages((msgs) => [
      ...msgs,
      {
        id: nanoid(),
        content: opt.label,
        isUser: true,
        timestamp: new Date(),
      },
    ]);
    logChatMessage({
      sessionId,
      content: opt.label,
      isUser: true,
      nodeKey: workflowKey ?? undefined,
      type: "menu",
    });
    // Then push the bot/menu response
    if (opt.next === 'scheduleDemo') {
      setLocalMessages((msgs) => [
        ...msgs,
        {
          id: nanoid(),
          content: 'Please complete your demo request by submitting the official Entab form below.',
          isUser: false,
          timestamp: new Date(),
          type: 'form',
        },
      ]);
    } else if (opt.next) {
      setTimeout(() => pushWorkflowMessage(opt.next!), 200); // slight delay for realism
    } else if (opt.query) {
      // Optionally, you could also push the query as a user message, but it's already shown above
      sendMessage(opt.query);
    }
  };

  // Chat-based onboarding handlers
  const handleOnboardingSubmit = async (value: string) => {
    setOnboardingError(null);
    if (onboardingStep === 0) {
      if (!value.trim()) {
        setOnboardingError('Please enter your name.');
        return;
      }
      setUserInfo((u) => ({ ...u, name: value }));
      setInputValue(''); // Clear input after name
      setOnboardingStep(1);
    } else if (onboardingStep === 1) {
      const phonePattern = /^\+?\d{10,15}$/;
      if (!phonePattern.test(value.trim())) {
        setOnboardingError('Please enter a valid phone number.');
        return;
      }
      setUserInfo((u) => ({ ...u, phone: value }));
      setInputValue('');
      setOnboardingStep(2);
    } else if (onboardingStep === 2) {
      if (!value.trim()) {
        setOnboardingError('Please enter your school name.');
        return;
      }
      setUserInfo((u) => ({ ...u, schoolName: value }));
      setInputValue('');
      setOnboardingStep(3);
    } else if (onboardingStep === 3) {
      const studentCount = parseInt(value);
      if (isNaN(studentCount) || studentCount <= 0) {
        setOnboardingError('Please enter a valid number of students.');
        return;
      }
      setUserInfo((u) => ({ ...u, studentCount: value }));
      setSubmitting(true);
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: userInfo.name,
            phone: userInfo.phone,
            schoolName: userInfo.schoolName,
            studentCount: value
          }),
        });
        localStorage.setItem('entab_user_registered', 'true');
        setInputValue('');
        setOnboardingStep(null);
      } catch (err) {
        setOnboardingError(
          err instanceof Error
            ? err.message
            : 'Failed to register. Please try again.'
        );
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (!isOpen) return null;

  // --- Responsive style helpers for mobile ---
  // For ScrollArea and chat area, max height for mobile (under 640px) should be device height minus input, no header on phone
  // We'll use a style object for ScrollArea wrapper and for hiding header

  // Get window height for maxHeight (for mobile)
  const [windowHeight, setWindowHeight] = useState<number | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const update = () => setWindowHeight(window.innerHeight);
      update();
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
  }, []);

  // Height for chat area (mobile): minus input (about 64px), minus FAB (if visible, about 60-80px)
  const chatAreaMaxHeightMobile = windowHeight
    ? windowHeight - 64 // input
    : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end"
      onClick={onClose}
    >
      {/* Image Modal */}
      {enlargedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" onClick={() => setEnlargedImage(null)}>
          <img src={enlargedImage} alt="Enlarged" className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl border-4 border-white" />
        </div>
      )}
      <div
        className={
          "w-full md:w-[520px] max-w-[calc(100vw-0.5rem)] sm:max-w-[calc(100vw-1rem)] h-[calc(100vh-1rem)] sm:h-[calc(92vh-47px)] md:h-[46.075rem] bg-white rounded-xl sm:rounded-3xl shadow-2xl border border-gray-200 flex flex-col animate-slide-up overflow-hidden m-1 sm:m-2 md:m-4 relative"
        }
        onClick={e => e.stopPropagation()}
        style={isMobile ? { borderRadius: 0, margin: 0, border: "none" } : undefined}
      >
        {/* Header with Back, Logo, and Close buttons */}
        <div
          className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-white border-b border-blue-100 rounded-t-xl sm:rounded-t-3xl relative"
          style={isMobile ? { display: "none" } : undefined}
        >
          <button
            className="flex items-center gap-1 text-school-blue font-semibold text-sm sm:text-base hover:underline focus:outline-none"
            onClick={handleBackToMenu}
            aria-label="Back to Menu"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <img
              src="https://images.yourstory.com/cs/images/company_products/entab-infotech-pvt-ltd_1615368324541.jpg"
              alt="Entab Logo"
              className="h-6 sm:h-8 md:h-10 object-contain"
              style={{ maxWidth: '80px', ...(typeof window !== "undefined" && window.innerWidth >= 640 ? { maxWidth: '120px' } : {}) }}
            />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col">
            <ScrollArea
              className={`flex-1 px-2 sm:px-4 py-2 sm:py-4 bg-white`}
              ref={scrollAreaRef}
              style={
                isMobile
                  ? {
                      maxWidth: "100vw",
                      width: "100vw",
                      minWidth: "100vw",
                      paddingLeft: 0,
                      paddingRight: 0,
                      maxHeight: chatAreaMaxHeightMobile ? `${chatAreaMaxHeightMobile}px` : undefined,
                    }
                  : undefined
              }
            >
              <div
                className="space-y-3 sm:space-y-4"
                style={
                  isMobile
                    ? {
                        maxWidth: "100vw",
                        width: "100vw",
                        minWidth: "100vw",
                        marginLeft: 0,
                        marginRight: 0,
                      }
                    : undefined
                }
              >
                {/* Onboarding chat flow */}
                {onboardingStep !== null && (
                  <div className="flex flex-col items-center w-full animate-fade-in">
                    <MessageBubble
                      content={
                        onboardingStep === 0
                          ? '👋 Welcome! Before we begin, may I know your name?'
                          : onboardingStep === 1
                          ? `Thanks, ${userInfo.name || 'there'}! Could you please share your phone number?`
                          : onboardingStep === 2
                          ? `Great! Now, could you please share your school name?`
                          : `Finally, what's the total number of students in your school?`
                      }
                      isUser={false}
                      timestamp={new Date()}
                    />
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        if (inputValue) handleOnboardingSubmit(inputValue);
                      }}
                      className="w-full flex flex-col items-center mt-4"
                      autoComplete="off"
                    >
                      <div className="w-full max-w-md bg-blue-50 border border-blue-100 rounded-xl sm:rounded-2xl shadow-md p-3 sm:p-5 flex flex-col gap-2">
                        <label htmlFor="onboarding-input" className="text-school-blue font-semibold text-sm sm:text-base mb-1">
                          {onboardingStep === 0 
                            ? 'Your Name' 
                            : onboardingStep === 1 
                            ? 'Phone Number'
                            : onboardingStep === 2
                            ? 'School Name'
                            : 'Total Students'}
                        </label>
                        <div className="relative flex items-center">
                          {(() => {
                            const iconClass = "absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-4 h-4 sm:w-5 sm:h-5";
                            if (onboardingStep === 0) {
                              return <UserIcon className={iconClass} />;
                            } else if (onboardingStep === 1) {
                              return <PhoneIcon className={iconClass} />;
                            } else if (onboardingStep === 2) {
                              return <Building2 className={iconClass} />;
                            } else {
                              return <Users className={iconClass} />;
                            }
                          })()}
                          <Input
                            id="onboarding-input"
                            type={onboardingStep === 3 ? 'number' : onboardingStep === 1 ? 'tel' : 'text'}
                            placeholder={
                              onboardingStep === 0 
                                ? 'Enter your full name' 
                                : onboardingStep === 1 
                                ? 'e.g. +919999999999'
                                : onboardingStep === 2
                                ? 'Enter your school name'
                                : 'Enter total number of students'
                            }
                            disabled={submitting}
                            autoFocus
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            className="pl-10 pr-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-blue-200 rounded-xl focus:border-school-blue focus:ring-2 focus:ring-school-blue focus:ring-opacity-20 shadow-sm w-full"
                            aria-label={onboardingStep === 0 ? 'Your Name' : 'Phone Number'}
                          />
                        </div>
                        {onboardingError && (
                          <span className="text-red-500 text-xs mt-1">{onboardingError}</span>
                        )}
                        <Button
                          type="submit"
                          className="mt-2 sm:mt-3 w-full bg-school-blue text-white flex items-center justify-center gap-2 text-sm sm:text-base font-semibold rounded-xl shadow hover:bg-school-deep py-2 sm:py-3"
                          size="lg"
                          disabled={submitting}
                        >
                          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                          {onboardingStep === 0 ? 'Continue' : submitting ? 'Registering...' : 'Register'}
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
                {/* Main chat UI, only if onboarding is done */}
                {onboardingStep === null && (
                  (() => {
                    // Combine filtered localMessages and messages
                    const filteredLocal = localMessages.filter(msg => msg.content && msg.content.trim() !== "");
                    const filteredMessages = messages.filter(msg => msg.content && msg.content.trim() !== "");
                    const allMessages = [
                      ...filteredLocal.map(msg => ({ ...msg, _source: 'local' })),
                      ...filteredMessages.map(msg => ({ ...msg, _source: 'remote' }))
                    ];
                    return allMessages.map((msg, idx) => {
                      const isLast = idx === allMessages.length - 1;
                      if (msg.type === 'form') {
                        return (
                          <div
                            key={msg.id}
                            ref={isLast ? lastMessageRef : undefined}
                            className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm flex flex-col items-center mb-2"
                            style={isMobile ? { maxWidth: "100vw", width: "100vw", minWidth: "100vw" } : undefined}
                          >
                            <MessageBubble
                              content={msg.content}
                              isUser={msg.isUser}
                              timestamp={msg.timestamp ? new Date(msg.timestamp) : new Date()}
                            />
                            <iframe
                              src="https://www.entab.in/demo-enquiry.html"
                              width="100%"
                              height="600"
                              style={{ border: 'none', borderRadius: '8px', marginTop: '1rem' }}
                              title="Entab Demo Enquiry"
                            />
                          </div>
                        );
                      } else if (msg.options && Array.isArray(msg.options) && msg.options.length > 0) {
                        // Menu-driven message with options: keep layout as original (not single line)
                        return (
                          <div
                            key={msg.id}
                            ref={isLast ? lastMessageRef : undefined}
                            className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm mb-2"
                            style={isMobile ? { maxWidth: "100vw", width: "100vw", minWidth: "100vw" } : undefined}
                          >
                            <MessageBubble
                              content={msg.content}
                              isUser={msg.isUser}
                              timestamp={msg.timestamp ? new Date(msg.timestamp) : new Date()}
                            />
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                              {msg.options.map((opt: any, i: number) => (
                                <Button
                                  key={i}
                                  className="w-full bg-gray-50 hover:bg-white text-[#153A5B] hover:text-[#153A5B] border border-gray-100 rounded-lg shadow-sm text-xs font-semibold py-2 flex items-center justify-center"
                                  style={{ fontSize: "0.81rem", color: "#153A5B" }}
                                  onClick={() => handleMenuOption(opt)}
                                >
                                  {opt.icon && moduleIcons[opt.icon] ? (
                                    <span className="mr-2">
                                      {moduleIcons[opt.icon] && (
                                        <span>
                                          {moduleIcons[opt.icon]({ className: "w-5 h-5" })}
                                        </span>
                                      )}
                                    </span>
                                  ) : null}
                                  {opt.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div
                            key={msg.id}
                            ref={isLast ? lastMessageRef : undefined}
                            className={msg._source === 'remote' ? "bg-white border border-blue-100 rounded-xl p-4 shadow-sm mb-2" : undefined}
                            style={isMobile && msg._source === 'remote' ? { maxWidth: "100vw", width: "100vw", minWidth: "100vw" } : undefined}
                          >
                            <MessageBubble
                              content={msg.content}
                              isUser={msg.isUser}
                              timestamp={msg.timestamp ? new Date(msg.timestamp) : new Date()}
                              options={msg.options}
                              onOptionClick={handleMenuOption}
                            />
                          </div>
                        );
                      }
                    });
                  })()
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Floating Schedule a Demo Button (FAB) - responsive: full on desktop, icon-only on mobile, margin from input, hide on input focus */}
        {!currentNode?.options && !currentNode?.collectContact && !inputFocused && (
          <button
            onClick={openDemoForm}
            className="absolute z-50 bg-school-blue hover:bg-school-deep text-white rounded-full shadow-lg flex items-center font-semibold transition-all duration-200 px-6 py-3 md:px-6 md:py-3 px-3 py-3 right-4 md:right-6"
            style={{ bottom: '84px', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}
          >
            <Calendar className="w-6 h-6 md:mr-2" />
            <span className="hidden md:inline text-base font-semibold">Schedule a Demo</span>
          </button>
        )}

        {/* Chat Input: only show if not in workflow or demo form or embedded form */}
        {onboardingStep === null && (
          <div className="px-4 py-3 border-t bg-white rounded-b-2xl">
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Ask about ERP features or book a demo..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-school-blue focus:ring-2 focus:ring-school-blue focus:ring-opacity-20 shadow-sm"
                disabled={isLoading}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                style={isMobile ? { maxWidth: "100vw", width: "100vw", minWidth: "100vw" } : undefined}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading}
                className="bg-school-blue hover:bg-school-deep text-white w-10 h-10 rounded-full shadow"
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center font-semibold">
              Entab Infotech Pvt Ltd – BETA version
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
