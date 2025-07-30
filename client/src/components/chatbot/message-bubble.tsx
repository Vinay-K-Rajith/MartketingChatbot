import { Bot, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useMemo } from "react";

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  timestamp: Date;
  options?: { label: string; next?: string; query?: string }[];
  onOptionClick?: (option: { label: string; next?: string; query?: string }) => void;
}

// Helper to linkify URLs, emails, and Markdown links in a string or array of strings/JSX
function linkify(text: string | (string | JSX.Element)[]): (string | JSX.Element)[] {
  // If already an array (from bold splitting), process each part
  if (Array.isArray(text)) {
    return text.flatMap((part, idx) => {
      if (typeof part === "string") {
        return linkify(part);
      }
      return part;
    });
  }

  // Regex for Markdown links [text](url)
  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  // Regex for URLs (http, https, www)
  const urlRegex = /((https?:\/\/[^\s<]+)|(www\.[^\s<]+))/gi;
  // Regex for emails
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

  // First, handle Markdown links
  let parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = mdLinkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      // Process the text before the match for URLs/emails
      parts = parts.concat(linkify(text.slice(lastIndex, match.index)));
    }
    const [fullMatch, linkText, linkUrl] = match;
    parts.push(
      <a
        key={`mdlink-${match.index}-${linkUrl}`}
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline text-blue-600 break-all hover:text-blue-800"
      >
        {linkText}
      </a>
    );
    lastIndex = match.index + fullMatch.length;
  }
  if (lastIndex < text.length) {
    // Process the rest for URLs/emails
    text = text.slice(lastIndex);
  } else {
    return parts;
  }

  // Now handle plain URLs and emails in the remaining text
  const combinedRegex = new RegExp(`${urlRegex.source}|${emailRegex.source}`, "gi");
  lastIndex = 0;
  while ((match = combinedRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const matchedText = match[0];
    if (matchedText.match(emailRegex)) {
      parts.push(
        <a
          key={`email-${match.index}-${matchedText}`}
          href={`mailto:${matchedText}`}
          className="underline text-blue-600 break-all hover:text-blue-800"
        >
          {matchedText}
        </a>
      );
    } else if (matchedText.match(urlRegex)) {
      let cleanUrl = matchedText.replace(/([.,!?;:]+)$/g, "");
      let displayUrl = cleanUrl;
      const href = cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`;
      parts.push(
        <a
          key={`url-${match.index}-${cleanUrl}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-600 break-all hover:text-blue-800"
        >
          {displayUrl}
        </a>
      );
    }
    lastIndex = match.index + matchedText.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

// Format text content with basic markdown-like styling and linkification
function formatMessageContent(content: string, isUser: boolean): JSX.Element {
  if (isUser) {
    // For user, just linkify
    return <span>{linkify(content)}</span>;
  }

  // Split content by lines and process each line
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  
  lines.forEach((line, index) => {
    const key = `line-${index}`;
    
    // Remove asterisk if it appears just before bold (e.g., "* **Nursery:** ...")
    line = line.replace(/^[\s]*\*[\s]*(\*\*)/, ' $1');

    // Handle headers (starting with **)
    if (line.match(/^\*\*(.+)\*\*:?$/)) {
      const headerText = line.replace(/^\*\*(.+)\*\*:?$/, '$1');
      elements.push(
        <div key={key} className="font-semibold text-school-blue mb-2 mt-3 first:mt-0 text-base md:text-lg">
          {linkify(headerText)}
        </div>
      );
    }
    // Handle inline bold text within lines
    else if (line.includes('**')) {
      const processedLine = line.split(/(\*\*[^*]+\*\*)/).map((part, idx) => {
        if (part.match(/^\*\*(.+)\*\*$/)) {
          const boldText = part.replace(/^\*\*(.+)\*\*$/, '$1');
          return <strong key={`bold-${idx}`} className="font-semibold text-school-blue">{linkify(boldText)}</strong>;
        }
        return linkify(part);
      });
      elements.push(
        <div key={key} className="mb-1">
          {processedLine}
        </div>
      );
    }
    // Handle bullet points (starting with - or * or •)
    else if (line.match(/^[\s]*[-*•]\s+(.+)$/)) {
      const bulletText = line.replace(/^[\s]*[-*•]\s+(.+)$/, '$1');
      const processedBulletText = bulletText.includes('**')
        ? bulletText.split(/(\*\*[^*]+\*\*)/).map((part, index) => {
            if (part.match(/^\*\*(.+)\*\*$/)) {
              const boldText = part.replace(/^\*\*(.+)\*\*$/, '$1');
              return <strong key={`bullet-bold-${index}`} className="font-semibold text-school-blue">{boldText}</strong>;
            }
            return linkify(part);
          })
        : linkify(bulletText);
      
      elements.push(
        <div key={key} className="flex items-start ml-2 mb-1">
          <span className="text-school-blue mr-2 text-lg align-top" style={{ fontWeight: 700 }}>•</span>
          <span className="flex-1">{processedBulletText}</span>
        </div>
      );
    }
    // Handle nested bullet points (with indentation)
    else if (line.match(/^[\s]{4,}[-*•]\s+(.+)$/)) {
      const bulletText = line.replace(/^[\s]{4,}[-*•]\s+(.+)$/, '$1');
      const processedBulletText = bulletText.includes('**')
        ? bulletText.split(/(\*\*[^*]+\*\*)/).map((part, idx) => {
            if (part.match(/^\*\*(.+)\*\*$/)) {
              const boldText = part.replace(/^\*\*(.+)\*\*$/, '$1');
              return <strong key={`nested-bold-${idx}`} className="font-semibold text-school-blue">{linkify(boldText)}</strong>;
            }
            return linkify(part);
          })
        : linkify(bulletText);
      
      elements.push(
        <div key={key} className="flex items-start ml-6 mb-1">
          <span className="text-school-blue mr-2 mt-0.5" style={{ fontWeight: 700 }}>◦</span>
          <span className="flex-1">{processedBulletText}</span>
        </div>
      );
    }
    // Handle emoji bullets (✅, 📸, etc.)
    else if (line.match(/^[\s]*[✅📸📜☝️🚫🔗📅📞📧📝📂📁📌📍💡🔔🕒🏫👨‍🎓👩‍🎓🏆🎓📚🏅🗂️🗃️🗄️🗓️🗒️🗳️🗝️🗺️🗨️🗯️🗳️🗞️🗿🛎️🛡️🧾🧑‍🏫🧑‍🎓]\s+(.+)$/)) {
      const match = line.match(/^[\s]*([✅📸📜☝️🚫🔗📅📞📧📝📂📁📌📍💡🔔🕒🏫👨‍🎓👩‍🎓🏆🎓📚🏅🗂️🗃️🗄️🗓️🗒️🗳️🗝️🗺️🗨️🗯️🗳️🗞️🗿🛎️🛡️🧾🧑‍🏫🧑‍🎓])\s+(.+)$/);
      if (match) {
        const emoji = match[1];
        const text = match[2];
        const processedText = text.includes('**')
          ? text.split(/(\*\*[^*]+\*\*)/).map((part, index) => {
              if (part.match(/^\*\*(.+)\*\*$/)) {
                const boldText = part.replace(/^\*\*(.+)\*\*$/, '$1');
                return <strong key={`emoji-bold-${index}`} className="font-semibold text-school-blue">{boldText}</strong>;
              }
              return linkify(part);
            })
          : linkify(text);
        
        elements.push(
          <div key={key} className="flex items-start ml-2 mb-1">
            <span className="mr-2 mt-1 text-lg">{emoji}</span>
            <span className="flex-1">{processedText}</span>
          </div>
        );
      }
    }
    // Handle regular lines
    else if (line.trim()) {
      const processedLine = line.includes('**')
        ? line.split(/(\*\*[^*]+\*\*)/).map((part, idx) => {
            if (part.match(/^\*\*(.+)\*\*$/)) {
              const boldText = part.replace(/^\*\*(.+)\*\*$/, '$1');
              return <strong key={`regular-bold-${idx}`} className="font-semibold text-school-blue">{linkify(boldText)}</strong>;
            }
            return linkify(part);
          })
        : linkify(line);
      
      elements.push(
        <div key={key} className="mb-1">
          {processedLine}
        </div>
      );
    }
    // Handle empty lines (spacing)
    else {
      elements.push(<div key={key} className="mb-2"></div>);
    }
  });

  return <>{elements}</>;
}

export function MessageBubble({ content = "", isUser, timestamp, options, onOptionClick }: MessageBubbleProps) {
  const formattedContent = useMemo(() => formatMessageContent(content, isUser), [content, isUser]);

  return (
    <div
      className={`flex items-start space-x-3 animate-fade-in ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
      style={{ marginBottom: isUser ? '0.5rem' : '1.25rem' }}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 ${isUser ? 'bg-school-orange' : 'bg-school-blue'}`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div
        className={`rounded-2xl p-4 max-w-[85%] ${isUser
          ? 'bg-school-blue text-white rounded-tr-sm'
          : 'bg-blue-50 text-gray-900 rounded-tl-sm border border-blue-100 shadow-sm'}`}
        style={{ fontSize: isUser ? '1rem' : '1.08rem', fontWeight: isUser ? 400 : 500, lineHeight: 1.7 }}
      >
        <div className={`leading-relaxed ${isUser ? 'text-white' : 'text-gray-900'}`}
          style={{ fontSize: isUser ? '1rem' : '1.08rem', fontWeight: isUser ? 400 : 500 }}
        >
          {formattedContent}
        </div>
        {/* Render menu options if present */}
        {options && options.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {options.map((opt, idx) => (
              <button
                key={idx}
                className="font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-background hover:text-accent-foreground h-10 px-4 w-full flex items-center gap-3 justify-center whitespace-normal break-words rounded-xl shadow border-2 border-blue-200 hover:bg-blue-50 py-3 text-base md:text-sm min-h-[3.5rem]"
                onClick={() => onOptionClick && onOptionClick(opt)}
              >
                <span className="block w-full text-center whitespace-normal break-words">{opt.label}</span>
              </button>
            ))}
          </div>
        )}
        <div className={`text-xs mt-2 opacity-70 ${isUser ? 'text-white' : 'text-gray-500'}`}
          style={{ marginTop: isUser ? '0.25rem' : '0.5rem' }}
        >
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}
