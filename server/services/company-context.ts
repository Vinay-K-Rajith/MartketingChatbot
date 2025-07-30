export function getCompanyContext() {
  return {
    blogUrl: "https://www.entab.in/entab-blog.html",
    infoNote: "Note: This information is for product modules and solutions context only, not for latest news or events.",
    company: {
      name: "Entab Infotech Pvt Ltd",
      slogan: "Accelerating School Growth",
      incorporationDate: "May 9, 2001",
      founders: ["Lawrence Zacharias", "Shaji Thomas"],
      headquarters: "New Delhi, India",
      address: "B-227, Pocket A, Okhla Phase I, Okhla Industrial Estate, New Delhi, Delhi 110020",
      mission: "Transforming school management through innovative technology.",
      history:
        "Founded in 2001, Entab pioneered school automation in India and has evolved into a leading SaaS ed-tech provider, serving K-12 institutions with reliable, innovative solutions.",
    },
    contact: {
      phone: {
        main: "+91-7827887599",
        parentDesk: "+91-011-43193333",
        support: "+91-011-43193335",
      },
      whatsApp: "+91-7827887599",
      email: "info@entab.in",
      socialMedia: ["Facebook", "Instagram", "LinkedIn", "X"],
    },
    productsAndServices: {
      overview:
        "Comprehensive school management solutions, including ERP, mobile apps, and digital learning tools for K-12 institutions.",
      flagshipProduct: {
        name: "CampusCare® ERP",
        description:
          "An advanced, technology-driven, enterprise-grade School ERP solution designed to automate and streamline all school operations. Features include 100% automation, real-time data tracking, analytics, seamless communication, and deep integrations (WhatsApp, Email, Payment Gateways, and more). Modular, scalable, and cloud-based for progressive schools.",
      },
      modules: [
        {
          name: "Parent Helpdesk Chatbot",
          description:
            "Automates parent query resolution, ticketing, and escalation to human support when needed.",
          features: [
            "Categorizes and routes queries for quick resolution",
            "Intuitive interface for submitting and tracking tickets",
            "Transparent status updates",
            "Seamless handover to human agents"
          ]
        },
        {
          name: "Student Information Module",
          description:
            "Centralizes and automates student records, admissions, and profiles for data-driven decisions.",
          features: [
            "Unified student records",
            "Automated admission numbers",
            "360° student profiles",
            "Customizable forms",
            "Sibling recognition"
          ]
        },
        {
          name: "Fee and Billing Module",
          description:
            "Automates fee collection, reconciliation, and reporting with integrated payment gateways.",
          features: [
            "Real-time fee tracking",
            "Flexible fee structures",
            "Automated reminders",
            "Seamless reconciliation"
          ]
        },
        {
          name: "Exam & Assessment Module",
          description:
            "Automates exam scheduling, grading, and report generation with advanced analytics.",
          features: [
            "Customizable grading",
            "Dynamic report cards",
            "Performance analytics",
            "Exam scheduling"
          ]
        },
        {
          name: "Student Registration Module",
          description:
            "Digitizes and automates the admission process for efficiency and accuracy.",
          features: [
            "Multi-school applications",
            "Automated forms and receipts",
            "Customizable registration fields"
          ]
        },
        {
          name: "Transport Module",
          description:
            "Manages routes, vehicles, and transport fees with real-time tracking.",
          features: [
            "Route-wise defaulter reports",
            "Efficient fee collection"
          ]
        },
        {
          name: "Library Module",
          description:
            "Streamlines cataloging, circulation, and inventory management.",
          features: [
            "Real-time inventory",
            "Bulk barcode generation",
            "Stock verification",
            "Fine management"
          ]
        },
        {
          name: "SMS Module",
          description:
            "Enables instant, targeted communication via SMS and WhatsApp.",
          features: [
            "Delivery reports",
            "Fee reminder filters",
            "Automated birthday greetings"
          ]
        },
        {
          name: "Front Office Module",
          description:
            "Manages visitor tracking, gate passes, and inquiries.",
          features: [
            "Auto-generated gate pass numbers",
            "Organized record-keeping"
          ]
        },
        {
          name: "Holistic Progress Card",
          description:
            "Delivers 360° student assessment, including academic and personal development.",
          features: [
            "Whole-child tracking",
            "Personalized reports",
            "Self-reflection and feedback"
          ]
        },
        {
          name: "Dashboard & Support",
          description:
            "Centralized dashboard with integrated ticketing and support.",
          features: [
            "FreshDesk integration",
            "Permission-based access"
          ]
        },
        {
          name: "Master Setting Module",
          description:
            "Configures core ERP settings and automated workflows.",
          features: [
            "Granular communication controls",
            "Customizable automation"
          ]
        },
        {
          name: "Student Attendance Module",
          description:
            "Tracks attendance and automates related communications.",
          features: []
        }
      ],
      erpModules: {
        core: [
          { name: "Exam and Assessment", description: "AI-driven exam scheduling, grading, and report card generation for error-free evaluation and insightful analytics." },
          { name: "Student Information", description: "Automates student record management for accuracy, security, and real-time accessibility—empowering data-driven decisions." },
          { name: "Student Registration", description: "Transforms admissions with digital-first, automated, and integrated registration for a seamless experience." },
          { name: "Fee and Billing", description: "Automated, secure fee management with real-time tracking, customizable structures, and digital payments for 100% collection and transparency." },
          { name: "Book Store", description: "Automates school bookstore operations—inventory, billing, POS, and finance reconciliation—for a seamless, parent-friendly experience." },
          { name: "Enquiry", description: "Centralizes, tracks, and automates all admission enquiries with real-time reporting and seamless ERP integration." },
          { name: "Staff Payroll", description: "Automated salary processing, tax compliance, biometric sync, and payslip generation." },
          { name: "Student Attendance", description: "RFID/biometric tracking, automated reports, custom policies, and live analytics." },
          { name: "Transport Information", description: "GPS-powered fleet intelligence for real-time tracking, route optimization, and proactive safety control." },
          { name: "Library Management", description: "Barcode/RFID book issuance, digital cataloging, overdue alerts, and e-learning integration." },
          { name: "Management Dashboard", description: "Real-time school performance tracking, custom KPIs, and automated reports." },
          { name: "Parent Portal", description: "24/7 access to academic records, instant notifications, and online homework submission." }
        ],
        advanced: [
          { name: "Task Management", description: "Digital dashboard for assigning, tracking, and reviewing tasks—ensuring operational visibility and accountability." },
          { name: "Student Login", description: "Secure access to academic records, SSO integration, and personalized dashboard." },
          { name: "Staff Portal", description: "Role-based access, lesson planning, attendance, and performance analytics." },
          { name: "Healthcare", description: "Medical record management, emergency response, and health check-up tracking." },
          { name: "Lesson Plan", description: "Structured planning templates, interactive content, and performance insights." },
          { name: "Staff Information", description: "Centralized staff credentials, training tracking, and payroll integration." },
          { name: "SMS Communication", description: "Instant alerts, custom templates, and multi-language support." },
          { name: "Front Office", description: "Visitor management, appointment scheduling, and inquiry tracking." },
          { name: "Staff Attendance", description: "Biometric tracking, payroll integration, and real-time monitoring." },
          { name: "School Online", description: "Website integration, event calendar, and online admission inquiries." },
          { name: "Online Assessment", description: "Automated test creation, anti-cheating, and real-time analytics." }
        ],
        operational: [
          { name: "Timetable Management", description: "AI-powered scheduling, auto-adjustments, and conflict-free allocations." },
          { name: "Fleet Management", description: "GPS tracking, route optimization, and compliance management." },
          { name: "Inventory Management", description: "Integrated inventory control for real-time tracking, audit-ready data, and loss prevention across all assets." },
          { name: "Financial Accounting", description: "Automated bookkeeping, ledger reporting, and multi-currency support." },
          { name: "Hostel Management", description: "Digital allotment, RFID check-in/out, and meal planning." },
          { name: "WhatsApp Integration", description: "Automated alerts, chatbot, and multimedia sharing." },
          { name: "Email Integration", description: "Personalized campaigns, bulk scheduling, and auto-replies." },
          { name: "Cafeteria Management", description: "Digital wallet purchases, nutritional tracking, and real-time order management." }
        ]
      }
    },
    companyStats: {
      schoolsServed: "1,500+ schools",
      teamSize: "500+ professionals",
      presence: "27 states in India"
    },
    keyDifferentiators: [
      "Pioneers in Indian school automation since 2001",
      "All-in-one SaaS platform",
      "Trusted by 1,500+ schools",
      "Focus on innovation and support",
      "Alignment with NEP 2020"
    ]
  };
}
