export interface Job {
  id: string;
  orgId: string;
  orgName: string;
  orgLogo: string;
  title: string;
  description: string;
  rubric: {
    technical: number;
    communication: number;
    problemSolving: number;
    experience: number;
  };
  thresholds: {
    minScore: number;
    autoOffer: boolean;
  };
  status: 'active' | 'draft' | 'closed';
  location: string;
  salary: string;
  experienceLevel: string;
  postedDate: string;
  applicantsCount: number;
}

export interface Application {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidateAvatar: string;
  jobId: string;
  jobTitle: string;
  orgName: string;
  status: 'sourced' | 'screening' | 'interview_scheduled' | 'interviewed' | 'decided';
  stage: 'Sourced' | 'Screened' | 'Interview' | 'Decision';
  appliedDate: string;
  resumeUrl: string;
  skills: string[];
  targetRoles: string[];
  scores?: {
    composite: number;
    technical: number;
    communication: number;
    problemSolving: number;
    experience: number;
    confidence: number;
  };
  biasReport?: {
    overallScore: number;
    flaggedPhrases: { phrase: string; category: string; explanation: string }[];
    genderBiasCheck: string;
    originBiasCheck: string;
    explanation: string;
  };
  reasoning?: string;
  decision?: 'hire' | 'reject' | 'hold';
  transcript?: { question: string; answer: string; score: number; feedback: string }[];
  audioUrl?: string;
  proctorFlags?: { timestamp: string; type: string; severity: 'low' | 'medium' | 'high'; description: string }[];
  engagementSignal?: { eyeContact: number; speakingRate: string; confidenceScore: number };
  scheduledSlots?: string[];
  confirmedSlot?: string;
}

export interface MockSession {
  id: string;
  targetCompany: string;
  targetRole: string;
  difficulty: 'junior' | 'mid' | 'senior';
  rubric: { technical: number; communication: number; cultureFit: number };
  score: number;
  date: string;
  feedback: string;
  transcript: { question: string; answer: string; feedback: string }[];
}

export interface PrepContent {
  id: string;
  companyName: string;
  logo: string;
  roleArchetype: string;
  difficulty: string;
  cultureNotes: string;
  questions: { question: string; tip: string; sampleAnswer: string }[];
}

// ----------------------------------------------------
// Mock Data Seed
// ----------------------------------------------------

