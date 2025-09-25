// Chatbot workflow definition for menu-driven navigation

export type WorkflowOption = {
  label: string;
  next?: string;
  message?: string;
  options?: WorkflowOption[];
};

// API client for workflows
export type WorkflowAPINode = {
  id: string;
  title: string;
  type: 'start' | 'category' | 'action' | 'module' | 'condition' | 'response';
  message: string;
  connections: string[];
  position: { x: number; y: number };
  conditions?: Array<{ field: string; operator: 'equals' | 'contains' | 'greater' | 'less'; value: string }>;
  metadata?: { collectContact?: boolean; image?: string; variables?: Record<string, any> };
};

export type WorkflowAPIModel = {
  _id?: string;
  name: string;
  description: string;
  version: string;
  isActive: boolean;
  nodes: Record<string, WorkflowAPINode>;
  startNode: string;
  createdAt?: string;
  updatedAt?: string;
  tags: string[];
  metadata?: { category: string; language: string; industry: string };
};

export async function apiListWorkflows(params?: { active?: boolean; tags?: string[]; category?: string }) {
  const query = new URLSearchParams();
  if (typeof params?.active === 'boolean') query.set('active', String(params.active));
  if (params?.tags?.length) query.set('tags', params.tags.join(','));
  if (params?.category) query.set('category', params.category);
  const res = await fetch(`/api/workflows${query.toString() ? `?${query.toString()}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch workflows');
  return res.json();
}

export async function apiGetWorkflow(id: string) {
  const res = await fetch(`/api/workflows/${id}`);
  if (!res.ok) throw new Error('Failed to fetch workflow');
  return res.json();
}

export async function apiCreateWorkflow(data: Omit<WorkflowAPIModel, '_id' | 'createdAt' | 'updatedAt'>) {
  const res = await fetch(`/api/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create workflow');
  return res.json();
}

export async function apiUpdateWorkflow(id: string, updates: Partial<WorkflowAPIModel>) {
  const res = await fetch(`/api/workflows/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update workflow');
  return res.json();
}

export async function apiDeleteWorkflow(id: string) {
  const res = await fetch(`/api/workflows/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete workflow');
  return res.json();
}

export async function apiDuplicateWorkflow(id: string, name: string) {
  const res = await fetch(`/api/workflows/${id}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to duplicate workflow');
  return res.json();
}

export async function apiGetWorkflowTemplates() {
  const res = await fetch(`/api/workflow-templates`);
  if (!res.ok) throw new Error('Failed to fetch workflow templates');
  return res.json();
}

export async function apiValidateWorkflow(data: WorkflowAPIModel) {
  const res = await fetch(`/api/workflows/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to validate workflow');
  return res.json();
}

export async function apiTestWorkflow(id: string, testInput: { startNode?: string; userInput?: string; variables?: Record<string, any> }) {
  const res = await fetch(`/api/workflows/${id}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testInput),
  });
  if (!res.ok) throw new Error('Failed to test workflow');
  return res.json();
}

export type WorkflowNode = {
  message?: string;
  options?: WorkflowOption[];
  collectContact?: boolean;
  image?: string;
};

export const workflow: Record<string, WorkflowNode> = {
  mainMenu: {
    message: `**Why Choose Entab?**\n\n- 25+ years of expertise, 1,500+ schools served\n- Powerful, integrated ERP and mobile solutions\n- Real-time analytics, automation, and compliance\n\nHow can I help your school grow today? (Ask about features, book a demo, or request a call!)`,
    options: [
      { label: 'School ERP ', next: 'schoolERP' },
      { label: 'LMS', next: 'lms' },
      { label: 'Digital Content Solutions', next: 'digitalContent' },
      { label: 'I want to explore all services', next: 'allProducts' },
    ],
  },
  schoolERP: {
    message: `Entab's advanced technology-enabled School ERP is an enterprise-grade solution designed to streamline and automate school operations. Our modular, scalable, and cloud-based ERP includes:\n• Centralized Data Management – Secure and accessible anytime, anywhere.\n• Intelligent Automation – Automates over 95% of school administrative tasks.\n• Customizable Workflows – Tailored for different school structures and needs.\n• Seamless Integrations – WhatsApp, Email, Payment Gateways, and more.\nWould you like to:`,
    options: [
      { label: 'Explore key ERP features', next: 'schoolERPFeatures' },
      { label: 'Learn about specific modules', next: 'schoolERPModules' },
      { label: 'Register for the Demo', next: 'scheduleDemo' },
    ],
  },
  schoolERPFeatures: {
    message: `Key features of School ERP include:\n- Seamless parent-teacher communication\n- Auto-generated academic progress reports\n- Health record management & emergency contacts`,
    options: [
      { label: 'Learn about specific modules', next: 'schoolERPModules' },
      { label: 'Register for the Demo', next: 'scheduleDemo' },
    ],
  },
  schoolERPModules: {
    message: `Entab's ERP offers 28 specialized modules to ensure complete automation of school management. Please select the module you'd like to explore:`,
    options: [
      { label: 'Core Modules', next: 'erpCoreModules' },
      { label: 'Advanced Modules', next: 'erpAdvancedModules' },
      { label: 'Operational & Financial Modules', next: 'erpOperationalModules' },
      { label: 'Back to ERP menu', next: 'schoolERP' },
    ],
  },
  erpCoreModules: {
    message: 'Core Modules:',
    options: [
      { label: 'Exam and Assessment', next: 'modExamAssessment' },
      { label: 'Student Information', next: 'modStudentInformation' },
      { label: 'Student Registration', next: 'modStudentRegistration' },
      { label: 'Fee and Billing', next: 'modFeeBilling' },
      { label: 'Book Store', next: 'modBookStore' },
      { label: 'Enquiry', next: 'modEnquiry' },
      { label: 'Staff Payroll', next: 'modStaffPayroll' },
      { label: 'Student Attendance', next: 'modStudentAttendance' },
      { label: 'Transport Information', next: 'modTransportInformation' },
      { label: 'Library Management', next: 'modLibraryManagement' },
      { label: 'Management Dashboard', next: 'modManagementDashboard' },
      { label: 'Parent Portal', next: 'modParentPortal' },
      { label: 'Back to modules', next: 'schoolERPModules' },
    ],
  },
  erpAdvancedModules: {
    message: 'Advanced Modules:',
    options: [
      { label: 'Task Management', next: 'modTaskManagement' },
      { label: 'Student Login', next: 'modStudentLogin' },
      { label: 'Staff Portal', next: 'modStaffPortal' },
      { label: 'Healthcare', next: 'modHealthcare' },
      { label: 'Lesson Plan', next: 'modLessonPlan' },
      { label: 'Staff Information', next: 'modStaffInformation' },
      { label: 'SMS Communication', next: 'modSMSCommunication' },
      { label: 'Front Office', next: 'modFrontOffice' },
      { label: 'Staff Attendance', next: 'modStaffAttendance' },
      { label: 'School Online', next: 'modSchoolOnline' },
      { label: 'Online Assessment', next: 'modOnlineAssessment' },
      { label: 'Back to modules', next: 'schoolERPModules' },
    ],
  },
  erpOperationalModules: {
    message: 'Operational & Financial Modules:',
    options: [
      { label: 'Transport Information', next: 'modTransportInformation' },
      { label: 'Inventory Management', next: 'modInventoryManagement' },
      { label: 'Timetable Management', next: 'modTimetableManagement' },
      { label: 'Fleet Management', next: 'modFleetManagement' },
      { label: 'Financial Accounting', next: 'modFinancialAccounting' },
      { label: 'Hostel Management', next: 'modHostelManagement' },
      { label: 'WhatsApp Integration', next: 'modWhatsAppIntegration' },
      { label: 'Email Integration', next: 'modEmailIntegration' },
      { label: 'Cafeteria Management', next: 'modCafeteriaManagement' },
      { label: 'Back to modules', next: 'schoolERPModules' },
    ],
  },
  // Module breakdowns (examples, add all as needed)
  modExamAssessment: {
    message: `**Exam & Assessment**\n\n• AI-driven exam scheduling, grading, and report card generation\n• Error-free evaluation and seamless data integration\n• Real-time analytics for performance insights`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modStaffPayroll: {
    message: `**Staff Payroll**\n\n• Automated salary processing\n• Tax compliance\n• Biometric sync\n• Payslip generation`,
    image: '/static/PayrollModule.jpg',
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modStudentRegistration: {
    message: `**Student Registration**\n\n• Digital-first, automated, and integrated registration\n• Seamless experience for parents and administrators\n• Reduces manual errors\n• Ensures accurate records`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modStudentInformation: {
    message: `**Student Information**\n\n• Automates student record management for accuracy and security\n• Real-time accessibility and data-driven decisions\n• Centralized, secure, and always up-to-date`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modStudentAttendance: {
    message: `**Student Attendance**\n\n• RFID/biometric tracking\n• Automated reports\n• Custom policies\n• Live analytics`,
    image: '/static/AttendaceModule.jpg',
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modTransportInformation: {
    message: `**Transport Information (GPS Integration)**\n\n• Real-time GPS tracking for student safety and operational efficiency\n• Route optimization, live notifications, and compliance reporting\n• Full visibility and control for administrators and peace of mind for parents`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modFeeBilling: {
    message: `**Fee and Billing**\n\n• Automated, secure fee management system\n• Real-time tracking\n• Customizable structures\n• Digital payments\n• Ensures 100% collection\n• Eliminates errors\n• Provides financial transparency`,
    image: '/static/FeeAndBillingModule.jpg',
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modLibraryManagement: {
    message: `**Library Management**\n\n• Barcode/RFID book issuance\n• Digital cataloging\n• Overdue alerts\n• E-learning integration`,
    image: '/static/LibraryModule.jpg',
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modManagementDashboard: {
    message: `**Management Dashboard**\n\n• Real-time school performance tracking\n• Custom KPIs\n• Automated reports`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modParentPortal: {
    message: `**Parent Portal**\n\n• 24/7 access to academic records\n• Instant notifications\n• Online homework submission`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modStudentLogin: {
    message: `**Student Login**\n\n• Secure access to academic records\n• SSO integration\n• Personalized dashboard`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modStaffPortal: {
    message: `**Staff Portal**\n\n• Role-based access\n• Lesson planning\n• Attendance\n• Performance analytics`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modHealthcare: {
    message: `**Healthcare**\n\n• Medical record management\n• Emergency response\n• Health check-up tracking`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modLessonPlan: {
    message: `**Lesson Plan**\n\n• Structured planning templates\n• Interactive content\n• Performance insights`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modStaffInformation: {
    message: `**Staff Information**\n\n• Centralized staff credentials\n• Training tracking\n• Payroll integration`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modSMSCommunication: {
    message: `**SMS Communication**\n\n• Instant alerts\n• Custom templates\n• Multi-language support`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modFrontOffice: {
    message: `**Front Office**\n\n• Visitor management\n• Appointment scheduling\n• Inquiry tracking`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modStaffAttendance: {
    message: `**Staff Attendance**\n\n• Biometric tracking\n• Payroll integration\n• Real-time monitoring`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modSchoolOnline: {
    message: `**School Online**\n\n• Website integration\n• Event calendar\n• Online admission inquiries`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modOnlineAssessment: {
    message: `**Online Assessment**\n\n• Automated test creation\n• Anti-cheating mechanisms\n• Real-time analytics`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modTimetableManagement: {
    message: `**Timetable Management**\n\n• AI-powered scheduling\n• Auto-adjustments\n• Conflict-free allocations`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modFleetManagement: {
    message: `**Fleet Management**\n\n• GPS tracking\n• Route optimization\n• Compliance management`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modInventoryManagement: {
    message: `**Inventory Management**\n\n• Real-time tracking and audit-ready data for all assets\n• Intelligent movement logs\n• Seamless procurement integration\n• Prevents losses, excess purchases, and compliance risks`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modFinancialAccounting: {
    message: `**Financial Accounting**\n\n• Automated bookkeeping\n• Ledger reporting\n• Multi-currency support`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modHostelManagement: {
    message: `**Hostel Management**\n\n• Digital allotment\n• RFID check-in/out\n• Meal planning`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modWhatsAppIntegration: {
    message: `**WhatsApp Integration**\n\n• Automated alerts\n• Chatbot\n• Multimedia sharing`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modEmailIntegration: {
    message: `**Email Integration**\n\n• Personalized campaigns\n• Bulk scheduling\n• Auto-replies`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modCafeteriaManagement: {
    message: `**Cafeteria Management**\n\n• Digital wallet purchases\n• Nutritional tracking\n• Real-time order management`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modBookStore: {
    message: `Book Store Module\n\n• Smart Retail Operations for Schools – Streamlined, Scalable, Student-Centric\n• Automates inventory, billing, POS, and finance reconciliation\n• Ensures timely, accurate, and hassle-free availability of books, uniforms, and essentials\n• Transforms the bookstore into a controlled, efficient, and parent-friendly operation`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modEnquiry: {
    message: `Enquiry Module\n\n• Centralizes all admission enquiries from every channel\n• Automated assignment, follow-up, and source-wise tracking\n• Real-time reporting and seamless ERP integration\n• Ensures no enquiry is missed and every lead is acted on professionally`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  modTaskManagement: {
    message: `**Task Management**\n\n• Assign, monitor, and review tasks in real time\n• Digital dashboard for operational visibility and accountability\n• Prevents missed deadlines and ensures nothing falls through the cracks`,
    options: [
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'I need more info', next: 'moreDetails' },
    ],
  },
  scheduleDemo: {
    message: 'Let\'s schedule your free demo! Please provide the required details.',
    // The UI will trigger the multi-step form here
  },
  moreDetails: {
    message: '**For more details, you can chat with our AI Assistant below!**\n\nFeel free to ask any specific questions or request a personalized walkthrough.',
  },
  lms: {
    message: 'Our Learning Management System (LMS) helps schools deliver digital learning, track progress, and engage students online. Would you like to know about modules, features, or schedule a demo?',
    options: [
      { label: 'LMS Modules', next: 'lmsModules' },
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'Key features', next: 'lmsFeatures' },
    ],
  },
  lmsModules: {
    message: 'LMS Modules include course management, assignments, quizzes, and analytics.',
    options: [
      { label: 'Yes, register for the demo', next: 'scheduleDemo' },
      { label: 'No, I need more details', next: 'moreDetails' },
    ],
  },
  lmsFeatures: {
    message: 'Key features of LMS include:\n- Online course delivery\n- Student progress tracking\n- Interactive assignments and quizzes',
    options: [
      { label: 'Yes, register for the demo', next: 'scheduleDemo' },
      { label: 'No, I need more details', next: 'moreDetails' },
    ],
  },
  digitalContent: {
    message: 'Our Digital Content (DC) offering provides rich multimedia resources for enhanced learning. Would you like to know about content types, features, or schedule a demo?',
    options: [
      { label: 'Content Types', next: 'dcContentTypes' },
      { label: 'Register for the Demo', next: 'scheduleDemo' },
      { label: 'Key features', next: 'dcFeatures' },
    ],
  },
  dcContentTypes: {
    message: 'Digital Content types include videos, e-books, interactive lessons, and more.',
    options: [
      { label: 'Yes, register for the demo', next: 'scheduleDemo' },
      { label: 'No, I need more details', next: 'moreDetails' },
    ],
  },
  dcFeatures: {
    message: 'Key features of Digital Content include:\n- Multimedia learning resources\n- Interactive and engaging content\n- Easy integration with LMS and ERP',
    options: [
      { label: 'Yes, register for the demo', next: 'scheduleDemo' },
      { label: 'No, I need more details', next: 'moreDetails' },
    ],
  },
  allProducts: {
    message: 'We offer a complete suite of solutions: School ERP, LMS, Digital Content, and more. Would you like to explore a specific product or schedule a demo?',
    options: [
      { label: 'School ERP', next: 'schoolERP' },
      { label: 'LMS', next: 'lms' },
      { label: 'Digital Content', next: 'digitalContent' },
      { label: 'Register for the Demo', next: 'scheduleDemo' },
    ],
  },
}; 