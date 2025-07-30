import { useState, useEffect, ReactNode, Dispatch, SetStateAction, useRef } from 'react';
import { MessageBubble } from "../components/chatbot/message-bubble";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import EntabWorkflowBuilder from './workflow';

type Session = {
  sessionId: string;
  messageCount: number;
  lastMessageAt: string;
};

type ChatMessage = {
  content: string;
  isUser: boolean;
  timestamp: string;
  nodeKey?: string;
  type?: string;
};


const EntabDashboard = () => {
  // Fetch all fields from MKB collection and treat each as a separate article
  useEffect(() => {
    fetch('/api/kb/raw')
      .then(res => res.json())
      .then(raw => {
        if (raw && typeof raw === 'object') {
          const articles = Object.entries(raw)
            .filter(([k]) => k !== '_id')
            .map(([key, value], idx) => ({
              id: idx + 1,
              title: key,
              category: 'general',
              content: String(value),
              status: 'published' as 'published',
              lastUpdated: '',
              wordCount: String(value).trim().split(/\s+/).length
            }));
          setKbArticles(articles);
        }
      });
  }, []);
  // Dashboard state and logic
  const [messagesPeriod, setMessagesPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [registrationsPeriod, setRegistrationsPeriod] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    sortBy: 'Newest First',
    searchId: ''
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'knowledge' | 'workflow'>('history');

  // --- Knowledge base state and logic (moved to bottom for separation) ---
  // Types for Knowledge Base
  interface KnowledgeArticle {
    id: number;
    title: string;
    category: string;
    content: string;
    status: 'published' | 'draft';
    lastUpdated: string;
    wordCount: number;
  }
  interface KnowledgeDocument {
    id: number;
    name: string;
    size: string;
    type: string;
    uploadDate: string;
    status: 'processed' | 'processing';
    extractedArticles: number;
  }

  const [kbTab, setKbTab] = useState<'articles' | 'documents'>('articles');
  const [kbSearchQuery, setKbSearchQuery] = useState<string>('');
  const [kbSelectedCategory, setKbSelectedCategory] = useState<string>('all');
  const [kbArticles, setKbArticles] = useState<KnowledgeArticle[]>([]);
  const [kbUploadedDocs, setKbUploadedDocs] = useState<KnowledgeDocument[]>([
    {
      id: 1,
      name: "Product_Brochure.pdf",
      size: "2.4 MB",
      type: "PDF",
      uploadDate: "2024-01-15",
      status: "processed",
      extractedArticles: 3
    },
    {
      id: 2,
      name: "User_Manual.docx",
      size: "1.8 MB",
      type: "Word",
      uploadDate: "2024-01-14",
      status: "processing",
      extractedArticles: 0
    }
  ]);
  const [kbShowEditor, setKbShowEditor] = useState<boolean>(false);
  const [kbCurrentArticle, setKbCurrentArticle] = useState<KnowledgeArticle | null>(null);
  const [kbEditorContent, setKbEditorContent] = useState<string>('');
  const [kbEditorTitle, setKbEditorTitle] = useState<string>('');
  const [kbEditorCategory, setKbEditorCategory] = useState<string>('general');
  const kbFileInputRef = useRef<HTMLInputElement | null>(null);

  const kbCategories = [
    { id: 'all', name: 'All Categories', count: kbArticles.length },
    { id: 'general', name: 'General', count: kbArticles.filter((a) => a.category === 'general').length },
    { id: 'products', name: 'Products', count: kbArticles.filter((a) => a.category === 'products').length },
    { id: 'support', name: 'Support', count: kbArticles.filter((a) => a.category === 'support').length },
    { id: 'policies', name: 'Policies', count: kbArticles.filter((a) => a.category === 'policies').length }
  ];
  const kbTabs = [
    { id: 'articles', name: 'Knowledge Base Data', icon: '📝', count: kbArticles.length },
    { id: 'documents', name: 'Documents', icon: '📄', count: kbUploadedDocs.length }
  ];
  const kbFilteredArticles = kbArticles.filter((article) => {
    const title = article.title || '';
    const content = article.content || '';
    const matchesSearch = title.toLowerCase().includes(kbSearchQuery.toLowerCase()) ||
      content.toLowerCase().includes(kbSearchQuery.toLowerCase());
    const matchesCategory = kbSelectedCategory === 'all' || article.category === kbSelectedCategory;
    return matchesSearch && matchesCategory;
  });
  const kbHandleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    files.forEach((file) => {
      const newDoc: KnowledgeDocument = {
        id: kbUploadedDocs.length + 1,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        type: file.name.split('.').pop()?.toUpperCase() || '',
        uploadDate: new Date().toISOString().split('T')[0],
        status: 'processing',
        extractedArticles: 0
      };
      setKbUploadedDocs((prev) => [...prev, newDoc]);
    });
    event.target.value = '';
  };
  const kbOpenEditor = (article: KnowledgeArticle | null = null) => {
    if (article) {
      setKbCurrentArticle(article);
      setKbEditorTitle(article.title);
      setKbEditorContent(article.content);
      setKbEditorCategory(article.category);
    } else {
      setKbCurrentArticle(null);
      setKbEditorTitle('');
      setKbEditorContent('');
      setKbEditorCategory('general');
    }
    setKbShowEditor(true);
  };
  // Save (create or update) article via API (each field is a key in the MKB doc)
  const kbSaveArticle = async () => {
    if (!kbEditorTitle.trim()) return;
    const key = kbEditorTitle.trim();
    const value = kbEditorContent;
    // PATCH the MKB doc with the new/updated field
    const res = await fetch('/api/kb/raw', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value })
    });
    if (res.ok) {
      setKbArticles(prev => {
        // If editing, update; if adding, append
        const idx = prev.findIndex(a => a.title === key);
        if (idx >= 0) {
          return prev.map((a, i) =>
            i === idx
              ? {
                  ...a,
                  content: value,
                  lastUpdated: new Date().toISOString().split('T')[0],
                  wordCount: value.trim().split(/\s+/).length
                }
              : a
          );
        } else {
          return [
            ...prev,
            {
              id: prev.length + 1,
              title: key,
              category: 'general',
              content: value,
              status: 'published' as 'published',
              lastUpdated: new Date().toISOString().split('T')[0],
              wordCount: value.trim().split(/\s+/).length
            }
          ];
        }
      });
    }
    setKbShowEditor(false);
  };
  // Delete article (remove field from MKB doc)
  const kbDeleteArticle = async (id: string | number) => {
    const article = kbArticles.find(a => a.id === id);
    if (!article) return;
    if (!window.confirm(`Delete the field "${article.title}" from the knowledge base?`)) return;
    const res = await fetch('/api/kb/raw', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [article.title]: null }) // convention: null means remove field
    });
    if (res.ok) {
      setKbArticles(prev => prev.filter(a => a.id !== id));
    }
  };
  const kbRenderArticles = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search articles..."
              value={kbSearchQuery}
              onChange={(e) => setKbSearchQuery(e.target.value)}
              className="w-80 pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select 
            value={kbSelectedCategory}
            onChange={(e) => setKbSelectedCategory(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {kbCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name} ({cat.count})</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => kbOpenEditor()}
          className="flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Article</span>
        </button>
      </div>
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Knowledge Base Data</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {kbFilteredArticles.map(article => (
            <div key={article.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-medium text-gray-900">{article.title}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      article.status === 'published' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {article.status}
                    </span>
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                      {article.category}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3 line-clamp-2">{article.content}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Updated: {article.lastUpdated}</span>
                    <span>{article.wordCount} words</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => kbOpenEditor(article)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => kbDeleteArticle(article.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  const kbRenderDocuments = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8">
        <div className="text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Documents</h3>
          <p className="text-gray-600 mb-4">Drag and drop files here, or click to browse</p>
          <input
            ref={kbFileInputRef}
            type="file"
            multiple
            onChange={kbHandleFileUpload}
            accept=".pdf,.doc,.docx,.txt"
          />
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Document list rendering can go here */}
      </div>
    </div>
  );
  const kbRenderContent = () => {
    switch (kbTab) {
      case 'articles': return kbRenderArticles();
      case 'documents': return kbRenderDocuments();
      default: return kbRenderArticles();
    }
  };
  const [isApplying, setIsApplying] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Dashboard data
  const messagesData = {
    daily: [
      { name: 'Mon', messages: 245 },
      { name: 'Tue', messages: 312 },
      { name: 'Wed', messages: 189 },
      { name: 'Thu', messages: 456 },
      { name: 'Fri', messages: 398 },
      { name: 'Sat', messages: 178 },
      { name: 'Sun', messages: 234 }
    ],
    weekly: [
      { name: 'Week 1', messages: 1580 },
      { name: 'Week 2', messages: 2145 },
      { name: 'Week 3', messages: 1923 },
      { name: 'Week 4', messages: 2567 }
    ],
    monthly: [
      { name: 'Jan', messages: 8945 },
      { name: 'Feb', messages: 7821 },
      { name: 'Mar', messages: 9234 },
      { name: 'Apr', messages: 8567 },
      { name: 'May', messages: 9876 },
      { name: 'Jun', messages: 8234 }
    ]
  };

  const registrationsData = {
    hourly: [
      { name: '00:00', registrations: 12 },
      { name: '06:00', registrations: 8 },
      { name: '12:00', registrations: 45 },
      { name: '18:00', registrations: 67 },
      { name: '21:00', registrations: 34 }
    ],
    daily: [
      { name: 'Mon', registrations: 89 },
      { name: 'Tue', registrations: 123 },
      { name: 'Wed', registrations: 67 },
      { name: 'Thu', registrations: 145 },
      { name: 'Fri', registrations: 98 },
      { name: 'Sat', registrations: 76 },
      { name: 'Sun', registrations: 54 }
    ],
    weekly: [
      { name: 'Week 1', registrations: 456 },
      { name: 'Week 2', registrations: 612 },
      { name: 'Week 3', registrations: 534 },
      { name: 'Week 4', registrations: 789 }
    ],
    monthly: [
      { name: 'Jan', registrations: 2345 },
      { name: 'Feb', registrations: 1987 },
      { name: 'Mar', registrations: 2567 },
      { name: 'Apr', registrations: 2123 },
      { name: 'May', registrations: 2789 },
      { name: 'Jun', registrations: 2456 }
    ]
  };

  // Removed demographicsData and deviceData

  interface StatCardProps {
    title: string;
    value: string | number;
    change: string;
    changeType: 'up' | 'down';
    icon: ReactNode;
  }

  const StatCard = ({ title, value, change, changeType, icon }: StatCardProps): JSX.Element => (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white">
          {icon}
        </div>
        <div className={`text-sm font-semibold px-3 py-1 rounded-full ${
          changeType === 'up' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
        }`}>
          {changeType === 'up' ? '↗' : '↘'} {change}
        </div>
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-1">{value}</h3>
      <p className="text-slate-600 font-medium">{title}</p>
    </div>
  );

  interface ChartCardProps<T extends string> {
    title: string;
    children: ReactNode;
    period: T;
    setPeriod: Dispatch<SetStateAction<T>>;
    periods: T[];
  }

  const ChartCard = <T extends string>({ title, children, period, setPeriod, periods }: ChartCardProps<T>): JSX.Element => (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <div className="flex gap-2">
          {periods.map((p: T) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                period === p
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Messages"
          value="24,567"
          change="12.5%"
          changeType="up"
          icon={
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd"/>
            </svg>
          }
        />
        <StatCard
          title="New Registrations"
          value="1,234"
          change="8.2%"
          changeType="up"
          icon={
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"/>
            </svg>
          }
        />
        <StatCard
          title="Active Users"
          value="5,678"
          change="3.1%"
          changeType="down"
          icon={
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          }
        />
        <StatCard
          title="Conversion Rate"
          value="68.5%"
          change="15.7%"
          changeType="up"
          icon={
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
          }
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartCard
          title="Messages Overview"
          period={messagesPeriod}
          setPeriod={setMessagesPeriod}
          periods={['daily', 'weekly', 'monthly']}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={messagesData[messagesPeriod as keyof typeof messagesData]}>
              <defs>
                <linearGradient id="messagesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="messages" 
                stroke="#667eea" 
                strokeWidth={3}
                fill="url(#messagesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Registration Trends"
          period={registrationsPeriod}
          setPeriod={setRegistrationsPeriod}
          periods={['hourly', 'daily', 'weekly', 'monthly']}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={registrationsData[registrationsPeriod as keyof typeof registrationsData]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }} 
              />
              <Bar 
                dataKey="registrations" 
                fill="url(#barGradient)"
                radius={[4, 4, 0, 0]}
              />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#764ba2"/>
                  <stop offset="100%" stopColor="#667eea"/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Removed User Demographics and Device Usage components */}
    </div>
  );

  // Chat history/filter logic
  type FilterField = 'fromDate' | 'toDate' | 'sortBy' | 'searchId';

  const handleFilterChange = (field: FilterField, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    setIsApplying(true);
    setTimeout(() => {
      setIsApplying(false);
    }, 1000);
  };

  const handleResetFilters = () => {
    setFilters({
      fromDate: '',
      toDate: '',
      sortBy: 'Newest First',
      searchId: ''
    });
  };

  // Fetch sessions on mount
  useEffect(() => {
    setLoading(true);
    fetch('/api/chat/sessions')
      .then(res => res.json())
      .then(data => {
        setSessions(data.sessions || []);
        setLoading(false);
      });
  }, []);

  // Fetch chat history for a session
  const handleViewSession = (session: Session) => {
    setSelectedSession(session);
    setShowModal(true);
    fetch(`/api/chat/history/${session.sessionId}`)
      .then(res => res.json())
      .then(data => setChatHistory(data.messages || []));
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedSession(null);
    setChatHistory([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div className="w-70 bg-white/10 backdrop-blur-xl border-r border-white/20 relative sticky top-0 h-screen">
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-white/5 pointer-events-none"></div>
          
          <div className="relative z-10 p-8 border-b border-white/10">
            <h1 className="text-white text-2xl font-bold tracking-tight">Entab Dashboard</h1>
          </div>
          
          <nav className="relative z-10 py-6">
            <button
              className={`flex items-center w-full px-6 py-4 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 border-l-3 border-transparent hover:border-white/50 ${activeTab === 'overview' ? 'bg-white/15 border-white font-semibold text-white' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <svg className="w-5 h-5 mr-3 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
              </svg>
              Overview
            </button>
            <button
              className={`flex items-center w-full px-6 py-4 ${activeTab === 'history' ? 'text-white bg-white/15 border-l-3 border-white font-semibold' : 'text-white/80 hover:text-white hover:bg-white/10 border-l-3 border-transparent hover:border-white/50'} transition-all duration-300`}
              onClick={() => setActiveTab('history')}
            >
              <svg className="w-5 h-5 mr-3 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
              </svg>
              Chat History
            </button>
            <button
              className={`flex items-center w-full px-6 py-4 ${activeTab === 'knowledge' ? 'text-white bg-white/15 border-l-3 border-white font-semibold' : 'text-white/80 hover:text-white hover:bg-white/10 border-l-3 border-transparent hover:border-white/50'} transition-all duration-300`}
              onClick={() => setActiveTab('knowledge')}
            >
              <svg className="w-5 h-5 mr-3 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                <path d="M12 4v1m0 0a8 8 0 100 16 8 8 0 000-16zm0 0V2m0 3a3 3 0 013 3v1a3 3 0 01-3 3 3 3 0 01-3-3V7a3 3 0 013-3z" />
              </svg>
              Knowledge Base
            </button>
            <button
              className={`flex items-center w-full px-6 py-4 ${activeTab === 'workflow' ? 'text-white bg-white/15 border-l-3 border-white font-semibold' : 'text-white/80 hover:text-white hover:bg-white/10 border-l-3 border-transparent hover:border-white/50'} transition-all duration-300`}
              onClick={() => setActiveTab('workflow')}
            >
              <svg className="w-5 h-5 mr-3 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3v4.586l-3.293-3.293a1 1 0 00-1.414 1.414L8.586 10 5.293 13.293a1 1 0 001.414 1.414L10 14.414V19a1 1 0 002 0v-4.586l3.293 3.293a1 1 0 001.414-1.414L11.414 10l3.293-3.293a1 1 0 00-1.414-1.414L10 5.586V3a1 1 0 00-2 0z" />
              </svg>
              Workflow Builder
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-slate-50">
          {/* Overview Tab with dashboard components */}
          {activeTab === 'overview' && (
            <div className="p-10">
              <h2 className="text-4xl font-bold text-slate-900 mb-2">Dashboard Overview</h2>
              <p className="text-slate-600 text-lg mb-8">Monitor your platform performance with real-time analytics and insights</p>
              {renderOverview()}
            </div>
          )}
          {/* Chat History Tab with React components */}
          {activeTab === 'history' && (
            <div className="p-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Chat History</h2>
              <p className="text-slate-600 text-lg mb-8">Browse and filter past chat sessions</p>
              <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <input
                      type="date"
                      value={filters.fromDate}
                      onChange={e => handleFilterChange('fromDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input
                      type="date"
                      value={filters.toDate}
                      onChange={e => handleFilterChange('toDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                    <select
                      value={filters.sortBy}
                      onChange={e => handleFilterChange('sortBy', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option>Newest First</option>
                      <option>Oldest First</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search by Session ID</label>
                    <input
                      type="text"
                      value={filters.searchId}
                      onChange={e => handleFilterChange('searchId', e.target.value)}
                      placeholder="Enter session ID..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleApplyFilters}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                    disabled={isApplying}
                  >
                    {isApplying ? 'Applying...' : 'Apply Filters'}
                  </button>
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Chat Sessions</h3>
                  {loading && <span className="text-sm text-gray-500">Loading...</span>}
                </div>
                <div className="divide-y divide-gray-200">
                  {sessions
                    .filter(session =>
                      (!filters.searchId || session.sessionId.includes(filters.searchId)) &&
                      (!filters.fromDate || new Date(session.lastMessageAt) >= new Date(filters.fromDate)) &&
                      (!filters.toDate || new Date(session.lastMessageAt) <= new Date(filters.toDate))
                    )
                    .sort((a, b) => {
                      if (filters.sortBy === 'Newest First') {
                        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
                      } else {
                        return new Date(a.lastMessageAt).getTime() - new Date(b.lastMessageAt).getTime();
                      }
                    })
                    .map(session => (
                      <div key={session.sessionId} className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">Session ID: {session.sessionId}</div>
                          <div className="text-sm text-gray-500">Messages: {session.messageCount}</div>
                          <div className="text-sm text-gray-500">Last Message: {new Date(session.lastMessageAt).toLocaleString()}</div>
                        </div>
                        <button
                          onClick={() => handleViewSession(session)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  {sessions.length === 0 && !loading && (
                    <div className="p-6 text-gray-500">No chat sessions found.</div>
                  )}
                </div>
              </div>
              {/* Modal for chat history */}
              {showModal && selectedSession && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                      <h2 className="text-xl font-semibold text-gray-900">Session: {selectedSession.sessionId}</h2>
                      <button
                        onClick={closeModal}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      {chatHistory.length === 0 ? (
                        <div className="text-gray-500">No messages in this session.</div>
                      ) : (
                        chatHistory.map((msg, idx) => (
                          <MessageBubble
                            key={msg.nodeKey || idx}
                            content={msg.content}
                            isUser={msg.isUser}
                            timestamp={new Date(msg.timestamp)}
                          />
                        ))
                     ) }
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Knowledge Base Tab */}
          {activeTab === 'knowledge' && (
            <div className="min-h-screen bg-gray-50">
              <div className="bg-white border-b border-gray-200">
                <div className="px-8 py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">Chatbot Knowledge Base</h1>
                      <p className="text-gray-600 mt-1">Manage your chatbot's knowledge and training data</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">
                        Import Data
                      </button>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Deploy Changes
                      </button>
                    </div>
                  </div>
                </div>
                <div className="px-8">
                  <nav className="flex space-x-8">
                    {kbTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setKbTab(tab.id as 'articles' | 'documents')}
                        className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                          kbTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-lg">{tab.icon}</span>
                        <span>{tab.name}</span>
                        {tab.count && (
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
              <div className="p-8">
                {kbRenderContent()}
              </div>
              {kbShowEditor && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {kbCurrentArticle ? 'Edit Article' : 'New Article'}
                      </h2>
                      <button
                        onClick={() => setKbShowEditor(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                          <input
                            type="text"
                            value={kbEditorTitle}
                            onChange={(e) => setKbEditorTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter article title..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                          <select
                            value={kbEditorCategory}
                            onChange={(e) => setKbEditorCategory(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="general">General</option>
                            <option value="products">Products</option>
                            <option value="support">Support</option>
                            <option value="policies">Policies</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                        <textarea
                          value={kbEditorContent}
                          onChange={(e) => setKbEditorContent(e.target.value)}
                          rows={12}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter article content..."
                        />
                      </div>
                    </div>
                    <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                      <button
                        onClick={() => setKbShowEditor(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={kbSaveArticle}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Save Article
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Workflow Builder Tab */}
          {activeTab === 'workflow' && (
            <div className="p-10">
              <EntabWorkflowBuilder />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EntabDashboard;