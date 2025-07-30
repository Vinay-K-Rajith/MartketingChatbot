// Image data for home page
export const homeImages = [
  {
    key: "school",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/St._Xavier%27s_High_School%2C_Bathinda.jpg/640px-St._Xavier%27s_High_School%2C_Bathinda.jpg",
    alt: "St. Xavier's High School, Bathinda campus"
  },
  {
    key: "shooting-range",
    url: "/attached_assets/shooting-range.jpg",
    alt: "School shooting range"
  }
];

import { ChatInterface } from "@/components/chatbot/chat-interface";

export default function Home() {
  return (
    <div className="font-inter bg-gray-50 min-h-screen flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <ChatInterface isOpen={true} onClose={() => {}} />
      </div>
    </div>
  );
}