export const mockJobs: Job[] = [
  {
    id: 'job-101',
    orgId: 'org-swiggy',
    orgName: 'Swiggy',
    orgLogo: 'https://logo.clearbit.com/swiggy.com',
    title: 'Senior Frontend Engineer — Consumer Platform',
    description: 'We are looking for a Senior Frontend Engineer to join our core Consumer Web & App team. You will build highly optimized checkout pipelines, improve lazy loading performance of menus, and design micro-frontend modules for millions of food and grocery delivery orders daily.',
    rubric: { technical: 40, communication: 20, problemSolving: 20, experience: 20 },
    thresholds: { minScore: 82, autoOffer: true },
    status: 'active',
    location: 'Bengaluru, KA (Hybrid)',
    salary: '₹28L - ₹42L',
    experienceLevel: 'Senior (5+ years)',
    postedDate: '2026-06-28',
    applicantsCount: 18,
  },
  {
    id: 'job-102',
    orgId: 'org-razorpay',
    orgName: 'Razorpay',
    orgLogo: 'https://logo.clearbit.com/razorpay.com',
    title: 'Product Manager — Payments Flow',
    description: 'Join the Core Checkout team at Razorpay to build checkout experiences that power over 8 million Indian merchants. You will lead cross-functional engineering groups to design low-latency retry mechanisms and localized UPI payment flows.',
    rubric: { technical: 20, communication: 35, problemSolving: 25, experience: 20 },
    thresholds: { minScore: 85, autoOffer: false },
    status: 'active',
    location: 'Bengaluru, KA (On-site)',
    salary: '₹22L - ₹32L',
    experienceLevel: 'Mid-Senior (4+ years)',
    postedDate: '2026-07-01',
    applicantsCount: 12,
  },
  {
    id: 'job-103',
    orgId: 'org-cred',
    orgName: 'CRED',
    orgLogo: 'https://logo.clearbit.com/cred.club',
    title: 'Full Stack Engineer — Billing & Ledgers',
    description: 'Help us design high-throughput transaction pipelines. You will work across Node, Go, Postgres, and React to build ledger systems that process member bill payments with absolute accuracy and zero double-spend anomalies.',
    rubric: { technical: 45, communication: 15, problemSolving: 20, experience: 20 },
    thresholds: { minScore: 80, autoOffer: false },
    status: 'active',
    location: 'Bengaluru, KA (Hybrid)',
    salary: '₹30L - ₹45L',
    experienceLevel: 'Senior (4+ years)',
    postedDate: '2026-06-15',
    applicantsCount: 24,
  },
  {
    id: 'job-104',
    orgId: 'org-zoho',
    orgName: 'Zoho',
    orgLogo: 'https://logo.clearbit.com/zoho.com',
    title: 'Lead Data Scientist — AI Assistant',
    description: 'Build predictive search algorithms and AI productivity tools inside the Zoho SaaS suite. You will train custom NLP models to automate customer tickets, optimize hybrid database search, and work directly with product leads.',
    rubric: { technical: 50, communication: 10, problemSolving: 25, experience: 15 },
    thresholds: { minScore: 88, autoOffer: false },
    status: 'draft',
    location: 'Chennai, TN (On-site)',
    salary: '₹26L - ₹40L',
    experienceLevel: 'Lead (7+ years)',
    postedDate: '2026-07-02',
    applicantsCount: 0,
  },
  {
    id: 'job-105',
    orgId: 'org-zerodha',
    orgName: 'Zerodha',
    orgLogo: 'https://logo.clearbit.com/zerodha.com',
    title: 'Backend Engineer — Core Trading Systems',
    description: 'Work on India\'s largest retail stockbroker. You will design ultra-low latency order routing libraries in Go, manage high-concurrency Redis caching grids, and build resilient socket layers capable of streaming millions of ticks concurrently.',
    rubric: { technical: 50, communication: 10, problemSolving: 25, experience: 15 },
    thresholds: { minScore: 86, autoOffer: false },
    status: 'active',
    location: 'Bengaluru, KA (On-site)',
    salary: '₹24L - ₹38L',
    experienceLevel: 'Mid-Senior (3+ years)',
    postedDate: '2026-06-30',
    applicantsCount: 15,
  },
  {
    id: 'job-106',
    orgId: 'org-ola',
    orgName: 'Ola Electric',
    orgLogo: 'https://logo.clearbit.com/olacabs.com',
    title: 'Staff Infrastructure Engineer',
    description: 'Optimize high-throughput telemetry pipelines that capture telemetry from thousands of smart electric scooters. You will build and scale distributed Kubernetes clusters across hybrid clouds, ensuring 99.99% uptime for iot ingestion.',
    rubric: { technical: 45, communication: 15, problemSolving: 20, experience: 20 },
    thresholds: { minScore: 85, autoOffer: false },
    status: 'active',
    location: 'Pune, MH (Hybrid)',
    salary: '₹42L - ₹65L',
    experienceLevel: 'Staff (8+ years)',
    postedDate: '2026-07-02',
    applicantsCount: 8,
  },
  {
    id: 'job-107',
    orgId: 'org-meesho',
    orgName: 'Meesho',
    orgLogo: 'https://logo.clearbit.com/meesho.com',
    title: 'Frontend Engineer — Seller Portal',
    description: 'Build responsive interfaces that enable lakhs of micro-entrepreneurs and home sellers across India to manage inventories. Optimize frontend layouts for low-end mobile browsers on slow tier-3 mobile networks.',
    rubric: { technical: 35, communication: 25, problemSolving: 20, experience: 20 },
    thresholds: { minScore: 78, autoOffer: true },
    status: 'active',
    location: 'Bengaluru, KA (Hybrid)',
    salary: '₹14L - ₹22L',
    experienceLevel: 'Mid (2+ years)',
    postedDate: '2026-07-02',
    applicantsCount: 19,
  },
  {
    id: 'job-108',
    orgId: 'org-flipkart',
    orgName: 'Flipkart',
    orgLogo: 'https://logo.clearbit.com/flipkart.com',
    title: 'UI Engineer — Search & Recommendations',
    description: 'Design highly interactive product discovery structures for the Flipkart app. Implement smart auto-suggestions, rich filter overlays, and glassmorphic card grids, guaranteeing frame rates of 60fps during major Big Billion Days sale events.',
    rubric: { technical: 40, communication: 20, problemSolving: 20, experience: 20 },
    thresholds: { minScore: 81, autoOffer: false },
    status: 'active',
    location: 'Bengaluru, KA (Remote)',
    salary: '₹18L - ₹28L',
    experienceLevel: 'Senior (4+ years)',
    postedDate: '2026-07-03',
    applicantsCount: 7,
  }
];

