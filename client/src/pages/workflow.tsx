import { useState, useRef, useEffect, MouseEvent } from 'react';

const EntabWorkflowBuilder = () => {

  type NodeType = 'start' | 'category' | 'action' | 'module';
  interface WorkflowNode {
    id: string;
    title: string;
    type: NodeType;
    message: string;
    connections: string[];
    position: { x: number; y: number };
  }

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'visual' | 'tree'>('visual');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Sample workflow data based on the provided structure
  const workflowNodes: Record<string, WorkflowNode> = {
    mainMenu: {
      id: 'mainMenu',
      title: 'Main Menu',
      type: 'start',
      message: 'Why Choose Entab? - 20+ years of expertise, 1,500+ schools served',
      connections: ['schoolERP', 'lms', 'digitalContent', 'allProducts'],
      position: { x: 400, y: 100 }
    },
    schoolERP: {
      id: 'schoolERP',
      title: 'School ERP',
      type: 'category',
      message: 'Enterprise-grade solution for school operations',
      connections: ['schoolERPFeatures', 'schoolERPModules', 'scheduleDemo'],
      position: { x: 200, y: 300 }
    },
    lms: {
      id: 'lms',
      title: 'LMS',
      type: 'category',
      message: 'Learning Management System for digital learning',
      connections: ['lmsModules', 'lmsFeatures', 'scheduleDemo'],
      position: { x: 400, y: 300 }
    },
    digitalContent: {
      id: 'digitalContent',
      title: 'Digital Content',
      type: 'category',
      message: 'Rich multimedia resources for enhanced learning',
      connections: ['dcContentTypes', 'dcFeatures', 'scheduleDemo'],
      position: { x: 600, y: 300 }
    },
    scheduleDemo: {
      id: 'scheduleDemo',
      title: 'Schedule Demo',
      type: 'action',
      message: 'Book your free demo session',
      connections: [],
      position: { x: 400, y: 500 }
    }
  };

  const [nodes, setNodes] = useState<Record<string, WorkflowNode>>(workflowNodes);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const getNodeColor = (type: NodeType) => {
    switch (type) {
      case 'start': return 'from-green-400 to-green-600';
      case 'category': return 'from-blue-400 to-blue-600';
      case 'action': return 'from-purple-400 to-purple-600';
      case 'module': return 'from-indigo-400 to-indigo-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
  };

  const handleNodeDragStart = (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    e.preventDefault();
    const node = nodes[nodeId];
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    setDraggedNode(nodeId);
    setDragOffset({
      x: e.clientX - canvasRect.left - node.position.x * (zoomLevel / 100),
      y: e.clientY - canvasRect.top - node.position.y * (zoomLevel / 100)
    });
  };

  const handleNodeDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggedNode || !canvasRef.current) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = zoomLevel / 100;
    const x = (e.clientX - rect.left - dragOffset.x) / scale;
    const y = (e.clientY - rect.top - dragOffset.y) / scale;
    setNodes(prev => ({
      ...prev,
      [draggedNode]: {
        ...prev[draggedNode],
        position: {
          x: Math.max(0, Math.min(800, x)),
          y: Math.max(0, Math.min(600, y))
        }
      }
    }));
  };

  const handleNodeDragEnd = () => {
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const renderVisualWorkflow = () => (
    <div className="relative w-full h-full bg-slate-50 rounded-xl overflow-hidden">
      <div 
        ref={canvasRef}
        className="relative w-full h-full"
        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: '0 0' }}
        onMouseMove={handleNodeDrag}
        onMouseUp={handleNodeDragEnd}
      >
        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          {Object.entries(nodes).map(([nodeId, node]) =>
            node.connections.map(connectionId => {
              const targetNode = nodes[connectionId];
              if (!targetNode) return null;
              
              return (
                <line
                  key={`${nodeId}-${connectionId}`}
                  x1={node.position.x + 100}
                  y1={node.position.y + 40}
                  x2={targetNode.position.x + 100}
                  y2={targetNode.position.y + 40}
                  stroke="#e2e8f0"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
              );
            })
          )}
        </svg>

        {/* Workflow Nodes */}
        {Object.entries(nodes).map(([nodeId, node]) => (
          <div
            key={nodeId}
            className={`absolute w-48 bg-gradient-to-r ${getNodeColor(node.type)} p-4 rounded-xl shadow-lg cursor-move transition-all duration-300 hover:shadow-xl ${
              selectedNode === nodeId ? 'ring-4 ring-white ring-opacity-50 scale-105' : ''
            }`}
            style={{ 
              left: node.position.x, 
              top: node.position.y,
              zIndex: 2
            }}
            onClick={() => handleNodeClick(nodeId)}
            onMouseDown={(e) => handleNodeDragStart(e, nodeId)}
            draggable={false}
          >
            <div className="text-white">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">{node.title}</h4>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                  <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                  <div className="w-2 h-2 bg-white/20 rounded-full"></div>
                </div>
              </div>
              <p className="text-xs text-white/80 mb-3 line-clamp-2">{node.message}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{node.type}</span>
                <span className="text-xs">{node.connections.length} links</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTreeView = () => (
    <div className="bg-white rounded-xl p-6 h-full overflow-auto">
      <div className="space-y-4">
        {Object.entries(nodes).map(([nodeId, node]) => (
          <div
            key={nodeId}
            className={`p-4 border-2 border-slate-200 rounded-xl hover:border-indigo-300 cursor-pointer transition-all duration-200 ${
              selectedNode === nodeId ? 'border-indigo-500 bg-indigo-50' : ''
            }`}
            onClick={() => handleNodeClick(nodeId)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="font-semibold text-slate-900">{node.title}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    node.type === 'start' ? 'bg-green-100 text-green-700' :
                    node.type === 'category' ? 'bg-blue-100 text-blue-700' :
                    node.type === 'action' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {node.type}
                  </span>
                </div>
                <p className="text-slate-600 text-sm mb-3">{node.message}</p>
                {node.connections.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {node.connections.map(connectionId => (
                      <span
                        key={connectionId}
                        className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md"
                      >
                        → {nodes[connectionId]?.title || connectionId}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600">
      <div className="flex min-h-screen">
        {/* Main Content Only - No Sidebar */}
        <div className="flex-1 bg-slate-50">
          {/* Header */}
          <div className="bg-white p-10 border-b border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-4xl font-bold text-slate-900 mb-2">Workflow Builder</h2>
                <p className="text-slate-600 text-lg">Design and manage chatbot conversation flows with visual workflow editor</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search workflows..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-80 p-4 pl-12 border-2 border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:border-indigo-500 focus:bg-white focus:shadow-lg focus:shadow-indigo-500/10 transition-all duration-300"
                  />
                  <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300">
                  + New Workflow
                </button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="flex bg-slate-100 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('visual')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      viewMode === 'visual' 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Visual Flow
                  </button>
                  <button
                    onClick={() => setViewMode('tree')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      viewMode === 'tree' 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tree View
                  </button>
                </div>

                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <span>Nodes: {Object.keys(nodes).length}</span>
                  <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                  <span>Active: {Object.values(nodes).filter(n => n.connections.length > 0).length}</span>
                </div>
              </div>

              {viewMode === 'visual' && (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <span className="text-sm text-slate-600 min-w-[3rem] text-center">{zoomLevel}%</span>
                    <button
                      onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                  <button
                    onClick={() => setZoomLevel(100)}
                    className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Workflow Area */}
          <div className="flex h-[calc(100vh-200px)]">
            {/* Workflow Canvas */}
            <div className="flex-1 p-6">
              <div className="h-full border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden">
                {viewMode === 'visual' ? renderVisualWorkflow() : renderTreeView()}
              </div>
            </div>

            {/* Properties Panel */}
            <div className="w-80 border-l border-slate-200 bg-white p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  {selectedNode ? `Edit: ${nodes[selectedNode]?.title}` : 'Workflow Properties'}
                </h3>
                
                {selectedNode ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Node Title</label>
                      <input
                        type="text"
                        value={nodes[selectedNode]?.title || ''}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Node Type</label>
                      <select className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="start">Start Node</option>
                        <option value="category">Category</option>
                        <option value="action">Action</option>
                        <option value="module">Module</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                      <textarea
                        rows={4}
                        value={nodes[selectedNode]?.message || ''}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Connections</label>
                      <div className="space-y-2">
                        {nodes[selectedNode]?.connections.map((connectionId, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                            <span className="text-sm text-slate-700">{nodes[connectionId]?.title || connectionId}</span>
                            <button className="text-red-500 hover:text-red-700">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-200">
                      <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors mb-2">
                        Save Changes
                      </button>
                      <button className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎯</div>
                    <h4 className="text-lg font-medium text-slate-900 mb-2">Select a Node</h4>
                    <p className="text-slate-600 text-sm">
                      Click on a workflow node to view and edit its properties
                    </p>
                  </div>
                )}
              </div>

              {/* Node Palette */}
              <div className="border-t border-slate-200 pt-6">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Add New Nodes</h4>
                <div className="space-y-2">
                  {[
                    { type: 'start', label: 'Start Node', color: 'bg-green-100 text-green-700' },
                    { type: 'category', label: 'Category', color: 'bg-blue-100 text-blue-700' },
                    { type: 'action', label: 'Action', color: 'bg-purple-100 text-purple-700' },
                    { type: 'module', label: 'Module', color: 'bg-indigo-100 text-indigo-700' }
                  ].map((nodeType) => (
                    <button
                      key={nodeType.type}
                      className={`w-full p-3 rounded-lg text-sm font-medium transition-colors ${nodeType.color} hover:opacity-80`}
                    >
                      + {nodeType.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntabWorkflowBuilder;
