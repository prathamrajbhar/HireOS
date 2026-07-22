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
  stages?: ('screening' | 'assessment' | 'voice_screen' | 'panel' | 'decision')[];
  assessmentConfig?: {
    mcqCount: number;
    codingProblemId: string;
    passingScore: number;
  };
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
  stage: 'Sourced' | 'Screened' | 'Assessment' | 'Interview' | 'Panel' | 'Decision';
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

export interface Notification {
  id: string;
  type: 'pipeline' | 'decision' | 'alert' | 'interview' | 'offer';
  text: string;
  time: string;
  link: string;
  read: boolean;
}

export const mockNotifications: Notification[] = [
  { id: 'notif-1', type: 'pipeline', text: 'Screening Agent shortlisted 4 candidates for Senior Frontend Engineer.', time: '2 mins ago', link: '/hr/jobs/job-101/pipeline', read: false },
  { id: 'notif-2', type: 'decision', text: 'Decision Agent held Vikram Malhotra for review (composite: 74%).', time: '10 mins ago', link: '/hr/candidates/app-502', read: false },
  { id: 'notif-3', type: 'interview', text: 'Interviewer Agent completed interview replay stream for Ananya Iyer.', time: '1 hour ago', link: '/hr/candidates/app-501/interview', read: false },
  { id: 'notif-4', type: 'offer', text: 'Offer auto-dispatched to Rohan Deshmukh for Backend Engineer.', time: '3 hours ago', link: '/hr/candidates/app-503', read: true },
  { id: 'notif-5', type: 'alert', text: 'Bias Audit Agent flagged an anomaly in the Product Designer pipeline.', time: 'Yesterday', link: '/hr/analytics', read: true },
  { id: 'notif-6', type: 'pipeline', text: 'Sourcing Agent added 12 new candidates to the DevOps Engineer pool.', time: '2 days ago', link: '/hr/talent-pool', read: true },
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

// ----------------------------------------------------
// Offer Management & Negotiation
// ----------------------------------------------------

export interface OfferNegotiationMessage {
  id: string;
  author: 'candidate' | 'hr';
  message: string;
  timestamp: string;
  proposedSalary?: string;
}

export interface Offer {
  id: string;
  applicationId: string;
  candidateName: string;
  candidateAvatar: string;
  jobId: string;
  jobTitle: string;
  orgName: string;
  status: 'draft' | 'sent' | 'negotiating' | 'accepted' | 'declined' | 'expired';
  baseSalary: string;
  bonus: string;
  equity: string;
  joiningDate: string;
  expiryDate: string;
  benefits: string[];
  negotiationHistory: OfferNegotiationMessage[];
  letterUrl: string;
}

export const mockOffers: Offer[] = [
  {
    id: 'offer-1',
    applicationId: 'app-501',
    candidateName: 'Ananya Iyer',
    candidateAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    jobId: 'job-101',
    jobTitle: 'Senior Frontend Engineer — Consumer Platform',
    orgName: 'Swiggy',
    status: 'negotiating',
    baseSalary: '₹34L',
    bonus: '₹4L annual performance bonus',
    equity: '0.02% (4yr vest, 1yr cliff)',
    joiningDate: '2026-08-15',
    expiryDate: '2026-07-20',
    benefits: ['Health insurance for family', 'Meal credits', 'WFH stipend ₹15,000/mo', 'Annual learning budget ₹50,000'],
    negotiationHistory: [
      { id: 'neg-1', author: 'hr', message: 'We are excited to extend an offer of ₹34L base + ₹4L bonus for the Senior Frontend Engineer role.', timestamp: '2026-07-05 11:00', proposedSalary: '₹34L' },
      { id: 'neg-2', author: 'candidate', message: 'Thank you! Based on my current comp and market benchmarks, could we discuss a base closer to ₹38L?', timestamp: '2026-07-06 09:30', proposedSalary: '₹38L' },
      { id: 'neg-3', author: 'hr', message: 'We can move to ₹36L base with an accelerated compensation review at 6 months.', timestamp: '2026-07-06 15:45', proposedSalary: '₹36L' },
    ],
    letterUrl: '/mock-offer-letter.pdf',
  },
  {
    id: 'offer-2',
    applicationId: 'app-505',
    candidateName: 'Aarav Sharma',
    candidateAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    jobId: 'job-102',
    jobTitle: 'Product Manager — Payments Flow',
    orgName: 'Razorpay',
    status: 'accepted',
    baseSalary: '₹27L',
    bonus: '₹3L annual',
    equity: '0.015% (4yr vest)',
    joiningDate: '2026-08-01',
    expiryDate: '2026-07-15',
    benefits: ['Health insurance', 'ESOP buyback program', 'Relocation assistance'],
    negotiationHistory: [
      { id: 'neg-4', author: 'hr', message: 'Offer extended: ₹27L base for Product Manager — Payments Flow.', timestamp: '2026-07-01 10:00', proposedSalary: '₹27L' },
      { id: 'neg-5', author: 'candidate', message: 'This works for me — accepting the offer!', timestamp: '2026-07-02 12:00' },
    ],
    letterUrl: '/mock-offer-letter.pdf',
  },
  {
    id: 'offer-3',
    applicationId: 'app-509',
    candidateName: 'Devendra Kumar',
    candidateAvatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150',
    jobId: 'job-104',
    jobTitle: 'Lead Data Scientist — AI Assistant',
    orgName: 'Zoho',
    status: 'sent',
    baseSalary: '₹36L',
    bonus: '₹5L annual',
    equity: 'N/A (private, non-equity band)',
    joiningDate: '2026-08-20',
    expiryDate: '2026-07-25',
    benefits: ['Health insurance', 'Research conference budget ₹1,00,000', 'Sabbatical after 3 years'],
    negotiationHistory: [
      { id: 'neg-6', author: 'hr', message: 'Offer extended for Lead Data Scientist — AI Assistant role. Let us know if you have questions.', timestamp: '2026-07-08 14:00', proposedSalary: '₹36L' },
    ],
    letterUrl: '/mock-offer-letter.pdf',
  },
];

// ----------------------------------------------------
// Reference Checks
// ----------------------------------------------------

export interface ReferenceCheck {
  id: string;
  applicationId: string;
  candidateName: string;
  refereeName: string;
  refereeTitle: string;
  refereeRelationship: string;
  status: 'pending' | 'sent' | 'completed' | 'declined';
  requestedDate: string;
  completedDate?: string;
  ratings?: { category: string; score: number }[];
  summary?: string;
  wouldRehire?: boolean;
}

export const mockReferences: ReferenceCheck[] = [
  {
    id: 'ref-1',
    applicationId: 'app-501',
    candidateName: 'Ananya Iyer',
    refereeName: 'Karan Mehta',
    refereeTitle: 'Engineering Manager',
    refereeRelationship: 'Direct manager at previous company (2 years)',
    status: 'completed',
    requestedDate: '2026-07-03',
    completedDate: '2026-07-05',
    ratings: [
      { category: 'Technical ability', score: 92 },
      { category: 'Communication', score: 88 },
      { category: 'Reliability', score: 95 },
      { category: 'Collaboration', score: 90 },
    ],
    summary: 'Ananya was one of the strongest frontend engineers on my team. She led our design-system migration and mentored two junior engineers. Her code review standards raised the bar for the whole team.',
    wouldRehire: true,
  },
  {
    id: 'ref-2',
    applicationId: 'app-501',
    candidateName: 'Ananya Iyer',
    refereeName: 'Priyanka Das',
    refereeTitle: 'Senior Product Manager',
    refereeRelationship: 'Cross-functional partner (1.5 years)',
    status: 'completed',
    requestedDate: '2026-07-03',
    completedDate: '2026-07-06',
    ratings: [
      { category: 'Technical ability', score: 90 },
      { category: 'Communication', score: 93 },
      { category: 'Reliability', score: 91 },
      { category: 'Collaboration', score: 94 },
    ],
    summary: 'Ananya translated ambiguous product requirements into clean technical plans faster than anyone else I worked with. Always proactive about flagging risk early.',
    wouldRehire: true,
  },
  {
    id: 'ref-3',
    applicationId: 'app-502',
    candidateName: 'Vikram Malhotra',
    refereeName: 'Suresh Iyengar',
    refereeTitle: 'Director of Product',
    refereeRelationship: 'Skip-level manager (1 year)',
    status: 'sent',
    requestedDate: '2026-07-07',
  },
  {
    id: 'ref-4',
    applicationId: 'app-508',
    candidateName: 'Sneha Gupta',
    refereeName: 'Ritu Chawla',
    refereeTitle: 'VP of Product',
    refereeRelationship: 'Direct manager (2.5 years)',
    status: 'pending',
    requestedDate: '2026-07-09',
  },
];

// ----------------------------------------------------
// Aptitude / Psychometric Assessments
// ----------------------------------------------------

// ----------------------------------------------------
// Coding Vetting Problems
// ----------------------------------------------------

export interface CodingProblem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  description: string;
  constraints: string[];
  starterCode: {
    javascript: string;
    typescript: string;
    python: string;
    java: string;
    cpp: string;
  };
  testCases: {
    id: string;
    input: string;
    expectedOutput: string;
    description: string;
  }[];
}

