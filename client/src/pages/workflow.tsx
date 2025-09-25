
import { useState, useRef, useEffect, MouseEvent, useCallback } from 'react';
import {
  apiListWorkflows,
  apiGetWorkflow,
  apiCreateWorkflow,
  apiUpdateWorkflow,
  apiDeleteWorkflow,
  apiGetWorkflowTemplates,
  apiValidateWorkflow,
  apiTestWorkflow,
  WorkflowAPIModel,
  WorkflowAPINode
} from '../lib/workflow';

type NodeType = 'start' | 'category' | 'action' | 'module' | 'condition' | 'response';

const EntabWorkflowBuilder = () => {
  // --- STATE MANAGEMENT ---
  // Data state
  const [workflows, setWorkflows] = useState<WorkflowAPIModel[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowAPIModel | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [nodes, setNodes] = useState<Record<string, WorkflowAPINode>>({});
  const [editingNode, setEditingNode] = useState<WorkflowAPINode | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<'templates' | 'workflows' | 'new' | 'test' | 'validation' | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Test and validation results
  const [validationResults, setValidationResults] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>(null);

  // Drag and drop state
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // --- API & DATA FETCHING ---
  const loadWorkflows = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiListWorkflows();
      setWorkflows(response.workflows || []);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const response = await apiGetWorkflowTemplates();
      setTemplates(response.templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }, []);

  useEffect(() => {
    loadWorkflows();
    loadTemplates();
  }, [loadWorkflows, loadTemplates]);

  // --- WORKFLOW ACTIONS ---
  const handleSelectWorkflow = async (workflowId: string) => {
    try {
      setIsLoading(true);
      setShowModal(null);
      const response = await apiGetWorkflow(workflowId);
      setCurrentWorkflow(response.workflow);
      setNodes(response.workflow.nodes || {});
    } catch (error) {
      console.error('Failed to load workflow:', error);
      alert('Error loading workflow.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorkflow = async (name: string, description: string, template?: any) => {
    const newWorkflowData: Omit<WorkflowAPIModel, '_id' | 'createdAt' | 'updatedAt'> = {
      name,
      description,
      version: '1.0.0',
      isActive: false,
      nodes: template ? template.nodes : {
        'start': { id: 'start', title: 'Start', type: 'start', message: 'Welcome!', connections: [], position: { x: 100, y: 100 } }
      },
      startNode: template ? template.startNode : 'start',
      tags: template ? template.tags : [],
    };

    try {
      setIsSaving(true);
      const response = await apiCreateWorkflow(newWorkflowData);
      setWorkflows(prev => [response.workflow, ...prev]);
      handleSelectWorkflow(response.workflow._id!);
      setShowModal(null);
    } catch (error) {
      console.error('Failed to create workflow:', error);
      alert('Error creating workflow.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!currentWorkflow) return;
    try {
      setIsSaving(true);
      const updatedData = { ...currentWorkflow, nodes };
      const response = await apiUpdateWorkflow(currentWorkflow._id!, updatedData);
      setCurrentWorkflow(response.workflow);
      setWorkflows(prev => prev.map(w => w._id === response.workflow._id ? response.workflow : w));
      alert('Workflow saved!');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Error saving workflow.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleValidateWorkflow = async () => {
      if (!currentWorkflow) return;
      const response = await apiValidateWorkflow(currentWorkflow);
      setValidationResults(response);
      setShowModal('validation');
  }
  
  const handleTestWorkflow = async () => {
      if (!currentWorkflow) return;
      const response = await apiTestWorkflow(currentWorkflow._id!, {});
      setTestResults(response);
      setShowModal('test');
  }

  // --- NODE ACTIONS ---
  const handleAddNode = (type: NodeType) => {
    if (!currentWorkflow) return;
    const newNodeId = `node_${Date.now()}`;
    const newNode: WorkflowAPINode = {
      id: newNodeId,
      title: `New ${type}`,
      type: type,
      message: '',
      connections: [],
      position: { x: 200, y: 200 },
    };
    setNodes(prev => ({ ...prev, [newNodeId]: newNode }));
  };

  const handleUpdateNode = (nodeId: string, updatedProps: Partial<WorkflowAPINode>) => {
    setNodes(prev => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], ...updatedProps }
    }));
  };
  
  const handleDeleteNode = (nodeId: string) => {
      if (window.confirm("Are you sure?")) {
          const newNodes = { ...nodes };
          delete newNodes[nodeId];
          
          // Remove connections pointing to the deleted node
          Object.keys(newNodes).forEach(key => {
              newNodes[key].connections = newNodes[key].connections.filter(c => c !== nodeId);
          });
          
          setNodes(newNodes);
          if(selectedNodeId === nodeId) setSelectedNodeId(null);
      }
  }
  
  // --- DRAG AND DROP HANDLERS ---
  const onNodeDragStart = (e: MouseEvent<HTMLDivElement>, nodeId: string) => {
    e.preventDefault();
    const node = nodes[nodeId];
    if (!canvasRef.current || !node) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const scale = zoomLevel / 100;
    
    setDraggedNode(nodeId);
    setDragOffset({
      x: e.clientX - canvasRect.left - node.position.x * scale,
      y: e.clientY - canvasRect.top - node.position.y * scale
    });
  };

  const onNodeDrag = (e: MouseEvent<HTMLDivElement>) => {
    if (!draggedNode || !canvasRef.current) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = zoomLevel / 100;
    const x = (e.clientX - rect.left - dragOffset.x) / scale;
    const y = (e.clientY - rect.top - dragOffset.y) / scale;
    
    handleUpdateNode(draggedNode, { position: { x, y } });
  };

  const onNodeDragEnd = () => {
    setDraggedNode(null);
  };

  // --- RENDER METHODS ---
  const getNodeColor = (type: NodeType) => {
    const colors = {
      start: 'from-green-500 to-green-700',
      category: 'from-blue-500 to-blue-700',
      action: 'from-purple-500 to-purple-700',
      condition: 'from-yellow-500 to-yellow-700',
      response: 'from-pink-500 to-pink-700',
      module: 'from-indigo-500 to-indigo-700',
    };
    return colors[type] || 'from-gray-500 to-gray-700';
  };

  const renderNode = (node: WorkflowAPINode) => (
    <div
      key={node.id}
      className={`absolute w-48 bg-gradient-to-br p-3 rounded-lg shadow-lg cursor-pointer text-white transition-transform duration-200 ${getNodeColor(node.type)} ${selectedNodeId === node.id ? 'ring-4 ring-white/50 scale-105' : ''}`}
      style={{ left: node.position.x, top: node.position.y, zIndex: 2 }}
      onMouseDown={(e) => onNodeDragStart(e, node.id)}
      onClick={() => setSelectedNodeId(node.id)}
    >
      <h4 className="font-bold text-sm truncate">{node.title}</h4>
      <p className="text-xs text-white/80 line-clamp-2">{node.message || 'No message'}</p>
    </div>
  );

  return (
    <div className="w-full h-full bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white p-4 border-b flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Workflow Builder</h1>
          <p className="text-sm text-slate-500">{currentWorkflow ? `Editing: ${currentWorkflow.name}` : "No workflow selected"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowModal('templates')} className="btn-secondary">Load Template</button>
          <button onClick={() => setShowModal('workflows')} className="btn-secondary">Load Workflow</button>
          <button onClick={() => setShowModal('new')} className="btn-primary">+ New Workflow</button>
          {currentWorkflow && (
            <button onClick={handleSaveChanges} disabled={isSaving} className="btn-success">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel (Node Palette) */}
        <aside className="w-48 bg-white p-4 border-r overflow-y-auto">
          <h3 className="font-semibold mb-4">Add Nodes</h3>
          <div className="grid grid-cols-2 gap-2">
            {(['start', 'category', 'action', 'condition', 'response', 'module'] as NodeType[]).map(type => (
              <button key={type} onClick={() => handleAddNode(type)} disabled={!currentWorkflow} className="p-2 rounded-lg bg-slate-100 hover:bg-indigo-100 disabled:opacity-50 text-center">
                  <span className="text-xs capitalize">{type}</span>
              </button>
            ))}
          </div>
           {currentWorkflow && <div className="mt-4 border-t pt-4">
               <button onClick={handleValidateWorkflow} className="btn-secondary w-full mb-2">Validate</button>
               <button onClick={handleTestWorkflow} className="btn-secondary w-full">Test</button>
           </div>}
        </aside>

        {/* Center Canvas */}
        <main className="flex-1 bg-slate-200 relative" onMouseMove={onNodeDrag} onMouseUp={onNodeDragEnd}>
          {isLoading && <div className="loading-overlay">Loading...</div>}
          {!currentWorkflow && !isLoading && (
            <div className="flex items-center justify-center h-full text-slate-500">Select or create a workflow to begin.</div>
          )}
          <div ref={canvasRef} className="w-full h-full" style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                {Object.values(nodes).flatMap(node =>
                    node.connections.map(connId => {
                        const target = nodes[connId];
                        if(!target) return null;
                        return <line key={`${node.id}-${connId}`} x1={node.position.x + 96} y1={node.position.y + 30} x2={target.position.x + 96} y2={target.position.y + 30} stroke="#94a3b8" strokeWidth="2" />
                    })
                )}
            </svg>
            {Object.values(nodes).map(renderNode)}
          </div>
        </main>

        {/* Right Panel (Inspector) */}
        <aside className="w-80 bg-white p-4 border-l overflow-y-auto">
          <h3 className="font-semibold mb-4">Inspector</h3>
          {selectedNodeId && nodes[selectedNodeId] ? (
            <div className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input type="text" value={nodes[selectedNodeId].title} onChange={(e) => handleUpdateNode(selectedNodeId, { title: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">Type</label>
                <select value={nodes[selectedNodeId].type} onChange={(e) => handleUpdateNode(selectedNodeId, { type: e.target.value as NodeType })} className="input">
                    {(['start', 'category', 'action', 'condition', 'response', 'module'] as NodeType[]).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Message</label>
                <textarea value={nodes[selectedNodeId].message} onChange={(e) => handleUpdateNode(selectedNodeId, { message: e.target.value })} className="input" rows={4}></textarea>
              </div>
              <div>
                <label className="label">Connections (IDs)</label>
                <input type="text" value={nodes[selectedNodeId].connections.join(',')} onChange={(e) => handleUpdateNode(selectedNodeId, { connections: e.target.value.split(',').map(s => s.trim()) })} className="input" />
              </div>
              <button onClick={() => handleDeleteNode(selectedNodeId)} className="btn-danger w-full">Delete Node</button>
            </div>
          ) : (
            <div className="text-slate-500 text-sm">Select a node to inspect its properties.</div>
          )}
        </aside>
      </div>

      {/* Modals */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <button onClick={() => setShowModal(null)} className="modal-close-btn">&times;</button>
            {showModal === 'workflows' && (
              <div>
                <h2 className="modal-title">Load Existing Workflow</h2>
                <ul className="space-y-2">
                  {workflows.map(wf => <li key={wf._id} onClick={() => handleSelectWorkflow(wf._id!)} className="modal-list-item">{wf.name}</li>)}
                </ul>
              </div>
            )}
             {showModal === 'templates' && (
              <div>
                <h2 className="modal-title">Load from Template</h2>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target as HTMLFormElement);
                    const template = templates.find(t => t.name === formData.get('template'));
                    handleCreateWorkflow(formData.get('name') as string, formData.get('description') as string, template);
                }}>
                    <input name="name" placeholder="New Workflow Name" required className="input mb-2"/>
                    <textarea name="description" placeholder="Description" className="input mb-2"/>
                    <select name="template" className="input mb-4">
                        {templates.map(t => <option key={t.name}>{t.name}</option>)}
                    </select>
                    <button type="submit" className="btn-primary w-full">Create from Template</button>
                </form>
              </div>
            )}
             {showModal === 'new' && (
              <div>
                <h2 className="modal-title">Create New Workflow</h2>
                <form onSubmit={(e) => { e.preventDefault(); handleCreateWorkflow(e.currentTarget.workflowName.value, e.currentTarget.description.value); }}>
                    <input name="workflowName" placeholder="Workflow Name" required className="input mb-2"/>
                    <textarea name="description" placeholder="Description" className="input mb-4"/>
                    <button type="submit" className="btn-primary w-full">Create Blank Workflow</button>
                </form>
              </div>
            )}
            {showModal === 'validation' && validationResults && (
                <div>
                    <h2 className="modal-title">Validation Results</h2>
                    <p className={validationResults.isValid ? 'text-green-600' : 'text-red-600'}>{validationResults.isValid ? 'Validation Passed!' : 'Validation Failed'}</p>
                    {validationResults.errors.length > 0 && <div><h3>Errors:</h3><ul className="list-disc list-inside text-red-500">{validationResults.errors.map((e:string, i:number) => <li key={i}>{e}</li>)}</ul></div>}
                    {validationResults.warnings.length > 0 && <div><h3>Warnings:</h3><ul className="list-disc list-inside text-yellow-500">{validationResults.warnings.map((w:string, i:number) => <li key={i}>{w}</li>)}</ul></div>}
                </div>
            )}
            {showModal === 'test' && testResults && (
                 <div>
                    <h2 className="modal-title">Test Run Simulation</h2>
                    {testResults.success ? (
                        <div className="font-mono text-sm space-y-2">
                            {testResults.steps.map((step: any, i:number) => <div key={i}>Step {i+1}: Node "{step.nodeTitle}" ({step.nodeId})</div>)}
                        </div>
                    ) : <p className="text-red-500">Error: {testResults.error}</p>}
                </div>
            )}
          </div>
        </div>
      )}
      
    {/* Basic Global CSS for demo */}
    <style>{`
        .btn-primary { padding: 8px 16px; background-color: #4f46e5; color: white; border-radius: 8px; transition: background-color 0.2s; }
        .btn-primary:hover { background-color: #4338ca; }
        .btn-secondary { padding: 8px 16px; background-color: #e2e8f0; color: #1e293b; border-radius: 8px; transition: background-color 0.2s; }
        .btn-secondary:hover { background-color: #cbd5e1; }
        .btn-success { padding: 8px 16px; background-color: #16a34a; color: white; border-radius: 8px; transition: background-color 0.2s; }
        .btn-success:hover { background-color: #15803d; }
        .btn-danger { padding: 8px 16px; background-color: #dc2626; color: white; border-radius: 8px; transition: background-color 0.2s; }
        .btn-danger:hover { background-color: #b91c1c; }
        .input { width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px; }
        .label { display: block; font-weight: 500; font-size: 0.875rem; margin-bottom: 4px; color: #475569; }
        .modal-backdrop { position: fixed; inset: 0; background-color: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50; }
        .modal-content { background-color: white; padding: 24px; border-radius: 12px; width: 100%; max-width: 500px; position: relative; }
        .modal-close-btn { position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 1.5rem; cursor: pointer; }
        .modal-title { font-size: 1.25rem; font-weight: bold; margin-bottom: 16px; }
        .modal-list-item { padding: 12px; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; }
        .modal-list-item:hover { background-color: #f1f5f9; }
        .loading-overlay { position: absolute; inset: 0; background-color: rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; z-index: 10; }
    `}</style>
    </div>
  );
};

export default EntabWorkflowBuilder;


