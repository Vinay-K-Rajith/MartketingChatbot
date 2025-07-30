import { Layers, DollarSign, Phone, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onQuickAction: (query: string) => void;
  noIcons?: boolean;
}

const quickActions = [
  {
    id: "features",
    label: "Ask about ERP Features",
    icon: Layers,
    query: "What are the main features of Entab's school ERP?",
  },
  {
    id: "pricing",
    label: "Get Pricing Information",
    icon: DollarSign,
    query: "Can you provide pricing or a quote for Entab's solutions?",
  },
  {
    id: "contact",
    label: "Request Contact Details",
    icon: Phone,
    query: "How can I contact Entab for more information?",
  },
  {
    id: "support",
    label: "Learn About Support",
    icon: HelpCircle,
    query: "What kind of support does Entab offer to schools?",
  },
];

export function QuickActions({ onQuickAction, noIcons }: QuickActionsProps) {
  return (
    <div className="p-2 bg-school-light border-b">
      <p className="text-sm text-school-deep mb-2 font-medium">
        Quick Actions:
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 xs:grid-cols-1">
        {quickActions.map((action) => {
          const IconComponent = action.icon;
          return (
            <Button
              key={action.id}
              onClick={() => onQuickAction(action.query)}
              variant="outline"
              size="sm"
              className="bg-white border-school-blue text-school-blue px-3 py-2 text-xs hover:bg-school-blue hover:text-white transition-colors w-full xs:text-sm xs:py-3 xs:px-4"
            >
              {!noIcons && <IconComponent className="w-4 h-4 mr-2 sm:w-5 sm:h-5 hidden sm:inline" />}
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