export const mockCodingProblems: CodingProblem[] = [
  {
    id: 'virtualized-list',
    title: 'Virtualized List Window Calculator',
    difficulty: 'Medium',
    category: 'DOM/Frontend Systems',
    description: 'You are building a virtualized list library to render high-throughput item feeds in a viewport without layout shifts.\n\nGiven an array of integer `heights` representing the height in pixels of items in sequence, a viewport height `viewportHeight`, and the current vertical scroll position `scrollTop`, return a tuple/array `[startIndex, endIndex]` representing the indices of the items that must be active in the DOM.\n\nAn item is active if any part of it is within the scroll window `[scrollTop, scrollTop + viewportHeight]`. Assume the list starts at offset 0.',
    constraints: [
      '1 <= heights.length <= 10^5',
      '10 <= heights[i] <= 1000',
      '100 <= viewportHeight <= 2000',
      '0 <= scrollTop <= sum(heights)'
    ],
    starterCode: {
      javascript: `function getVisibleRange(heights, viewportHeight, scrollTop) {\n  // Implement visual virtual range bounds\n  return [0, 0];\n}`,
      typescript: `function getVisibleRange(heights: number[], viewportHeight: number, scrollTop: number): [number, number] {\n  // Implement visual virtual range bounds\n  return [0, 0];\n}`,
      python: `def get_visible_range(heights: list[int], viewport_height: int, scroll_top: int) -> list[int]:\n    # Implement visual virtual range bounds\n    return [0, 0]`,
      java: `class Solution {\n    public int[] getVisibleRange(int[] heights, int viewportHeight, int scrollTop) {\n        // Implement visual virtual range bounds\n        return new int[]{0, 0};\n    }\n}`,
      cpp: `class Solution {\npublic:\n    vector<int> getVisibleRange(vector<int>& heights, int viewportHeight, int scrollTop) {\n        // Implement visual virtual range bounds\n        return {0, 0};\n    }\n};`
    },
    testCases: [
      { id: 'tc-1', input: 'heights = [50, 50, 50, 50], viewportHeight = 100, scrollTop = 0', expectedOutput: '[0, 1]', description: 'Top of page load showing exactly first two elements' },
      { id: 'tc-2', input: 'heights = [40, 60, 50, 80, 50], viewportHeight = 120, scrollTop = 90', expectedOutput: '[1, 3]', description: 'Scrolled down past first element, displaying middle overlapping elements' },
      { id: 'tc-3', input: 'heights = [100, 200, 300], viewportHeight = 50, scrollTop = 350', expectedOutput: '[2, 2]', description: 'Small viewport centered inside final element height' }
    ]
  },
  {
    id: 'two-sum',
    title: 'Two Sum Vetting',
    difficulty: 'Easy',
    category: 'Algorithms/Arrays',
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.',
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.'
    ],
    starterCode: {
      javascript: `function twoSum(nums, target) {\n  // Write code\n  return [];\n}`,
      typescript: `function twoSum(nums: number[], target: number): number[] {\n  // Write code\n  return [];\n}`,
      python: `def two_sum(nums: list[int], target: int) -> list[int]:\n    # Write code\n    return []`,
      java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write code\n        return new int[]{};\n    }\n}`,
      cpp: `class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write code\n        return {};\n    }\n};`
    },
    testCases: [
      { id: 'tc-1', input: 'nums = [2, 7, 11, 15], target = 9', expectedOutput: '[0, 1]', description: 'First two elements sum up directly' },
      { id: 'tc-2', input: 'nums = [3, 2, 4], target = 6', expectedOutput: '[1, 2]', description: 'Later elements sum up with offset' },
      { id: 'tc-3', input: 'nums = [3, 3], target = 6', expectedOutput: '[0, 1]', description: 'Matching duplicate elements' }
    ]
  },
  {
    id: 'debounce-vetting',
    title: 'Debounce Callback Wrapper',
    difficulty: 'Medium',
    category: 'Frontend Systems',
    description: 'Given a function `fn` and a time in milliseconds `t`, return a debounced version of that function.\n\nA debounced function is a function whose execution is delayed by `t` milliseconds and whose execution is cancelled if it is called again within that window of time. The debounced function should also receive the passed parameters.\n\nFor example, if `t = 50ms`, and the function was called at `10ms`, `20ms`, and `35ms`, the actual call should be delayed to `85ms`.',
    constraints: [
      '0 <= t <= 1000',
      'fn is a valid function',
      'Arguments are passed correctly'
    ],
    starterCode: {
      javascript: `function debounce(fn, t) {\n  return function(...args) {\n    // Implement debounce wrapper\n  };\n}`,
      typescript: `function debounce<T extends (...args: any[]) => any>(fn: T, t: number) {\n  return function(...args: Parameters<T>) {\n    // Implement debounce wrapper\n  };\n}`,
      python: `import time\ndef debounce(fn, t_ms):\n    # Return a debounced closure function\n    pass`,
      java: `public class Debouncer {\n    // Implement debounce/throttle wrapper abstraction\n}`,
      cpp: `class Debouncer {\n    // Implement debounce wrapper\n};`
    },
    testCases: [
      { id: 'tc-1', input: 'fn = log, t = 50ms, calls = [10ms, 20ms]', expectedOutput: 'Single execution at 70ms', description: 'Double execution squashed into single trigger' },
      { id: 'tc-2', input: 'fn = log, t = 100ms, calls = [10ms, 120ms]', expectedOutput: 'Executes twice at 110ms and 220ms', description: 'Calls outside of debounce window executed separately' },
      { id: 'tc-3', input: 'fn = log, t = 200ms, calls = [10ms, 50ms, 90ms]', expectedOutput: 'Executes once at 290ms', description: 'Multiple fast clicks debounced to final keyup' }
    ]
  }
];

