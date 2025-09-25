import { ObjectId } from 'mongodb';
import databaseService from './database';

export interface WorkflowNode {
  id: string;
  title: string;
  type: 'start' | 'category' | 'action' | 'module' | 'condition' | 'response';
  message: string;
  connections: string[];
  position: { x: number; y: number };
  conditions?: {
    field: string;
    operator: 'equals' | 'contains' | 'greater' | 'less';
    value: string;
  }[];
  metadata?: {
    collectContact?: boolean;
    image?: string;
    variables?: Record<string, any>;
  };
}

export interface Workflow {
  _id?: ObjectId;
  id?: string;
  name: string;
  description: string;
  version: string;
  isActive: boolean;
  nodes: Record<string, WorkflowNode>;
  startNode: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  tags: string[];
  metadata?: {
    category: string;
    language: string;
    industry: string;
  };
}

export interface WorkflowTemplate {
  _id?: ObjectId;
  name: string;
  description: string;
  category: string;
  nodes: Record<string, WorkflowNode>;
  startNode: string;
  previewImage?: string;
  tags: string[];
}

// Workflow CRUD operations
export async function createWorkflow(workflow: Omit<Workflow, '_id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
  const col = await databaseService.getWorkflowCollection();
  const now = new Date();
  
  const newWorkflow: Workflow = {
    ...workflow,
    createdAt: now,
    updatedAt: now,
    version: workflow.version || '1.0.0'
  };

  const result = await col.insertOne(newWorkflow);
  return { ...newWorkflow, _id: result.insertedId };
}

export async function getWorkflowById(id: string): Promise<Workflow | null> {
  const col = await databaseService.getWorkflowCollection();
  const workflow = await col.findOne({ _id: new ObjectId(id) });
  return workflow as Workflow | null;
}

export async function getWorkflowByName(name: string): Promise<Workflow | null> {
  const col = await databaseService.getWorkflowCollection();
  const workflow = await col.findOne({ name });
  return workflow as Workflow | null;
}

export async function getAllWorkflows(options?: {
  isActive?: boolean;
  tags?: string[];
  category?: string;
}): Promise<Workflow[]> {
  const col = await databaseService.getWorkflowCollection();
  const query: any = {};
  
  if (options?.isActive !== undefined) {
    query.isActive = options.isActive;
  }
  
  if (options?.tags && options.tags.length > 0) {
    query.tags = { $in: options.tags };
  }
  
  if (options?.category) {
    query['metadata.category'] = options.category;
  }

  const workflows = await col.find(query).sort({ updatedAt: -1 }).toArray();
  return workflows as Workflow[];
}

export async function updateWorkflow(id: string, updates: Partial<Workflow>): Promise<boolean> {
  const col = await databaseService.getWorkflowCollection();
  const result = await col.updateOne(
    { _id: new ObjectId(id) },
    { 
      $set: { 
        ...updates, 
        updatedAt: new Date() 
      } 
    }
  );
  return result.matchedCount > 0;
}