export const mockApplications: Application[] = [
  {
    id: 'app-501',
    candidateName: 'Ananya Iyer',
    candidateEmail: 'ananya.iyer@gmail.com',
    candidateAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    jobId: 'job-101',
    jobTitle: 'Senior Frontend Engineer — Consumer Platform',
    orgName: 'Swiggy',
    status: 'decided',
    stage: 'Decision',
    appliedDate: '2026-07-02',
    resumeUrl: 'ananya_iyer_cv.pdf',
    skills: ['React', 'Next.js', 'TypeScript', 'Web Performance Optimization', 'CSS Architecture', 'Webpack/Vite'],
    targetRoles: ['Senior Frontend Engineer', 'UI Lead'],
    scores: {
      composite: 89,
      technical: 92,
      communication: 85,
      problemSolving: 90,
      experience: 88,
      confidence: 95
    },
    biasReport: {
      overallScore: 98,
      flaggedPhrases: [],
      genderBiasCheck: 'Passed. Evaluated purely on frontend architectural patterns and system design performance.',
      originBiasCheck: 'Passed. Normalized scoring for regional universities vs tier-1 colleges.',
      explanation: 'The Screening and Evaluation Agents evaluated the technical qualifications without identifying markers. Recommendation is highly objective.'
    },
    reasoning: 'Ananya demonstrated exceptional mastery of React Concurrent features, virtualized lists for high-volume menu components, and optimized Next.js prefetching. Her answers during the AI voice interview showed structured communication and clear ownership. She meets the hiring threshold (82%) with a composite score of 89%.',
    decision: 'hire',
    transcript: [
      {
        question: 'How would you optimize list rendering for a food delivery menu containing thousands of nested items?',
        answer: 'I would implement windowed list rendering using react-window or custom virtualization. By rendering only the items visible in the viewport and a small buffer, we keep the DOM node count low, significantly improving scroll performance and reducing layout calculation times. I would also memoize render cards using React.memo and prevent inline function instantiations to avoid unnecessary re-renders.',
        score: 95,
        feedback: 'Extremely accurate description of Server Component serialization and dependency isolation.'
      },
      {
        question: 'Describe how you would debug a layout shift (CLS) bottleneck on the Swiggy checkout page.',
        answer: 'I would use the Chrome DevTools Performance panel or Web Vitals library to isolate the layout shift occurrences. For the checkout page, CLS is often caused by dynamically loaded payment option elements or late CSS stylesheets. I would enforce explicit aspect-ratio values on image placeholders, reserve space for components like dynamic coupon banners, and preload critical stylesheets.',
        score: 88,
        feedback: 'Good demonstration of utilizing performance tooling, though could have expanded on server-side response delays.'
      }
    ],
    audioUrl: '/mock-audio.mp3',
    proctorFlags: [
      { timestamp: '02:15', type: 'Off-screen gaze', severity: 'low', description: 'Candidate looked away from screen for 4 seconds' }
    ],
    engagementSignal: {
      eyeContact: 92,
      speakingRate: 'Normal (142 WPM)',
      confidenceScore: 90
    }
  },
  {
    id: 'app-502',
    candidateName: 'Vikram Malhotra',
    candidateEmail: 'vikram.malhotra@outlook.com',
    candidateAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    jobId: 'job-102',
    jobTitle: 'Product Manager — Payments Flow',
    orgName: 'Razorpay',
    status: 'interviewed',
    stage: 'Decision',
    appliedDate: '2026-07-01',
    resumeUrl: 'vikram_malhotra_pm.pdf',
    skills: ['Product Strategy', 'SQL Analytics', 'API Integration', 'Payment Gateways', 'User Research'],
    targetRoles: ['Product Manager', 'Technical PM'],
    scores: {
      composite: 74,
      technical: 70,
      communication: 80,
      problemSolving: 72,
      experience: 75,
      confidence: 88
    },
    biasReport: {
      overallScore: 99,
      flaggedPhrases: [],
      genderBiasCheck: 'Passed.',
      originBiasCheck: 'Passed.',
      explanation: 'Evaluation metrics show uniform performance ratings.'
    },
    reasoning: 'Candidate showed great skills in communication and API design, but had gaps in pricing optimization calculations and multi-tenant ledger setups. The composite score of 74% falls below Razorpay\'s threshold of 85%.',
    decision: 'hold',
    transcript: [
      {
        question: 'How would you design a product roadmap for localizing payment methods in Southeast Asia?',
        answer: 'I would first review transaction volumes to identify key payment channels (e.g., e-wallets, bank transfers). Then, I would prioritize standardizing the API layer so merchants can add new options with minimal code. Finally, I would release it in stages starting with high-volume merchant partners to gather feedback and monitor success rates.',
        score: 74,
        feedback: 'Correct high-level concept but lacks technical explanation of localization and regulatory requirements.'
      }
    ],
    audioUrl: '/mock-audio-2.mp3',
    proctorFlags: [],
    engagementSignal: {
      eyeContact: 85,
      speakingRate: 'Slow (115 WPM)',
      confidenceScore: 78
    }
  },
  {
    id: 'app-503',
    candidateName: 'Rohan Deshmukh',
    candidateEmail: 'rohan.deshmukh@gmail.com',
    candidateAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    jobId: 'job-101',
    jobTitle: 'Senior Frontend Engineer — Consumer Platform',
    orgName: 'Swiggy',
    status: 'interview_scheduled',
    stage: 'Interview',
    appliedDate: '2026-07-03',
    resumeUrl: 'rohan_deshmukh_resume.pdf',
    skills: ['React', 'TypeScript', 'Node.js', 'Vite', 'State Management'],
    targetRoles: ['Frontend Developer', 'Software Engineer'],
    scheduledSlots: ['2026-07-05 10:00 AM', '2026-07-05 02:00 PM', '2026-07-06 11:30 AM'],
    confirmedSlot: '2026-07-05 10:00 AM'
  },
  {
    id: 'app-504',
    candidateName: 'Priya Patel',
    candidateEmail: 'priya.patel@techcorp.in',
    candidateAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    jobId: 'job-101',
    jobTitle: 'Senior Frontend Engineer — Consumer Platform',
    orgName: 'Swiggy',
    status: 'screening',
    stage: 'Screened',
    appliedDate: '2026-07-03',
    resumeUrl: 'priya_patel_cv.pdf',
    skills: ['Next.js', 'React Query', 'Tailwind CSS', 'TypeScript', 'GraphQL', 'AWS'],
    targetRoles: ['Senior Frontend Engineer']
  },
  {
    id: 'app-505',
    candidateName: 'Aarav Sharma',
    candidateEmail: 'aarav.sharma@gmail.com',
    candidateAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    jobId: 'job-102',
    jobTitle: 'Product Manager — Payments Flow',
    orgName: 'Razorpay',
    status: 'decided',
    stage: 'Decision',
    appliedDate: '2026-06-29',
    resumeUrl: 'aarav_sharma_pm.pdf',
    skills: ['Payment Operations', 'SQL Analytics', 'Idempotency Design', 'Merchant Onboarding'],
    targetRoles: ['Product Manager', 'Senior Product Manager'],
    scores: {
      composite: 88,
      technical: 85,
      communication: 90,
      problemSolving: 88,
      experience: 89,
      confidence: 92
    },
    biasReport: {
      overallScore: 97,
      flaggedPhrases: [],
      genderBiasCheck: 'Passed.',
      originBiasCheck: 'Passed.',
      explanation: 'Analysis verified evaluation tags are free of geographic bias filters.'
    },
    reasoning: 'Aarav displayed deep expertise in payment retry mechanics, merchant onboarding dropdown optimization, and API error codes. Exceeded Razorpay PM threshold (85%) with a score of 88%. Hired.',
    decision: 'hire',
    transcript: [
      {
        question: 'How do you design a retry logic policy for failed payment authorizations?',
        answer: 'I would prioritize a multi-layered policy. For transient errors like network dropouts, we implement immediate exponential backoff retries with jitter. For processing errors like card declines, we present descriptive UI responses to prompt alternative payment methods. Crucially, all API requests carry idempotency keys to prevent duplicate billing.',
        score: 92,
        feedback: 'Excellent metrics-first approach with clear action items.'
      }
    ],
    audioUrl: '/mock-audio-3.mp3',
    proctorFlags: [],
    engagementSignal: {
      eyeContact: 95,
      speakingRate: 'Normal (138 WPM)',
      confidenceScore: 91
    }
  },
  {
    id: 'app-506',
    candidateName: 'Aditi Rao',
    candidateEmail: 'aditi.rao@yahoo.co.in',
    candidateAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    jobId: 'job-103',
    jobTitle: 'Full Stack Engineer — Billing & Ledgers',
    orgName: 'CRED',
    status: 'screening',
    stage: 'Screened',
    appliedDate: '2026-07-02',
    resumeUrl: 'aditi_rao_cred_cv.pdf',
    skills: ['Node.js', 'PostgreSQL', 'Redis', 'React', 'Docker'],
    targetRoles: ['Full Stack Engineer', 'Backend Developer']
  },
  {
    id: 'app-507',
    candidateName: 'Amit Verma',
    candidateEmail: 'amit.verma@gmail.com',
    candidateAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    jobId: 'job-103',
    jobTitle: 'Full Stack Engineer — Billing & Ledgers',
    orgName: 'CRED',
    status: 'sourced',
    stage: 'Sourced',
    appliedDate: '2026-07-04',
    resumeUrl: 'amit_verma_billing.pdf',
    skills: ['Node.js', 'PostgreSQL', 'TypeScript', 'Prisma', 'REST APIs'],
    targetRoles: ['Full Stack Engineer']
  },
  {
    id: 'app-508',
    candidateName: 'Sneha Gupta',
    candidateEmail: 'sneha.gupta@outlook.com',
    candidateAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    jobId: 'job-102',
    jobTitle: 'Product Manager — Payments Flow',
    orgName: 'Razorpay',
    status: 'interviewed',
    stage: 'Interview',
    appliedDate: '2026-06-30',
    resumeUrl: 'sneha_gupta_pm_resume.pdf',
    skills: ['User Research', 'Product Analytics', 'Figma Wireframing', 'Agile Scrum'],
    targetRoles: ['Product Manager', 'Associate PM'],
    scores: {
      composite: 83,
      technical: 80,
      communication: 88,
      problemSolving: 81,
      experience: 82,
      confidence: 85
    },
    biasReport: {
      overallScore: 98,
      flaggedPhrases: [],
      genderBiasCheck: 'Passed.',
      originBiasCheck: 'Passed.',
      explanation: 'Parameters aligned on product execution capabilities.'
    },
    reasoning: 'Sneha has a strong grip on UI flows and user personas. She had slightly lower depth in API integrations and compliance regulations, putting her score right below Razorpay PM hiring threshold (85%). Recommended for review.',
    decision: 'hold',
    transcript: [
      {
        question: 'How do you measure checkout page drop-offs and prioritize solutions?',
        answer: 'I set up funnel tracking using tools like Mixpanel. By looking at steps from clicking buy to completing payment authorization, we pinpoint the highest drop-off rate. If it happens on 3DS authorization, we look at loading latency or missing local payment integrations. I prioritize solutions that target the high-volume merchants first.',
        score: 81,
        feedback: 'Practical funnel analysis, but missed checking dynamic payment methods routing.'
      }
    ],
    audioUrl: '/mock-audio-2.mp3',
    proctorFlags: [],
    engagementSignal: {
      eyeContact: 88,
      speakingRate: 'Normal (130 WPM)',
      confidenceScore: 82
    }
  },
  {
    id: 'app-509',
    candidateName: 'Devendra Kumar',
    candidateEmail: 'dev.kumar@gmail.com',
    candidateAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    jobId: 'job-104',
    jobTitle: 'Lead Data Scientist — AI Assistant',
    orgName: 'Zoho',
    status: 'decided',
    stage: 'Decision',
    appliedDate: '2026-07-01',
    resumeUrl: 'devendra_kumar_data_science.pdf',
    skills: ['Python', 'PyTorch', 'Transformers', 'MLOps', 'Vector Search', 'SQL'],
    targetRoles: ['Lead Data Scientist', 'AI Engineer'],
    scores: {
      composite: 90,
      technical: 93,
      communication: 82,
      problemSolving: 92,
      experience: 91,
      confidence: 88
    },
    biasReport: {
      overallScore: 98,
      flaggedPhrases: [],
      genderBiasCheck: 'Passed.',
      originBiasCheck: 'Passed.',
      explanation: 'Auditing verified scoring maps solely to coding and model training tasks.'
    },
    reasoning: 'Devendra has highly exceptional skills in transformer models, vector retrieval latency, and semantic search matching. Fully exceeds Zoho Lead Data Scientist threshold (88%) with composite score of 90%.',
    decision: 'hire',
    transcript: [
      {
        question: 'How do you handle vocabulary mismatch in semantic search queries for CRM records?',
        answer: 'We implement hybrid search combining dense semantic embeddings (using a model like multilingual Sentence-BERT) with sparse keyword search (BM25). By normalizing and blending their scores using Reciprocal Rank Fusion (RRF), we catch both synonym-based matches and exact matches, ensuring high-recall domain queries.',
        score: 93,
        feedback: 'Expert knowledge of hybrid indexing search techniques.'
      }
    ],
    audioUrl: '/mock-audio-3.mp3',
    proctorFlags: [],
    engagementSignal: {
      eyeContact: 90,
      speakingRate: 'Normal (135 WPM)',
      confidenceScore: 89
    }
  },
  {
    id: 'app-510',
    candidateName: 'Kavita Krishnan',
    candidateEmail: 'kavita.k@gmail.com',
    candidateAvatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150',
    jobId: 'job-105',
    jobTitle: 'Backend Engineer — Core Trading Systems',
    orgName: 'Zerodha',
    status: 'sourced',
    stage: 'Sourced',
    appliedDate: '2026-07-04',
    resumeUrl: 'kavita_krishnan_backend.pdf',
    skills: ['Go', 'gRPC', 'PostgreSQL', 'Redis Cluster', 'Kafka', 'System Design'],
    targetRoles: ['Backend Engineer', 'Systems Engineer']
  },
  {
    id: 'app-511',
    candidateName: 'Neha Sharma',
    candidateEmail: 'neha.sharma@outlook.com',
    candidateAvatar: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150',
    jobId: 'job-107',
    jobTitle: 'Frontend Engineer — Seller Portal',
    orgName: 'Meesho',
    status: 'screening',
    stage: 'Screened',
    appliedDate: '2026-07-02',
    resumeUrl: 'neha_sharma_meesho.pdf',
    skills: ['React', 'Next.js', 'Redux', 'Responsive UI', 'CSS Grid'],
    targetRoles: ['Frontend Developer']
  },
  {
    id: 'app-512',
    candidateName: 'Rahul Nair',
    candidateEmail: 'rahul.nair@gmail.com',
    candidateAvatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
    jobId: 'job-106',
    jobTitle: 'Staff Infrastructure Engineer',
    orgName: 'Ola Electric',
    status: 'interview_scheduled',
    stage: 'Interview',
    appliedDate: '2026-07-03',
    resumeUrl: 'rahul_nair_infra.pdf',
    skills: ['Kubernetes', 'AWS', 'Terraform', 'CI/CD Pipelines', 'Prometheus', 'Golang'],
    targetRoles: ['Staff Infrastructure Engineer', 'DevOps Lead'],
    scheduledSlots: ['2026-07-06 11:00 AM', '2026-07-06 03:00 PM', '2026-07-07 10:00 AM'],
    confirmedSlot: '2026-07-06 11:00 AM'
  }
];

