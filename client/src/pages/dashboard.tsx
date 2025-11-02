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
  const [registrationsPeriod, setRegistrationsPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    sortBy: 'Newest First',
    searchId: ''
  });
  const [pageSize, setPageSize] = useState(15);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'knowledge' | 'workflow'>('history');

  // Dashboard stats state
  const [dashboardStats, setDashboardStats] = useState({
    totalMessages: 0,
    totalMessagesChange: '0%',
    totalMessagesChangeType: 'up' as 'up' | 'down',
    registrations: 0,
    registrationsChange: '0%',
    registrationsChangeType: 'up' as 'up' | 'down',
    activeUsers: 0,
    activeUsersChange: '0%',
    activeUsersChangeType: 'up' as 'up' | 'down',
    conversionRate: '0.0%',
    conversionRateChange: '0%',
    conversionRateChangeType: 'up' as 'up' | 'down',
    totalSessions: 0,
    totalSessionsChange: '0%',
    totalSessionsChangeType: 'up' as 'up' | 'down',
    averageRating: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Chart data state
  const [messagesData, setMessagesData] = useState({
    daily: [],
    weekly: [],
    monthly: []
  });
  const [registrationsData, setRegistrationsData] = useState({
    daily: [],
    weekly: [],
    monthly: []
  });
  const [chartDataLoading, setChartDataLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

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
  const [isPaginating, setIsPaginating] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showModal, setShowModal] = useState(false);

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
        <div className="flex flex-col items-end">
          <div className={`text-sm font-semibold px-3 py-1 rounded-full ${
            changeType === 'up' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
          }`}>
            {changeType === 'up' ? '↗' : '↘'} {change}
          </div>
          <div className="text-xs text-slate-500 mt-1">vs last week</div>
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
          value={statsLoading ? '...' : dashboardStats.totalMessages.toString()}
          change={dashboardStats.totalMessagesChange}
          changeType={dashboardStats.totalMessagesChangeType}
          icon={
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd"/>
            </svg>
          }
        />
        <StatCard
          title="New Registrations"
          value={statsLoading ? '...' : dashboardStats.registrations.toString()}
          change={dashboardStats.registrationsChange}
          changeType={dashboardStats.registrationsChangeType}
          icon={
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"/>
            </svg>
          }
        />
        <StatCard
          title="Total Sessions"
          value={statsLoading ? '...' : dashboardStats.totalSessions.toString()}
          change={dashboardStats.totalSessionsChange}
          changeType={dashboardStats.totalSessionsChangeType}
          icon={
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          }
        />
        <StatCard
          title="Conversion Rate"
          value={statsLoading ? '...' : dashboardStats.conversionRate}
          change={dashboardStats.conversionRateChange || '0%'}
          changeType={dashboardStats.conversionRateChangeType || 'up'}
          icon={
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
          }
        />
        <StatCard
          title="Average Rating"
          value={statsLoading ? '...' : `${dashboardStats.averageRating.toFixed(1)} / 5`}
          change={'0%'}
          changeType={'up'}
          icon={
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.034a1 1 0 00-1.175 0L7.648 16.19c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L4.013 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.036-3.293z"/>
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
          {chartDataLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="flex items-center space-x-2 text-gray-500">
                <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading chart data...</span>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={messagesData[messagesPeriod as keyof typeof messagesData]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                  }} 
                />
                <Line 
                  type="linear" 
                  dataKey="count" 
                  stroke="#667eea" 
                  strokeWidth={3}
                  dot={{ fill: '#667eea', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#667eea', strokeWidth: 2, fill: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Registration Trends"
          period={registrationsPeriod}
          setPeriod={setRegistrationsPeriod}
          periods={['daily', 'weekly', 'monthly']}
        >
          {chartDataLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <div className="flex items-center space-x-2 text-gray-500">
                <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading chart data...</span>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={registrationsData[registrationsPeriod as keyof typeof registrationsData]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" stroke="#64748b" />
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
          )}
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
    setCurrentPage(1); // Reset to first page when applying filters
    fetchSessions(1); // Fetch first page with new filters
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
    setCurrentPage(1); // Reset to first page
    fetchSessions(1); // Fetch first page without filters
  };

  // Function to fetch sessions with filters and pagination
  const fetchSessions = (page: number = 1) => {
    setLoading(true);
    
    // Build query parameters
    const params = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
      sortBy: filters.sortBy,
      ...(filters.fromDate && { fromDate: filters.fromDate }),
      ...(filters.toDate && { toDate: filters.toDate }),
      ...(filters.searchId && { searchId: filters.searchId })
    });

    fetch(`/api/chat/sessions?${params}`)
      .then(res => res.json())
      .then(data => {
        setSessions(data.sessions || []);
        setCurrentPage(data.page || 1);
        setTotalPages(data.totalPages || 1);
        setTotalSessions(data.total || 0);
        setHasNextPage(data.hasNextPage || false);
        setHasPrevPage(data.hasPrevPage || false);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching sessions:', error);
        setLoading(false);
      });
  };

  // Function to fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      setStatsLoading(true);
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setDashboardStats(data);
      } else {
        console.error('Failed to fetch dashboard stats');
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Function to fetch chart data
  const fetchChartData = async () => {
    try {
      setChartDataLoading(true);
      
      // Fetch messages data for different periods
      const messagesResponse = await fetch('/api/chat/usage?type=daily');
      const weeklyResponse = await fetch('/api/chat/usage?type=weekly');
      const monthlyResponse = await fetch('/api/chat/usage?type=monthly');
      
      if (messagesResponse.ok && weeklyResponse.ok && monthlyResponse.ok) {
        const dailyData = await messagesResponse.json();
        const weeklyData = await weeklyResponse.json();
        const monthlyData = await monthlyResponse.json();
        
        setMessagesData({
          daily: dailyData.usage || [],
          weekly: weeklyData.usage || [],
          monthly: monthlyData.usage || []
        });
      }
      
      // Fetch registration data for different periods
      const regDailyResponse = await fetch('/api/dashboard/registrations?type=daily');
      const regWeeklyResponse = await fetch('/api/dashboard/registrations?type=weekly');
      const regMonthlyResponse = await fetch('/api/dashboard/registrations?type=monthly');
      
      if (regDailyResponse.ok && regWeeklyResponse.ok && regMonthlyResponse.ok) {
        const regDailyData = await regDailyResponse.json();
        const regWeeklyData = await regWeeklyResponse.json();
        const regMonthlyData = await regMonthlyResponse.json();
        
        setRegistrationsData({
          daily: regDailyData.registrations || [],
          weekly: regWeeklyData.registrations || [],
          monthly: regMonthlyData.registrations || []
        });
      }
      
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setChartDataLoading(false);
    }
  };

  // Function to handle page changes
  const handlePageChange = (page: number) => {
    if (isPaginating) return; // Prevent multiple rapid clicks
    setIsPaginating(true);
    setCurrentPage(page);
    fetchSessions(page);
    setTimeout(() => setIsPaginating(false), 500); // Debounce pagination
  };

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions(); // Initial fetch without filters
  }, []);

  // Fetch dashboard stats when overview tab is active
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchDashboardStats();
      fetchChartData();
    }
  }, [activeTab]);

  // Refetch sessions when filters change (but not on initial mount)
  useEffect(() => {
    if (currentPage > 1) { // Only refetch if not on first page
      fetchSessions(1); // Reset to first page when filters change
      setCurrentPage(1);
    }
  }, [filters.fromDate, filters.toDate, filters.sortBy, filters.searchId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+R or Cmd+R to refresh current page
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        if (!isPaginating && activeTab === 'history') {
          fetchSessions(currentPage);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, isPaginating, activeTab]);

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
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-4xl font-bold text-slate-900 mb-2">Dashboard Overview</h2>
                  <p className="text-slate-600 text-lg">Monitor your platform performance with real-time analytics and insights</p>
                </div>
                <button
                  onClick={() => {
                    fetchDashboardStats();
                    fetchChartData();
                  }}
                  disabled={statsLoading || chartDataLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {(statsLoading || chartDataLoading) ? (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  <span>{(statsLoading || chartDataLoading) ? 'Refreshing...' : 'Refresh All Data'}</span>
                </button>
              </div>
              {renderOverview()}
            </div>
          )}
          {/* Chat History Tab with React components */}
          {activeTab === 'history' && (
            <div className="p-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Chat History</h2>
              <p className="text-slate-600 text-lg mb-8">Browse and filter past chat sessions</p>
              <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Page Size</label>
                    <select
                      value={pageSize}
                      onChange={e => {
                        const newPageSize = Number(e.target.value);
                        setPageSize(newPageSize);
                        setCurrentPage(1);
                        // Refetch with new page size
                        setTimeout(() => fetchSessions(1), 0);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={15}>15 per page</option>
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
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
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center space-x-2"
                    disabled={isApplying}
                  >
                    {isApplying && (
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    <span>{isApplying ? 'Applying...' : 'Apply Filters'}</span>
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
                  <div className="flex items-center space-x-4">
                    {loading && <span className="text-sm text-gray-500">Loading...</span>}
                    <span className="text-sm text-gray-500">
                      Showing {sessions.length} of {totalSessions} sessions
                    </span>
                  </div>
                </div>
                
                {/* Active Filters Summary */}
                {(filters.fromDate || filters.toDate || filters.searchId) && (
                  <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-blue-800">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd"/>
                        </svg>
                        <span className="font-medium">Active Filters:</span>
                        {filters.fromDate && (
                          <span className="px-2 py-1 bg-blue-100 rounded text-xs">
                            From: {filters.fromDate}
                          </span>
                        )}
                        {filters.toDate && (
                          <span className="px-2 py-1 bg-blue-100 rounded text-xs">
                            To: {filters.toDate}
                          </span>
                        )}
                        {filters.searchId && (
                          <span className="px-2 py-1 bg-blue-100 rounded text-xs">
                            Search: "{filters.searchId}"
                          </span>
                        )}
                        <span className="px-2 py-1 bg-blue-100 rounded text-xs">
                          Sort: {filters.sortBy}
                        </span>
                      </div>
                      <button
                        onClick={handleResetFilters}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Clear All Filters
                      </button>
                    </div>
                  </div>
                )}
                <div className="divide-y divide-gray-200">
                  {isPaginating && (
                    <div className="p-6 text-center">
                      <div className="inline-flex items-center space-x-2 text-gray-500">
                        <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Loading sessions...</span>
                      </div>
                    </div>
                  )}
                  {!isPaginating && sessions.map(session => (
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
                  {sessions.length === 0 && !loading && !isPaginating && (
                    <div className="p-6 text-gray-500">No chat sessions found.</div>
                  )}
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Page {currentPage} of {totalPages} (Total: {totalSessions} sessions)
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Go to:</span>
                        <input
                          type="number"
                          min="1"
                          max={totalPages}
                          value={currentPage}
                          onChange={(e) => {
                            const page = parseInt(e.target.value);
                            if (page >= 1 && page <= totalPages) {
                              handlePageChange(page);
                            }
                          }}
                          disabled={isPaginating}
                          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md text-center disabled:opacity-50"
                        />
                        <span className="text-sm text-gray-500">of {totalPages}</span>
                      </div>
                      <button
                        onClick={() => fetchSessions(currentPage)}
                        disabled={isPaginating}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                        title="Refresh current page"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Refresh</span>
                      </button>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePageChange(1)}
                          disabled={currentPage === 1 || isPaginating}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isPaginating ? '...' : 'First'}
                        </button>
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={!hasPrevPage || isPaginating}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isPaginating ? '...' : 'Previous'}
                        </button>
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={!hasNextPage || isPaginating}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isPaginating ? '...' : 'Next'}
                        </button>
                        <button
                          onClick={() => handlePageChange(totalPages)}
                          disabled={currentPage === totalPages || isPaginating}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isPaginating ? '...' : 'Last'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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