export async function deleteWorkflow(id: string): Promise<boolean> {
  const col = await databaseService.getWorkflowCollection();
  const result = await col.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

export async function duplicateWorkflow(id: string, newName: string): Promise<Workflow | null> {
  const originalWorkflow = await getWorkflowById(id);
  if (!originalWorkflow) return null;

  const { _id, createdAt, updatedAt, ...workflowData } = originalWorkflow;
  const duplicatedWorkflow = await createWorkflow({
    ...workflowData,
    name: newName,
    isActive: false // Duplicated workflows start as inactive
  });

  return duplicatedWorkflow;
}

// Template operations
export async function getWorkflowTemplates(): Promise<WorkflowTemplate[]> {
  const templates: WorkflowTemplate[] = [
    {
      name: "School ERP Demo Flow",
      description: "Standard workflow for School ERP product demonstration",
      category: "Education",
      startNode: "mainMenu",
      tags: ["erp", "school", "demo"],
      nodes: {
        mainMenu: {
          id: 'mainMenu',
          title: 'Main Menu',
          type: 'start',
          message: 'Welcome to our School ERP! How can I help you today?',
          connections: ['features', 'demo', 'pricing'],
          position: { x: 400, y: 100 }
        },
        features: {
          id: 'features',
          title: 'Features',
          type: 'category',
          message: 'Here are our key features...',
          connections: ['demo'],
          position: { x: 200, y: 300 }
        },
        demo: {
          id: 'demo',
          title: 'Schedule Demo',
          type: 'action',
          message: 'Let\'s schedule your demo!',
          connections: [],
          position: { x: 400, y: 500 },
          metadata: { collectContact: true }
        },
        pricing: {
          id: 'pricing',
          title: 'Pricing',
          type: 'category',
          message: 'Here\'s our pricing information...',
          connections: ['demo'],
          position: { x: 600, y: 300 }
        }
      }
    },
    {
      name: "Support Ticket Flow",
      description: "Customer support ticket routing workflow",
      category: "Support",
      startNode: "welcome",
      tags: ["support", "tickets", "routing"],
      nodes: {
        welcome: {
          id: 'welcome',
          title: 'Welcome',
          type: 'start',
          message: 'How can I help you with your support request?',
          connections: ['technical', 'billing', 'general'],
          position: { x: 400, y: 100 }
        },
        technical: {
          id: 'technical',
          title: 'Technical Issue',
          type: 'category',
          message: 'Let me connect you with technical support...',
          connections: ['escalate'],
          position: { x: 200, y: 300 }
        },
        billing: {
          id: 'billing',
          title: 'Billing Question',
          type: 'category',
          message: 'Let me help with your billing inquiry...',
          connections: ['collect_info'],
          position: { x: 400, y: 300 }
        },
        general: {
          id: 'general',
          title: 'General Question',
          type: 'category',
          message: 'I\'d be happy to help with your question...',
          connections: ['collect_info'],
          position: { x: 600, y: 300 }
        },
        escalate: {
          id: 'escalate',
          title: 'Escalate',
          type: 'action',
          message: 'Creating ticket for technical team...',
          connections: [],
          position: { x: 200, y: 500 }
        },
        collect_info: {
          id: 'collect_info',
          title: 'Collect Information',
          type: 'action',
          message: 'Please provide more details...',
          connections: [],
          position: { x: 500, y: 500 }
        }
      }
    },
    {
      name: "Lead Qualification Flow",
      description: "Qualify and route sales leads automatically",
      category: "Sales",
      startNode: "intro",
      tags: ["sales", "leads", "qualification"],
      nodes: {
        intro: {
          id: 'intro',
          title: 'Introduction',
          type: 'start',
          message: 'Thanks for your interest! Let me learn more about your needs.',
          connections: ['company_size'],
          position: { x: 400, y: 100 }
        },
        company_size: {
          id: 'company_size',
          title: 'Company Size',
          type: 'condition',
          message: 'How many students does your school have?',
          connections: ['small_school', 'large_school'],
          position: { x: 400, y: 250 },
          conditions: [
            { field: 'students', operator: 'less', value: '500' }
          ]
        },
        small_school: {
          id: 'small_school',
          title: 'Small School',
          type: 'category',
          message: 'Perfect! Our basic package would be ideal for you.',
          connections: ['schedule_demo'],
          position: { x: 200, y: 400 }
        },
        large_school: {
          id: 'large_school',
          title: 'Large School',
          type: 'category',
          message: 'Great! You\'ll need our enterprise solution.',
          connections: ['schedule_demo'],
          position: { x: 600, y: 400 }
        },
        schedule_demo: {
          id: 'schedule_demo',
          title: 'Schedule Demo',
          type: 'action',
          message: 'Let\'s schedule a personalized demo for you!',
          connections: [],
          position: { x: 400, y: 550 },
          metadata: { collectContact: true }
        }
      }
    }
  ];

  return templates;
}

// Workflow validation and testing
export async function validateWorkflow(workflow: Workflow): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if start node exists
  if (!workflow.nodes[workflow.startNode]) {
    errors.push(`Start node "${workflow.startNode}" not found`);
  }
  
  // Check for orphaned nodes
  const reachableNodes = new Set<string>();
  const visitNode = (nodeId: string) => {
    if (reachableNodes.has(nodeId)) return;
    reachableNodes.add(nodeId);
    
    const node = workflow.nodes[nodeId];
    if (node) {
      node.connections.forEach(visitNode);
    }
  };
  
  visitNode(workflow.startNode);
  
  // Find unreachable nodes
  Object.keys(workflow.nodes).forEach(nodeId => {
    if (!reachableNodes.has(nodeId) && nodeId !== workflow.startNode) {
      warnings.push(`Node "${nodeId}" is unreachable`);
    }
  });
  
  // Check for invalid connections
  Object.entries(workflow.nodes).forEach(([nodeId, node]) => {
    node.connections.forEach(connectionId => {
      if (!workflow.nodes[connectionId]) {
        errors.push(`Node "${nodeId}" has invalid connection to "${connectionId}"`);
      }
    });
  });
  
  // Check for cycles (basic detection)
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  const hasCycle = (nodeId: string): boolean => {
    if (recursionStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const node = workflow.nodes[nodeId];
    if (node) {
      for (const connectionId of node.connections) {
        if (hasCycle(connectionId)) return true;
      }
    }
    
    recursionStack.delete(nodeId);
    return false;
  };
  
  if (hasCycle(workflow.startNode)) {
    warnings.push('Workflow contains cycles which may cause infinite loops');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export async function testWorkflow(workflowId: string, testInput: {
  startNode?: string;
  userInput?: string;
  variables?: Record<string, any>;
}): Promise<{
  success: boolean;
  steps: Array<{
    nodeId: string;
    nodeTitle: string;
    message: string;
    nextOptions: string[];
  }>;
  error?: string;
}> {
  const workflow = await getWorkflowById(workflowId);
  if (!workflow) {
    return { success: false, steps: [], error: 'Workflow not found' };
  }
  
  const validation = await validateWorkflow(workflow);
  if (!validation.isValid) {
    return { 
      success: false, 
      steps: [], 
      error: `Workflow validation failed: ${validation.errors.join(', ')}` 
    };
  }
  
  const steps: Array<{
    nodeId: string;
    nodeTitle: string;
    message: string;
    nextOptions: string[];
  }> = [];
  
  let currentNodeId = testInput.startNode || workflow.startNode;
  const visited = new Set<string>();
  const maxSteps = 50; // Prevent infinite loops
  
  while (currentNodeId && steps.length < maxSteps && !visited.has(currentNodeId)) {
    visited.add(currentNodeId);
    const node = workflow.nodes[currentNodeId];
    
    if (!node) break;
    
    steps.push({
      nodeId: currentNodeId,
      nodeTitle: node.title,
      message: node.message,
      nextOptions: node.connections.map(id => workflow.nodes[id]?.title || id)
    });
    
    // For testing, just follow the first connection if available
    currentNodeId = node.connections[0] || '';
  }
  
  return { success: true, steps };
}

// Export current workflow for the chatbot to use
export async function getActiveWorkflow(): Promise<Workflow | null> {
  const activeWorkflows = await getAllWorkflows({ isActive: true });
  return activeWorkflows[0] || null;
}