export const mockSessions: MockSession[] = [
  {
    id: 'mock-session-123',
    targetCompany: 'Swiggy',
    targetRole: 'Senior Frontend Engineer',
    difficulty: 'mid',
    rubric: { technical: 80, communication: 90, cultureFit: 85 },
    score: 85,
    date: '2026-07-02',
    feedback: 'Your technical logic on DOM rendering was strong, and you did a fantastic job explaining component-level state updates. However, improve by discussing web vitals metric tracking (LCP, FID) before choosing custom architectures.',
    transcript: [
      {
        question: 'Explain the benefits of React Server Components over standard SSR in Next.js.',
        answer: 'In standard SSR, the server renders HTML, but we still ship the full JavaScript bundle for all components to hydrate on the client. With RSCs, components execute solely on the server and their dependencies are not bundled. We stream serialized React descriptors, reducing client-side bundle sizes while keeping page layouts fully interactive.',
        feedback: 'Excellent breakdown of serialization vs raw hydration mechanisms.'
      },
      {
        question: 'Tell me about a time you handled a feature dispute with a product manager.',
        answer: 'The PM wanted to load high-resolution merchant images on product scroll, but this created memory spikes and high CLS on mobile networks. I scheduled a call, showed Chrome DevTools bandwidth runs, and we agreed to implement progressive image loading with Blurhash strings, preserving user experience without degrading performance.',
        feedback: 'Solid demonstration of using engineering data to influence product design.'
      }
    ]
  },
  {
    id: 'mock-session-124',
    targetCompany: 'Razorpay',
    targetRole: 'Product Manager',
    difficulty: 'senior',
    rubric: { technical: 75, communication: 88, cultureFit: 80 },
    score: 81,
    date: '2026-06-30',
    feedback: 'Strong communication skills and API lifecycle management knowledge. Spend more time outlining concrete retry limits and idempotency key safety mechanisms.',
    transcript: []
  },
  {
    id: 'mock-session-125',
    targetCompany: 'CRED',
    targetRole: 'Software Engineer',
    difficulty: 'senior',
    rubric: { technical: 88, communication: 80, cultureFit: 82 },
    score: 83,
    date: '2026-07-03',
    feedback: 'Impressive systems-level thinking regarding database locks and ledger transactions. However, detail how you would handle stale caching policies in highly read-heavy APIs.',
    transcript: [
      {
        question: 'How do you design a database schema for user reward balances that guarantees absolute accuracy?',
        answer: 'I would avoid saving a mutable balance integer directly. Instead, I would design a double-entry ledger database schema, where each transaction registers a credit or debit entry in an immutable table. We run ACID transactions to insert ledger rows, and calculate the current balance by summing the delta. To optimize read latency, we can maintain materialized views or an auxiliary Redis cache updated via database triggers or CDC.',
        feedback: 'Highly accurate double-entry ledger design showing solid database integrity principles.'
      }
    ]
  }
];

