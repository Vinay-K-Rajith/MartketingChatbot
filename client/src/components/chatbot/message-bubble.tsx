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
  if (Array.isArray(text)) {
    return text.flatMap((part, idx) => {
      if (typeof part === "string") {
        return linkify(part);
      }
      return part;
    });
  }

  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const urlRegex = /((https?:\/\/[^\s<]+)|(www\.[^\s<]+))/gi;
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

  let parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = mdLinkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
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
    text = text.slice(lastIndex);
  } else {
    return parts;
  }

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

function formatMessageContent(content: string, isUser: boolean): JSX.Element {
  if (isUser) {
    return <span>{linkify(content)}</span>;
  }

  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  
  lines.forEach((line, index) => {
    const key = `line-${index}`;
    line = line.replace(/^[\s]*\*[\s]*(\*\*)/, ' $1');

    if (line.match(/^\*\*(.+)\*\*:?$/)) {
      const headerText = line.replace(/^\*\*(.+)\*\*:?$/, '$1');
      elements.push(
        <div key={key} className="font-semibold text-school-blue mb-2 mt-3 first:mt-0 text-base md:text-lg">
          {linkify(headerText)}
        </div>
      );
    }
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
    else if (line.match(/^[\s]*[-*•]\s+(.+)$/)) {
      const bulletText = line.replace(/^[\s]*[-*•]\s+(.+)$/, '$1');
      const processedBulletText = bulletText.includes('**')
        ? bulletText.split(/(\*\*[^*]+\*\*)/).map((part, idx) => {
            if (part.match(/^\*\*(.+)\*\*$/)) {
              const boldText = part.replace(/^\*\*(.+)\*\*$/, '$1');
              return <strong key={`bullet-bold-${idx}`} className="font-semibold text-school-blue">{boldText}</strong>;
            }
            return linkify(part);
          })
        : linkify(bulletText);
      
      elements.push(
        <div key={key} className="flex items-start ml-1 sm:ml-2 mb-1">
          <span className="text-school-blue mr-2 text-lg align-top flex-shrink-0" style={{ fontWeight: 700 }}>•</span>
          <span className="flex-1 min-w-0">{processedBulletText}</span>
        </div>
      );
    }
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
        <div key={key} className="flex items-start ml-4 sm:ml-6 mb-1">
          <span className="text-school-blue mr-2 mt-0.5 flex-shrink-0" style={{ fontWeight: 700 }}>◦</span>
          <span className="flex-1 min-w-0">{processedBulletText}</span>
        </div>
      );
    }
    else if (line.match(/^[\s]*[✅📸📜☝️🚫🔗📅📞📧📝📂📁📌📍💡🔔🕒🏫👨‍🎓👩‍🎓🏆🎓📚🏅🗂️🗃️🗄️🗓️🗒️🗳️🗝️🗺️🗨️🗯️🗳️🗞️🗿🛎️🛡️🧾🧑‍🏫🧑‍🎓]\s+(.+)$/)) {
      const match = line.match(/^[\s]*([✅📸📜☝️🚫🔗📅📞📧📝📂📁📌📍💡🔔🕒🏫👨‍🎓👩‍🎓🏆🎓📚🏅🗂️🗃️🗄️🗓️🗒️🗳️🗝️🗺️🗨️🗯️🗳️🗞️🗿🛎️🛡️🧾🧑‍🏫🧑‍🎓])\s+(.+)$/);
      if (match) {
        const emoji = match[1];
        const text = match[2];
        const processedText = text.includes('**')
          ? text.split(/(\*\*[^*]+\*\*)/).map((part, idx) => {
              if (part.match(/^\*\*(.+)\*\*$/)) {
                const boldText = part.replace(/^\*\*(.+)\*\*$/, '$1');
                return <strong key={`emoji-bold-${idx}`} className="font-semibold text-school-blue">{boldText}</strong>;
              }
              return linkify(part);
            })
          : linkify(text);
        
        elements.push(
          <div key={key} className="flex items-start ml-1 sm:ml-2 mb-1">
            <span className="mr-2 mt-1 text-lg flex-shrink-0">{emoji}</span>
            <span className="flex-1 min-w-0">{processedText}</span>
          </div>
        );
      }
    }
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
    else {
      elements.push(<div key={key} className="mb-2"></div>);
    }
  });

  return <>{elements}</>;
}

export function MessageBubble({ content = "", isUser, timestamp, options, onOptionClick }: MessageBubbleProps) {
  const formattedContent = useMemo(() => formatMessageContent(content, isUser), [content, isUser]);

  // The special button label to match
  const lmsButtonLabel = "LMS (Learning Management System)";

  return (
    <div
      className={`flex items-start space-x-2 sm:space-x-3 animate-fade-in ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
      style={{ marginBottom: isUser ? '0.5rem' : '1.25rem' }}
    >
      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 ${isUser ? 'bg-school-orange' : 'bg-school-blue'}`}>
        {isUser ? <User className="w-3 h-3 sm:w-4 sm:h-4" /> : <Bot className="w-3 h-3 sm:w-4 sm:h-4" />}
      </div>
      <div
        className={`rounded-2xl p-3 sm:p-4 max-w-[80%] sm:max-w-[85%] min-w-0 ${isUser
          ? 'bg-school-blue text-white rounded-tr-sm'
          : 'bg-blue-50 text-gray-900 rounded-tl-sm border border-blue-100 shadow-sm'}`}
        style={{ 
          fontSize: isUser ? '0.95rem' : '1rem', 
          fontWeight: isUser ? 400 : 500, 
          lineHeight: 1.6 
        }}
      >
        <div className={`leading-relaxed overflow-wrap-anywhere ${isUser ? 'text-white' : 'text-gray-900'}`}
          style={{ 
            fontSize: isUser ? '0.95rem' : '1rem', 
            fontWeight: isUser ? 400 : 500,
            wordBreak: 'break-word',
            overflowWrap: 'break-word'
          }}
        >
          {formattedContent}
        </div>
        {/* Render menu options if present */}
        {options && options.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:gap-4 mt-3 sm:mt-4">
            {options.map((opt, idx) => {
              // All options use the new style as per instructions
              return (
                <button
                  key={idx}
                  className="font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gray-50 hover:bg-white h-10 px-4 w-full flex items-center gap-3 justify-center whitespace-normal break-words rounded-xl shadow-sm border border-gray-100 hover:border-gray-200 py-3 text-base md:text-sm min-h-[3.5rem] text-gray-600 hover:text-gray-700"
                  onClick={() => onOptionClick && onOptionClick(opt)}
                >
                  <span className="block w-full text-center whitespace-normal break-words">
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <div className={`text-xs mt-1 sm:mt-2 opacity-70 ${isUser ? 'text-white' : 'text-gray-500'}`}
          style={{ marginTop: isUser ? '0.25rem' : '0.5rem' }}
        >
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}