export interface AssessmentQuestion {
  id: string;
  type: 'multiple_choice' | 'numerical' | 'personality_scale';
  prompt: string;
  options?: string[];
  timeLimitSeconds: number;
}

export interface AssessmentResult {
  id: string;
  applicationId: string;
  candidateName: string;
  assessmentName: string;
  category: 'aptitude' | 'psychometric';
  status: 'not_started' | 'in_progress' | 'completed';
  completedDate?: string;
  durationMinutes: number;
  overallScore?: number;
  percentile?: number;
  sectionScores?: { section: string; score: number; benchmark: number }[];
  traits?: { trait: string; score: number; description: string }[];
}

export const mockAssessmentQuestions: AssessmentQuestion[] = [
  { id: 'aq-1', type: 'numerical', prompt: 'A delivery fleet completes 240 orders in 6 hours. At the same rate, how many orders complete in 9 hours?', options: ['320', '360', '340', '300'], timeLimitSeconds: 60 },
  { id: 'aq-2', type: 'multiple_choice', prompt: 'Which data structure gives O(1) average lookup time for key-value pairs?', options: ['Linked List', 'Hash Map', 'Binary Search Tree', 'Array'], timeLimitSeconds: 45 },
  { id: 'aq-3', type: 'numerical', prompt: 'If a checkout conversion rate improves from 2.5% to 3.0%, what is the relative percentage increase?', options: ['20%', '5%', '50%', '0.5%'], timeLimitSeconds: 60 },
  { id: 'aq-4', type: 'personality_scale', prompt: 'I prefer to resolve disagreements with teammates directly and immediately rather than escalate.', timeLimitSeconds: 30 },
  { id: 'aq-5', type: 'personality_scale', prompt: 'I feel energized when working under tight, ambiguous deadlines.', timeLimitSeconds: 30 },
];

export const mockAssessments: AssessmentResult[] = [
  {
    id: 'assess-1',
    applicationId: 'app-501',
    candidateName: 'Ananya Iyer',
    assessmentName: 'Frontend Engineering Aptitude Test',
    category: 'aptitude',
    status: 'completed',
    completedDate: '2026-07-03',
    durationMinutes: 28,
    overallScore: 91,
    percentile: 96,
    sectionScores: [
      { section: 'Logical Reasoning', score: 94, benchmark: 78 },
      { section: 'Data Structures', score: 90, benchmark: 75 },
      { section: 'Numerical Ability', score: 88, benchmark: 72 },
    ],
  },
  {
    id: 'assess-2',
    applicationId: 'app-501',
    candidateName: 'Ananya Iyer',
    assessmentName: 'Workplace Personality Profile',
    category: 'psychometric',
    status: 'completed',
    completedDate: '2026-07-03',
    durationMinutes: 12,
    traits: [
      { trait: 'Conscientiousness', score: 88, description: 'Highly organized, detail-oriented, follows through reliably on commitments.' },
      { trait: 'Collaboration', score: 82, description: 'Prefers direct, transparent communication and consensus-driven decisions.' },
      { trait: 'Adaptability', score: 79, description: 'Comfortable with ambiguity but prefers structured checkpoints.' },
      { trait: 'Resilience under pressure', score: 91, description: 'Maintains composure and output quality during tight deadlines.' },
    ],
  },
  {
    id: 'assess-3',
    applicationId: 'app-504',
    candidateName: 'Priya Patel',
    assessmentName: 'Frontend Engineering Aptitude Test',
    category: 'aptitude',
    status: 'in_progress',
    durationMinutes: 0,
  },
  {
    id: 'assess-4',
    applicationId: 'app-507',
    candidateName: 'Amit Verma',
    assessmentName: 'Full-Stack Engineering Aptitude Test',
    category: 'aptitude',
    status: 'not_started',
    durationMinutes: 0,
  },
];