export const mockPrepContent: PrepContent[] = [
  {
    id: 'prep-swiggy',
    companyName: 'Swiggy',
    logo: 'https://logo.clearbit.com/swiggy.com',
    roleArchetype: 'Software Engineer',
    difficulty: 'Medium to Hard',
    cultureNotes: 'Focuses heavily on customer transit times, extreme scale handling, real-time dispatch systems, and micro-frontend structures. Big emphasis on web vitals and fast interactive loads.',
    questions: [
      {
        question: 'How do you design a real-time order tracking map that updates driver locations efficiently?',
        tip: 'Mention WebSockets or Server-Sent Events (SSE) for server-to-client updates, geographic database indexing using Redis Geospatial, and client-side coordinate interpolation for smooth marker animations.',
        sampleAnswer: 'To design Swiggy-scale live tracking, I would establish WebSocket connections for connected clients, streaming coordinates throttled at 3-second intervals. On the server, Driver locations are updated in Redis Geospatial sets. On the frontend, we use requestAnimationFrame with linear interpolation (lerp) to slide driver icons smoothly between coordinates instead of jerky jumps.'
      },
      {
        question: 'How would you build a micro-frontend shell for Swiggy that loads the checkout, food delivery, and Instamart portals independently?',
        tip: 'Detail Module Federation or Web Components, handling global state shared between portals (like user tokens or cart counts), and isolating CSS stylesheets.',
        sampleAnswer: 'I would use Webpack Module Federation to mount federated remote entry builds at runtime. The root shell acts as the host, managing route routing. Shared state like authentication tokens and common cart items are exposed via custom event brokers or lightweight shared context. CSS isolation is enforced via Tailwind prefixes or CSS Modules.'
      }
    ]
  },
  {
    id: 'prep-razorpay',
    companyName: 'Razorpay',
    logo: 'https://logo.clearbit.com/razorpay.com',
    roleArchetype: 'Product Manager',
    difficulty: 'Medium',
    cultureNotes: 'Razorpay values customer success, developer experience (clear documentation), metrics-driven API optimization, and complete transaction reliability.',
    questions: [
      {
        question: 'How would you design a localized UPI payment checkout experience that optimizes for speed and success rates?',
        tip: 'Focus on intent flow patterns (direct launch of GooglePay/PhonePe apps), auto-read OTP capabilities, and fallback routes for bank server failures.',
        sampleAnswer: 'I would design an intent-based payment page that detects UPI apps installed on mobile. Upon selection, it directly launches the app with pre-filled billing vectors, reducing user clicks. If a specific bank API suffers high latency, our backend dynamically routes transactions to alternate acquiring banks before prompting the user.'
      }
    ]
  }
];

export const mockAgentLogs = [
  { id: 'log-1', agentName: 'Sourcing Agent', action: 'Scraped candidate profile from candidate pool', target: 'Ananya Iyer', status: 'success', timestamp: '2026-07-02 14:22:10' },
  { id: 'log-2', agentName: 'Screening Agent', action: 'Parsed resume and extracted skills vector', target: 'Ananya Iyer', status: 'success', timestamp: '2026-07-02 14:22:30' },
  { id: 'log-3', agentName: 'Screening Agent', action: 'Calculated rubric match score (89%)', target: 'Ananya Iyer', status: 'success', timestamp: '2026-07-02 14:23:05' },
  { id: 'log-4', agentName: 'Scheduler Agent', action: 'Proposed interview slots via candidate dashboard', target: 'Ananya Iyer', status: 'success', timestamp: '2026-07-02 14:23:12' },
  { id: 'log-5', agentName: 'Scheduler Agent', action: 'Confirmed slot for 2026-07-05 10:00 AM', target: 'Rohan Deshmukh', status: 'success', timestamp: '2026-07-03 09:12:00' },
  { id: 'log-6', agentName: 'Interviewer Agent', action: 'Completed live voice interview & generated transcript', target: 'Ananya Iyer', status: 'success', timestamp: '2026-07-02 15:45:00' },
  { id: 'log-7', agentName: 'Evaluator Agent', action: 'Scored transcript response and performed bias audit', target: 'Ananya Iyer', status: 'success', timestamp: '2026-07-02 15:46:12' },
  { id: 'log-8', agentName: 'Decision Agent', action: 'Triggered auto-offer flow. Drafted contract email.', target: 'Ananya Iyer', status: 'success', timestamp: '2026-07-02 15:48:00' }
];

export const mockSystemHealth = {
  activeOrgs: 35,
  activeCandidates: 1850,
  activeJobs: 56,
  interviewsCompletedToday: 24,
  failedJobs: 0,
  queueDepth: {
    sourcing: 1,
    screening: 0,
    interviewing: 2,
    evaluating: 0
  },
  apiErrorRate: '0.02%'
};