// ----------------------------------------------------
// Live Coding / System Design / Panel Interview Rounds
// ----------------------------------------------------

export interface CodingTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  passed: boolean;
}

export interface InterviewRound {
  id: string;
  applicationId: string;
  candidateName: string;
  roundNumber: number;
  roundType: 'ai_voice_screen' | 'live_coding' | 'system_design' | 'panel' | 'take_home';
  title: string;
  status: 'not_started' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate?: string;
  durationMinutes: number;
  interviewers?: { name: string; title: string; avatar: string }[];
  score?: number;
  feedback?: string;
  codingProblem?: {
    title: string;
    prompt: string;
    starterCode: string;
    language: string;
    testCases: CodingTestCase[];
    candidateCode: string;
  };
  systemDesignPrompt?: string;
  systemDesignNotes?: string;
  panelFeedback?: { interviewer: string; rating: number; comment: string }[];
}

export const mockInterviewRounds: InterviewRound[] = [
  {
    id: 'round-1',
    applicationId: 'app-501',
    candidateName: 'Ananya Iyer',
    roundNumber: 1,
    roundType: 'ai_voice_screen',
    title: 'AI Voice Screening',
    status: 'completed',
    scheduledDate: '2026-07-02',
    durationMinutes: 25,
    score: 89,
    feedback: 'Strong technical communication and structured problem decomposition.',
  },
  {
    id: 'round-2',
    applicationId: 'app-501',
    candidateName: 'Ananya Iyer',
    roundNumber: 2,
    roundType: 'live_coding',
    title: 'Live Coding — Frontend Data Structures',
    status: 'completed',
    scheduledDate: '2026-07-06',
    durationMinutes: 45,
    score: 94,
    feedback: 'Clean, idiomatic solution. Identified the O(n log n) approach immediately and reasoned about edge cases without prompting.',
    codingProblem: {
      title: 'Virtualized List Window Calculator',
      prompt: 'Given a list of item heights and a viewport height, write a function that returns the indices of items currently visible in the viewport for a given scroll offset.',
      language: 'typescript',
      starterCode: `function getVisibleRange(heights: number[], viewportHeight: number, scrollTop: number): [number, number] {\n  // your code here\n}`,
      candidateCode: `function getVisibleRange(heights: number[], viewportHeight: number, scrollTop: number): [number, number] {\n  let offset = 0;\n  let start = -1;\n  let end = heights.length - 1;\n  for (let i = 0; i < heights.length; i++) {\n    if (offset + heights[i] > scrollTop && start === -1) start = i;\n    if (offset > scrollTop + viewportHeight) { end = i - 1; break; }\n    offset += heights[i];\n  }\n  return [Math.max(start, 0), end];\n}`,
      testCases: [
        { id: 'tc-1', input: '[40,40,40,40,40], viewport=100, scrollTop=0', expectedOutput: '[0, 2]', passed: true },
        { id: 'tc-2', input: '[40,40,40,40,40], viewport=100, scrollTop=80', expectedOutput: '[2, 4]', passed: true },
        { id: 'tc-3', input: '[100], viewport=50, scrollTop=0', expectedOutput: '[0, 0]', passed: true },
      ],
    },
  },
  {
    id: 'round-3',
    applicationId: 'app-501',
    candidateName: 'Ananya Iyer',
    roundNumber: 3,
    roundType: 'system_design',
    title: 'System Design — Checkout Rendering Pipeline',
    status: 'completed',
    scheduledDate: '2026-07-08',
    durationMinutes: 50,
    score: 87,
    feedback: 'Solid high-level architecture with a reasonable caching strategy; slightly underexplored failure modes for the payment retry queue.',
    systemDesignPrompt: 'Design a client-side rendering pipeline for a food delivery checkout page that must render in under 200ms on 3G, handle real-time price/coupon updates, and gracefully degrade if the pricing microservice is slow.',
    systemDesignNotes: 'Candidate proposed: (1) server-rendered shell + streaming SSR for above-the-fold content, (2) optimistic price updates with a reconciliation pass once the pricing service responds, (3) a stale-while-revalidate cache layer keyed by cart hash, (4) skeleton states with a 3s timeout fallback to last-known-good price.',
  },
  {
    id: 'round-4',
    applicationId: 'app-501',
    candidateName: 'Ananya Iyer',
    roundNumber: 4,
    roundType: 'panel',
    title: 'Panel Interview — Engineering Leadership',
    status: 'completed',
    scheduledDate: '2026-07-10',
    durationMinutes: 60,
    interviewers: [
      { name: 'Karthik Rajan', title: 'Engineering Director', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150' },
      { name: 'Meera Nambiar', title: 'Staff Engineer', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' },
      { name: 'Farhan Sheikh', title: 'Design Lead', avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=150' },
    ],
    score: 90,
    panelFeedback: [
      { interviewer: 'Karthik Rajan', rating: 92, comment: 'Excellent ownership mindset. Would trust her to lead a cross-team migration unsupervised.' },
      { interviewer: 'Meera Nambiar', rating: 90, comment: 'Deep technical fluency, gives credit to collaborators generously.' },
      { interviewer: 'Farhan Sheikh', rating: 88, comment: 'Strong design sensibility for an engineer — asked sharp questions about accessibility tradeoffs.' },
    ],
  },
  {
    id: 'round-5',
    applicationId: 'app-503',
    candidateName: 'Rohan Deshmukh',
    roundNumber: 1,
    roundType: 'ai_voice_screen',
    title: 'AI Voice Screening',
    status: 'scheduled',
    scheduledDate: '2026-07-12',
    durationMinutes: 25,
  },
  {
    id: 'round-6',
    applicationId: 'app-506',
    candidateName: 'Aditi Rao',
    roundNumber: 2,
    roundType: 'take_home',
    title: 'Take-Home — Ledger Reconciliation Service',
    status: 'in_progress',
    scheduledDate: '2026-07-09',
    durationMinutes: 0,
  },
];

// ----------------------------------------------------
// Async One-Way Video Screening & Take-Home Projects
// ----------------------------------------------------

export interface AsyncVideoResponse {
  questionId: string;
  question: string;
  videoUrl: string;
  durationSeconds: number;
  attempts: number;
  aiSummary: string;
}

export interface AsyncScreening {
  id: string;
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  status: 'invited' | 'in_progress' | 'submitted' | 'reviewed';
  invitedDate: string;
  submittedDate?: string;
  deadline: string;
  responses: AsyncVideoResponse[];
  reviewScore?: number;
  reviewerNotes?: string;
}

export const mockAsyncScreenings: AsyncScreening[] = [
  {
    id: 'async-1',
    applicationId: 'app-511',
    candidateName: 'Neha Sharma',
    jobTitle: 'Frontend Engineer — Seller Portal',
    status: 'submitted',
    invitedDate: '2026-07-04',
    submittedDate: '2026-07-06',
    deadline: '2026-07-08',
    responses: [
      { questionId: 'vq-1', question: 'Walk us through a time you had to optimize a UI for very low-end devices or slow networks.', videoUrl: '/mock-video-response.mp4', durationSeconds: 118, attempts: 2, aiSummary: 'Candidate described reducing bundle size via route-level code splitting and replacing heavy chart libraries with lightweight SVG components for a tier-3 city seller dashboard.' },
      { questionId: 'vq-2', question: 'How do you approach accessibility for users who may be first-time smartphone owners?', videoUrl: '/mock-video-response.mp4', durationSeconds: 95, attempts: 1, aiSummary: 'Emphasized large tap targets, iconography paired with text labels, and voice-guided onboarding flows tested with non-technical users.' },
    ],
    reviewScore: 84,
    reviewerNotes: 'Clear communicator, grounded in real low-end-device constraints. Good culture fit for the Seller Portal team.',
  },
  {
    id: 'async-2',
    applicationId: 'app-512',
    candidateName: 'Rahul Nair',
    jobTitle: 'Staff Infrastructure Engineer',
    status: 'invited',
    invitedDate: '2026-07-09',
    deadline: '2026-07-13',
    responses: [],
  },
];

export interface TakeHomeProject {
  id: string;
  applicationId: string;
  candidateName: string;
  title: string;
  description: string;
  status: 'assigned' | 'in_progress' | 'submitted' | 'graded';
  assignedDate: string;
  dueDate: string;
  submittedDate?: string;
  repoUrl?: string;
  rubric: { criterion: string; weight: number; score?: number }[];
  overallScore?: number;
  reviewerNotes?: string;
}

export const mockTakeHomeProjects: TakeHomeProject[] = [
  {
    id: 'takehome-1',
    applicationId: 'app-506',
    candidateName: 'Aditi Rao',
    title: 'Ledger Reconciliation Service',
    description: 'Build a small service that ingests two transaction ledgers (JSON) and outputs a reconciliation report identifying mismatched, missing, and duplicate entries, with tests.',
    status: 'in_progress',
    assignedDate: '2026-07-09',
    dueDate: '2026-07-14',
    rubric: [
      { criterion: 'Correctness of reconciliation logic', weight: 40 },
      { criterion: 'Test coverage', weight: 25 },
      { criterion: 'Code clarity & structure', weight: 20 },
      { criterion: 'Edge case handling', weight: 15 },
    ],
  },
  {
    id: 'takehome-2',
    applicationId: 'app-507',
    candidateName: 'Amit Verma',
    title: 'Billing Webhook Ingestion Pipeline',
    description: 'Design and implement an idempotent webhook ingestion endpoint that handles out-of-order and duplicate billing events.',
    status: 'graded',
    assignedDate: '2026-06-25',
    dueDate: '2026-06-30',
    submittedDate: '2026-06-29',
    repoUrl: 'https://github.com/amitverma/billing-webhook-pipeline',
    rubric: [
      { criterion: 'Correctness of reconciliation logic', weight: 40, score: 34 },
      { criterion: 'Test coverage', weight: 25, score: 20 },
      { criterion: 'Code clarity & structure', weight: 20, score: 18 },
      { criterion: 'Edge case handling', weight: 15, score: 10 },
    ],
    overallScore: 82,
    reviewerNotes: 'Solid idempotency key design using event hash + timestamp bucket. Missed a race condition edge case under concurrent duplicate delivery.',
  },
];

// ----------------------------------------------------
// Talent Pool / Sourcing CRM
// ----------------------------------------------------

export interface TalentPoolCandidate {
  id: string;
  name: string;
  avatar: string;
  currentTitle: string;
  currentCompany: string;
  location: string;
  skills: string[];
  source: 'LinkedIn' | 'Referral' | 'GitHub' | 'Job Board' | 'Conference' | 'Inbound';
  sourcedDate: string;
  tags: string[];
  status: 'new' | 'contacted' | 'responded' | 'in_pipeline' | 'not_interested' | 'silver_medalist';
  matchScore: number;
  notes?: string;
  lastContactDate?: string;
}

export const mockTalentPool: TalentPoolCandidate[] = [
  { id: 'tp-1', name: 'Ishaan Kapoor', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', currentTitle: 'Senior DevOps Engineer', currentCompany: 'Freshworks', location: 'Chennai, TN', skills: ['Kubernetes', 'Terraform', 'AWS', 'Go'], source: 'LinkedIn', sourcedDate: '2026-06-20', tags: ['DevOps Engineer', 'High priority'], status: 'contacted', matchScore: 88, lastContactDate: '2026-06-22' },
  { id: 'tp-2', name: 'Meghana Reddy', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', currentTitle: 'Staff Software Engineer', currentCompany: 'Uber', location: 'Bengaluru, KA', skills: ['Distributed Systems', 'Go', 'Kafka'], source: 'Referral', sourcedDate: '2026-06-15', tags: ['Backend', 'Referral by Karthik R.'], status: 'in_pipeline', matchScore: 94, notes: 'Referred for Staff Infrastructure Engineer role. Strong system design background.', lastContactDate: '2026-07-01' },
  { id: 'tp-3', name: 'Yash Oberoi', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', currentTitle: 'Frontend Engineer', currentCompany: 'CRED', location: 'Bengaluru, KA', skills: ['React', 'TypeScript', 'Design Systems'], source: 'GitHub', sourcedDate: '2026-07-01', tags: ['Frontend'], status: 'new', matchScore: 79 },
  { id: 'tp-4', name: 'Divya Shastri', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150', currentTitle: 'Data Scientist', currentCompany: 'Myntra', location: 'Bengaluru, KA', skills: ['NLP', 'Python', 'MLOps'], source: 'Conference', sourcedDate: '2026-05-28', tags: ['ML', 'PyData 2026 speaker'], status: 'responded', matchScore: 85, lastContactDate: '2026-06-30' },
  { id: 'tp-5', name: 'Vikram Malhotra', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', currentTitle: 'Senior Product Manager', currentCompany: 'PhonePe', location: 'Bengaluru, KA', skills: ['Payments', 'Growth', 'A/B Testing'], source: 'Job Board', sourcedDate: '2026-06-10', tags: ['Silver medalist — Razorpay PM req'], status: 'silver_medalist', matchScore: 82, notes: 'Held for review on job-102; strong candidate, keep warm for future PM openings.' },
  { id: 'tp-6', name: 'Anjali Bhatt', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150', currentTitle: 'Engineering Manager', currentCompany: 'Groww', location: 'Bengaluru, KA', skills: ['Leadership', 'Node.js', 'System Design'], source: 'Inbound', sourcedDate: '2026-07-05', tags: ['EM pipeline'], status: 'new', matchScore: 76 },
];

// ----------------------------------------------------
// Interview Question Bank
// ----------------------------------------------------

export interface QuestionBankItem {
  id: string;
  question: string;
  category: 'technical' | 'behavioral' | 'system_design' | 'coding' | 'culture_fit';
  role: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  usageCount: number;
  avgScore: number;
  idealAnswerNotes: string;
  createdBy: string;
}

export const mockQuestionBank: QuestionBankItem[] = [
  { id: 'qb-1', question: 'How would you design a rate limiter for a public API handling 50k requests/sec?', category: 'system_design', role: 'Backend Engineer', difficulty: 'hard', tags: ['scalability', 'distributed systems'], usageCount: 34, avgScore: 74, idealAnswerNotes: 'Look for token bucket / sliding window discussion, distributed counter consistency tradeoffs (Redis vs local), and graceful degradation under overload.', createdBy: 'Karthik Rajan' },
  { id: 'qb-2', question: 'Tell me about a time you disagreed with a product decision. How did you handle it?', category: 'behavioral', role: 'All roles', difficulty: 'medium', tags: ['communication', 'conflict resolution'], usageCount: 58, avgScore: 81, idealAnswerNotes: 'Strong answers show structured escalation, data-backed reasoning, and a resolution that preserved the relationship.', createdBy: 'Priyanka Das' },
  { id: 'qb-3', question: 'Reverse a linked list in-place. Then explain the time/space complexity.', category: 'coding', role: 'Software Engineer', difficulty: 'easy', tags: ['data structures', 'fundamentals'], usageCount: 112, avgScore: 88, idealAnswerNotes: 'Expect O(n) time, O(1) space iterative solution with clear pointer-swapping explanation.', createdBy: 'Meera Nambiar' },
  { id: 'qb-4', question: 'Walk through how you would debug a memory leak in a long-running Node.js service.', category: 'technical', role: 'Backend Engineer', difficulty: 'medium', tags: ['debugging', 'node.js'], usageCount: 41, avgScore: 71, idealAnswerNotes: 'Look for heap snapshot comparison, --inspect usage, and identification of common leak sources (closures, timers, event listeners).', createdBy: 'Karthik Rajan' },
  { id: 'qb-5', question: 'What does great collaboration with design and product look like to you?', category: 'culture_fit', role: 'Frontend Engineer', difficulty: 'easy', tags: ['collaboration'], usageCount: 67, avgScore: 85, idealAnswerNotes: 'Look for proactive communication, willingness to push back with rationale, and respect for design intent.', createdBy: 'Farhan Sheikh' },
  { id: 'qb-6', question: 'Design the data model and API for a multi-tenant SaaS billing system with usage-based pricing.', category: 'system_design', role: 'Staff Engineer', difficulty: 'hard', tags: ['billing', 'multi-tenancy'], usageCount: 19, avgScore: 68, idealAnswerNotes: 'Strong answers separate tenant isolation strategy, metering pipeline, and reconciliation against payment provider webhooks.', createdBy: 'Meera Nambiar' },
];

// ----------------------------------------------------
// Post-Hire Onboarding Tracker
// ----------------------------------------------------

export interface OnboardingTask {
  id: string;
  title: string;
  category: 'paperwork' | 'equipment' | 'access' | 'training' | 'social';
  owner: 'HR' | 'IT' | 'Manager' | 'New Hire';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
}

export interface OnboardingRecord {
  id: string;
  applicationId: string;
  candidateName: string;
  candidateAvatar: string;
  jobTitle: string;
  orgName: string;
  startDate: string;
  buddyName: string;
  managerName: string;
  progressPercent: number;
  tasks: OnboardingTask[];
}

export const mockOnboarding: OnboardingRecord[] = [
  {
    id: 'onboard-1',
    applicationId: 'app-505',
    candidateName: 'Aarav Sharma',
    candidateAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    jobTitle: 'Product Manager — Payments Flow',
    orgName: 'Razorpay',
    startDate: '2026-08-01',
    buddyName: 'Sanya Kapoor',
    managerName: 'Priyanka Das',
    progressPercent: 62,
    tasks: [
      { id: 'ot-1', title: 'Sign employment contract & NDA', category: 'paperwork', owner: 'New Hire', status: 'completed', dueDate: '2026-07-10' },
      { id: 'ot-2', title: 'Submit ID proof & bank details', category: 'paperwork', owner: 'New Hire', status: 'completed', dueDate: '2026-07-15' },
      { id: 'ot-3', title: 'Provision laptop & peripherals', category: 'equipment', owner: 'IT', status: 'completed', dueDate: '2026-07-25' },
      { id: 'ot-4', title: 'Grant Slack, email, and Jira access', category: 'access', owner: 'IT', status: 'in_progress', dueDate: '2026-07-30' },
      { id: 'ot-5', title: 'Complete compliance & security training', category: 'training', owner: 'New Hire', status: 'pending', dueDate: '2026-08-05' },
      { id: 'ot-6', title: 'Schedule 1:1 intro meetings with core team', category: 'social', owner: 'Manager', status: 'pending', dueDate: '2026-08-03' },
      { id: 'ot-7', title: 'Assign onboarding buddy', category: 'social', owner: 'HR', status: 'completed', dueDate: '2026-07-20' },
    ],
  },
  {
    id: 'onboard-2',
    applicationId: 'app-509',
    candidateName: 'Devendra Kumar',
    candidateAvatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150',
    jobTitle: 'Lead Data Scientist — AI Assistant',
    orgName: 'Zoho',
    startDate: '2026-08-20',
    buddyName: 'Ramesh Iyer',
    managerName: 'Lakshmi Venkat',
    progressPercent: 14,
    tasks: [
      { id: 'ot-8', title: 'Sign employment contract & NDA', category: 'paperwork', owner: 'New Hire', status: 'completed', dueDate: '2026-07-28' },
      { id: 'ot-9', title: 'Submit ID proof & bank details', category: 'paperwork', owner: 'New Hire', status: 'pending', dueDate: '2026-08-01' },
      { id: 'ot-10', title: 'Provision GPU workstation access', category: 'equipment', owner: 'IT', status: 'pending', dueDate: '2026-08-15' },
      { id: 'ot-11', title: 'Grant model registry & data warehouse access', category: 'access', owner: 'IT', status: 'pending', dueDate: '2026-08-18' },
      { id: 'ot-12', title: 'Assign onboarding buddy', category: 'social', owner: 'HR', status: 'pending', dueDate: '2026-08-10' },
    ],
  },
];

// ----------------------------------------------------
// Public Candidate Portfolio Pages
// ----------------------------------------------------

export interface PortfolioProject {
  title: string;
  description: string;
  tags: string[];
  link?: string;
}

export interface CandidatePortfolio {
  slug: string;
  applicationId: string;
  name: string;
  avatar: string;
  headline: string;
  location: string;
  bio: string;
  skills: string[];
  yearsExperience: number;
  achievements: string[];
  projects: PortfolioProject[];
  verifiedScores: { label: string; score: number }[];
  socialLinks: { label: string; url: string }[];
  isPublic: boolean;
}

export const mockPortfolios: CandidatePortfolio[] = [
  {
    slug: 'ananya-iyer',
    applicationId: 'app-501',
    name: 'Ananya Iyer',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    headline: 'Senior Frontend Engineer — Performance & Design Systems',
    location: 'Bengaluru, KA',
    bio: 'I build fast, accessible interfaces at scale. Previously led the design-system migration at my last company and specialize in rendering performance for high-traffic consumer apps.',
    skills: ['React', 'Next.js', 'TypeScript', 'Web Performance Optimization', 'CSS Architecture', 'Webpack/Vite'],
    yearsExperience: 6,
    achievements: [
      'Reduced checkout page CLS by 78% through layout-stability engineering',
      'Led migration of 40+ component design system to a token-based architecture',
      'Mentored 3 junior engineers into mid-level roles',
    ],
    projects: [
      { title: 'Virtualized Menu Renderer', description: 'Open-source virtualization library handling 100k+ nested list items with sub-16ms frame times.', tags: ['React', 'Performance'], link: 'https://github.com/ananyaiyer/virtual-menu' },
      { title: 'Design Token Pipeline', description: 'Automated pipeline syncing Figma tokens to Tailwind config across 6 product surfaces.', tags: ['Design Systems', 'Tooling'] },
    ],
    verifiedScores: [
      { label: 'Technical Assessment (AI-verified)', score: 92 },
      { label: 'Communication', score: 85 },
      { label: 'System Design', score: 87 },
    ],
    socialLinks: [
      { label: 'GitHub', url: 'https://github.com/ananyaiyer' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/ananyaiyer' },
    ],
    isPublic: true,
  },
  {
    slug: 'rohan-deshmukh',
    applicationId: 'app-503',
    name: 'Rohan Deshmukh',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    headline: 'Frontend Engineer — Consumer Web',
    location: 'Bengaluru, KA',
    bio: 'Frontend engineer focused on building resilient, accessible web experiences for high-growth consumer products.',
    skills: ['React', 'TypeScript', 'Accessibility', 'Testing'],
    yearsExperience: 4,
    achievements: ['Shipped WCAG 2.1 AA compliance across the core checkout funnel'],
    projects: [
      { title: 'A11y Audit Toolkit', description: 'Internal CLI that scans component libraries for accessibility regressions in CI.', tags: ['Accessibility', 'CLI'] },
    ],
    verifiedScores: [
      { label: 'Technical Assessment (AI-verified)', score: 80 },
    ],
    socialLinks: [
      { label: 'GitHub', url: 'https://github.com/rohandeshmukh' },
    ],
    isPublic: true,
  },
];

// ----------------------------------------------------
// Talent-Similarity / Success-Predictor
// ----------------------------------------------------

export interface SimilarCandidate {
  applicationId: string;
  name: string;
  avatar: string;
  similarityScore: number;
  outcome: 'hired_success' | 'hired_underperformed' | 'rejected' | 'in_progress';
  sharedTraits: string[];
  jobTitle: string;
  orgName: string;
}

export interface SuccessPrediction {
  applicationId: string;
  successProbability: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  contributingFactors: { factor: string; impact: 'positive' | 'negative'; weight: number }[];
  similarCandidates: SimilarCandidate[];
  retentionForecast12mo: number;
  performanceForecast: 'top_performer' | 'strong' | 'average' | 'risk';
}

export const mockSuccessPredictions: SuccessPrediction[] = [
  {
    applicationId: 'app-501',
    successProbability: 91,
    confidenceLevel: 'high',
    contributingFactors: [
      { factor: 'Technical assessment score in top 5% of historical hires for this role', impact: 'positive', weight: 32 },
      { factor: 'System design reasoning matches pattern of high-retention senior engineers', impact: 'positive', weight: 24 },
      { factor: 'Consistent scoring across all 4 interview rounds (low variance)', impact: 'positive', weight: 20 },
      { factor: 'No prior experience in food-delivery domain specifically', impact: 'negative', weight: 8 },
    ],
    similarCandidates: [
      { applicationId: 'sim-hist-1', name: 'Karthik Subramaniam', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150', similarityScore: 94, outcome: 'hired_success', sharedTraits: ['React performance specialization', 'Design system leadership', 'High interview score consistency'], jobTitle: 'Senior Frontend Engineer', orgName: 'Swiggy' },
      { applicationId: 'sim-hist-2', name: 'Nisha Verghese', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150', similarityScore: 89, outcome: 'hired_success', sharedTraits: ['Consumer web scale experience', 'Strong system design scores'], jobTitle: 'Senior Frontend Engineer', orgName: 'Flipkart' },
      { applicationId: 'sim-hist-3', name: 'Arjun Bose', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', similarityScore: 81, outcome: 'hired_underperformed', sharedTraits: ['High technical score'], jobTitle: 'Senior Frontend Engineer', orgName: 'Meesho' },
    ],
    retentionForecast12mo: 88,
    performanceForecast: 'top_performer',
  },
  {
    applicationId: 'app-502',
    successProbability: 64,
    confidenceLevel: 'medium',
    contributingFactors: [
      { factor: 'Strong communication scores across rounds', impact: 'positive', weight: 22 },
      { factor: 'Composite score sits just below the auto-advance threshold', impact: 'negative', weight: 18 },
      { factor: 'Limited payments-domain specific examples in responses', impact: 'negative', weight: 14 },
    ],
    similarCandidates: [
      { applicationId: 'sim-hist-4', name: 'Tanvi Ghosh', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', similarityScore: 77, outcome: 'hired_success', sharedTraits: ['PM with strong communication', 'Cross-functional leadership'], jobTitle: 'Product Manager', orgName: 'PhonePe' },
      { applicationId: 'sim-hist-5', name: 'Rakesh Pillai', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', similarityScore: 70, outcome: 'rejected', sharedTraits: ['Composite score near threshold'], jobTitle: 'Product Manager', orgName: 'CRED' },
    ],
    retentionForecast12mo: 71,
    performanceForecast: 'average',
  },
];

// ----------------------------------------------------
// AI Candidate Highlight Reel
// ----------------------------------------------------

export interface HighlightClip {
  id: string;
  applicationId: string;
  timestamp: string;
  durationSeconds: number;
  label: string;
  question: string;
  transcriptSnippet: string;
  score: number;
  tag: 'strongest_answer' | 'technical_depth' | 'communication' | 'problem_solving';
}

export const mockHighlightClips: HighlightClip[] = [
  { id: 'clip-1', applicationId: 'app-501', timestamp: '03:12', durationSeconds: 42, label: 'Virtualized rendering explanation', question: 'How would you optimize list rendering for a food delivery menu containing thousands of nested items?', transcriptSnippet: 'I would implement windowed list rendering using react-window or custom virtualization...', score: 95, tag: 'technical_depth' },
  { id: 'clip-2', applicationId: 'app-501', timestamp: '08:47', durationSeconds: 35, label: 'CLS debugging walkthrough', question: 'Describe how you would debug a layout shift (CLS) bottleneck on the Swiggy checkout page.', transcriptSnippet: 'I would use the Chrome DevTools Performance panel or Web Vitals library to isolate the layout shift occurrences...', score: 88, tag: 'problem_solving' },
  { id: 'clip-3', applicationId: 'app-501', timestamp: '14:02', durationSeconds: 28, label: 'Concise, structured delivery', question: 'How do you prioritize performance work against feature delivery?', transcriptSnippet: 'I frame it as a budget — every feature gets a performance budget at design time, so it is never an afterthought...', score: 91, tag: 'communication' },
  { id: 'clip-4', applicationId: 'app-501', timestamp: '19:30', durationSeconds: 40, label: 'Strongest answer of the session', question: 'Walk us through the hardest performance bug you have fixed.', transcriptSnippet: 'We had a memory leak from a detached DOM tree caused by a stale event listener closure in our infinite scroll component...', score: 97, tag: 'strongest_answer' },
];

export function getStoredJobs(): Job[] {
  if (typeof window === 'undefined') {
    return mockJobs.map(job => {
      const j = { ...job };
      if (!j.stages) {
        j.stages = ['screening', 'assessment', 'voice_screen', 'decision'];
      }
      if (!j.assessmentConfig) {
        j.assessmentConfig = {
          mcqCount: 5,
          codingProblemId: 'virtualized-list',
          passingScore: 80
        };
      }
      return j;
    });
  }
  
  const custom = localStorage.getItem('custom_jobs');
  const customList: Job[] = custom ? JSON.parse(custom) : [];
  
  const merged = [...mockJobs];
  customList.forEach(cj => {
    const idx = merged.findIndex(mj => mj.id === cj.id);
    if (idx !== -1) {
      merged[idx] = cj;
    } else {
      merged.push(cj);
    }
  });
  
  return merged.map(job => {
    const j = { ...job };
    if (!j.stages) {
      j.stages = ['screening', 'assessment', 'voice_screen', 'decision'];
    }
    if (!j.assessmentConfig) {
      j.assessmentConfig = {
        mcqCount: 5,
        codingProblemId: 'virtualized-list',
        passingScore: 80
      };
    }
    return j;
  });
}

export function saveStoredJob(job: Job) {
  if (typeof window === 'undefined') return;
  const custom = localStorage.getItem('custom_jobs');
  const customList: Job[] = custom ? JSON.parse(custom) : [];
  const idx = customList.findIndex(cj => cj.id === job.id);
  if (idx !== -1) {
    customList[idx] = job;
  } else {
    customList.push(job);
  }
  localStorage.setItem('custom_jobs', JSON.stringify(customList));
}
