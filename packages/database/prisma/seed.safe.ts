import path from 'path';
import dotenv from 'dotenv';
import { Client as PgClient } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient, Prisma } from '../src/generated/prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const connectionString = process.env.DATABASE_URL;

interface SafetyValidationResult {
  sanitizedUrl: string;
  host: string;
  database: string;
}

/**
 * Validates development safety guarantees before executing any database operation.
 * Prevents accidental execution against production databases, unapproved hosts, or when safety flags are missing.
 */
function validateDatabaseSafety(rawConnectionString?: string): SafetyValidationResult {
  if (!rawConnectionString) {
    throw new Error('⛔ SAFETY VIOLATION: DATABASE_URL is not set. Load dotenv before seeding.');
  }

  // 1. Mandatory explicit opt-in flag
  if (process.env.DEMO_SEED_ENABLED !== 'true') {
    throw new Error(
      '⛔ SAFETY VIOLATION: DEMO_SEED_ENABLED=true is required to execute safe seed.\n' +
      '   To run safely in development, set the environment variable: DEMO_SEED_ENABLED=true\n' +
      '   Example (PowerShell): $env:DEMO_SEED_ENABLED="true"; npm run seed:safe\n' +
      '   Example (Bash):       DEMO_SEED_ENABLED=true npm run seed:safe'
    );
  }

  // 2. Strict rejection of NODE_ENV=production
  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
  if (nodeEnv === 'production') {
    throw new Error(
      '⛔ SAFETY VIOLATION: Seed script cannot be executed when NODE_ENV is set to "production".'
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(rawConnectionString);
  } catch {
    throw new Error('⛔ SAFETY VIOLATION: Invalid DATABASE_URL format.');
  }

  const hostname = parsed.hostname.toLowerCase();
  const dbName = parsed.pathname.replace(/^\//, '').toLowerCase();

  // 3. Strict rejection of production keywords in host or database name (always enforced)
  const PROD_KEYWORDS = ['prod', 'production', 'live', 'master'];
  for (const kw of PROD_KEYWORDS) {
    if (dbName.includes(kw) || hostname.includes(kw)) {
      throw new Error(
        `⛔ CRITICAL SAFETY VIOLATION: Database target ("${hostname}/${dbName}") contains production identifier. Execution permanently blocked.`
      );
    }
  }

  // 4. Localhost vs. Explicitly Approved Development Host allowlist
  const LOCAL_DEV_HOSTS = ['localhost', '127.0.0.1', '::1', 'host.docker.internal'];
  const isLocalHost = LOCAL_DEV_HOSTS.includes(hostname) || hostname.endsWith('.local');

  // Parse explicit remote host allowlist (comma-separated list of approved hostnames)
  const rawHostAllowlist = process.env.APPROVED_DEV_HOSTS || '';
  const approvedHosts = rawHostAllowlist
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  const isExplicitlyApprovedHost = approvedHosts.includes(hostname);

  if (!isLocalHost && !isExplicitlyApprovedHost) {
    throw new Error(
      `⛔ SAFETY VIOLATION: Database host "${hostname}" is not an approved development host.\n` +
      `   Permitted local hosts: ${LOCAL_DEV_HOSTS.join(', ')}\n` +
      '   To allow an approved remote development database, specify its exact hostname in APPROVED_DEV_HOSTS\n' +
      `   (e.g., APPROVED_DEV_HOSTS="${hostname}").\n` +
      '   Generic bypass flags are disabled to protect production environments.'
    );
  }

  // Optional: Explicit database name allowlist if configured
  const rawDbAllowlist = process.env.APPROVED_DEV_DATABASES || '';
  const approvedDbs = rawDbAllowlist
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  if (approvedDbs.length > 0 && !approvedDbs.includes(dbName)) {
    throw new Error(
      `⛔ SAFETY VIOLATION: Database "${dbName}" is not in the approved database allowlist (APPROVED_DEV_DATABASES).\n` +
      `   Approved databases: ${approvedDbs.join(', ')}`
    );
  }

  // 5. Sanitized URL for secure, credential-free logging
  const sanitized = new URL(rawConnectionString);
  if (sanitized.username) sanitized.username = '***';
  if (sanitized.password) sanitized.password = '***';

  return {
    sanitizedUrl: sanitized.toString(),
    host: hostname,
    database: dbName,
  };
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString || '' }) });

const DEFAULT_PASSWORD = '123456789';
const SEED_LOCK_ID = 20261116; // Deterministic 64-bit integer advisory lock key
const DEMO_RESUME_URL =
  process.env.DEMO_RESUME_URL ||
  'https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/learning/helloworld.pdf';

type Rng = () => number;
function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng: Rng = mulberry32(20260811);

function randInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return rng() * (max - min) + min;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function randomPastDate(minDaysAgo: number, maxDaysAgo: number): Date {
  const d = new Date(Date.now() - randFloat(minDaysAgo, maxDaysAgo + 1) * 24 * 60 * 60 * 1000);
  d.setHours(randInt(8, 20), randInt(0, 59), randInt(0, 59), 0);
  return d;
}

function avatarUrl(seed: string): string {
  return `https://images.unsplash.com/photo-${seed}?w=200&h=200&fit=crop&crop=faces`;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '.');
}

interface CompanyDef {
  name: string;
  industry: string;
  size: string;
  domain: string;
  logoSeed: string;
  tagline: string;
  cultureNotes: string;
  hrTeamSize: number;
  settings: {
    autoOfferEnabled: boolean;
    defaultThreshold: number;
    defaultVoice: string;
    domain: string;
    hiringSlack: string;
  };
}

const COMPANIES: CompanyDef[] = [
  {
    name: 'RazorFlow Technologies',
    industry: 'High-Throughput Fintech & Payment Infrastructure',
    size: '1000+ employees',
    domain: 'razorflow.io',
    logoSeed: '1618005182384-a83a8bd57fbe',
    tagline: 'Powering real-time global and domestic payments',
    cultureNotes:
      'RazorFlow operates mission-critical payment rails across India and Southeast Asia. We value extreme system reliability, distributed consensus, low-latency microservices, and radical transparency.',
    hrTeamSize: 1,
    settings: {
      autoOfferEnabled: true,
      defaultThreshold: 82,
      defaultVoice: 'Serena',
      domain: 'razorflow.io',
      hiringSlack: '#razorflow-talent',
    },
  },
  {
    name: 'NexusCloud Labs',
    industry: 'Enterprise Cloud Infrastructure & Distributed AI',
    size: '500-1000 employees',
    domain: 'nexuscloud.io',
    logoSeed: '1620712943543-bcc4688e7485',
    tagline: 'Next-generation cloud orchestrator for AI workloads',
    cultureNotes:
      'NexusCloud builds multi-cloud orchestration and serverless GPU clusters. Engineering-first culture with deep contributions to open-source Kubernetes and Rust ecosystem.',
    hrTeamSize: 1,
    settings: {
      autoOfferEnabled: false,
      defaultThreshold: 85,
      defaultVoice: 'Alloy',
      domain: 'nexuscloud.io',
      hiringSlack: '#nexus-hiring',
    },
  },
  {
    name: 'ZomatoScale QuickCommerce',
    industry: 'Hyperlocal Logistics & E-Commerce Platform',
    size: '1000+ employees',
    domain: 'zomatoscale.tech',
    logoSeed: '1561716516-b0b1c9f7e5a0',
    tagline: 'Sub-10 minute delivery at national scale',
    cultureNotes:
      'High-velocity shipping culture. We run massive real-time dispatch systems, route optimization algorithms, and fault-tolerant mobile apps supporting millions of daily active orders.',
    hrTeamSize: 1,
    settings: {
      autoOfferEnabled: true,
      defaultThreshold: 80,
      defaultVoice: 'Nova',
      domain: 'zomatoscale.tech',
      hiringSlack: '#zomato-talent',
    },
  },
  {
    name: 'Google Cloud India',
    industry: 'Hyperscale Cloud & Platform Engineering',
    size: '1000+ employees',
    domain: 'google.co.in',
    logoSeed: '1509391366360-2e959784a276',
    tagline: 'Building infrastructure for the next billion users',
    cultureNotes:
      'Google Cloud India builds products for scale, reliability, and enterprise compliance. Highly structured engineering process with a strong emphasis on testing, security, and global coordination.',
    hrTeamSize: 1,
    settings: {
      autoOfferEnabled: false,
      defaultThreshold: 88,
      defaultVoice: 'Serena',
      domain: 'google.co.in',
      hiringSlack: '#gcp-india-jobs',
    },
  },
];

type Domain = 'frontend' | 'backend' | 'fullstack' | 'ai' | 'devops' | 'mobile' | 'data' | 'product' | 'security';

interface DomainDef {
  key: Domain;
  label: string;
  skills: string[];
  roles: string[];
  salaryLPA: [number, number];
}

const DOMAIN_DATA: DomainDef[] = [
  {
    key: 'backend',
    label: 'Backend Engineering',
    skills: ['Go', 'Rust', 'Node.js', 'PostgreSQL', 'Redis', 'Kafka', 'gRPC', 'Docker', 'Kubernetes', 'AWS', 'Microservices', 'GraphQL', 'System Design'],
    roles: ['Senior Backend Engineer', 'Staff Software Engineer', 'Distributed Systems Architect', 'Backend Tech Lead', 'Core Platform Engineer'],
    salaryLPA: [22, 55],
  },
  {
    key: 'frontend',
    label: 'Frontend Engineering',
    skills: ['React', 'Next.js', 'TypeScript', 'TailwindCSS', 'GraphQL', 'WebGL', 'Zustand', 'Performance Optimization', 'Design Systems', 'Vite', 'Testing Library'],
    roles: ['Senior Frontend Engineer', 'Staff UI Engineer', 'Frontend Tech Lead', 'Design Systems Specialist', 'Web Performance Architect'],
    salaryLPA: [18, 48],
  },
  {
    key: 'fullstack',
    label: 'Full Stack Engineering',
    skills: ['TypeScript', 'Next.js', 'React', 'Node.js', 'PostgreSQL', 'Redis', 'Prisma', 'TailwindCSS', 'Docker', 'REST APIs', 'AWS', 'CI/CD'],
    roles: ['Senior Full-Stack Engineer', 'Lead Full-Stack Developer', 'Product Engineer', 'Full-Stack Solutions Architect', 'Founding Engineer'],
    salaryLPA: [20, 50],
  },
  {
    key: 'ai',
    label: 'AI & Machine Learning',
    skills: ['Python', 'PyTorch', 'TensorFlow', 'FastAPI', 'LangChain', 'LlamaIndex', 'CUDA', 'Hugging Face', 'Vector DBs', 'Fine-Tuning', 'MLOps', 'vLLM'],
    roles: ['Senior AI/ML Engineer', 'Staff LLM Systems Engineer', 'AI Research Scientist', 'MLOps Architect', 'Lead GenAI Engineer'],
    salaryLPA: [25, 75],
  },
  {
    key: 'devops',
    label: 'DevOps & Cloud Infrastructure',
    skills: ['Kubernetes', 'Terraform', 'AWS', 'GCP', 'Docker', 'Prometheus', 'Grafana', 'CI/CD GitHub Actions', 'Helm', 'ArgoCD', 'Linux', 'Ansible'],
    roles: ['Senior DevOps Engineer', 'Site Reliability Engineering Lead', 'Cloud Infrastructure Architect', 'DevSecOps Specialist'],
    salaryLPA: [22, 52],
  },
  {
    key: 'security',
    label: 'Cybersecurity & Application Security',
    skills: ['Application Security', 'Penetration Testing', 'OAuth2/JWT', 'OWASP Top 10', 'Cloud Security', 'Kubernetes Security', 'Cryptography', 'SIEM'],
    roles: ['Senior Security Engineer', 'AppSec Tech Lead', 'Security Operations Architect', 'Product Security Lead'],
    salaryLPA: [24, 58],
  },
];

interface JobTemplate {
  orgName: string;
  title: string;
  domain: Domain;
  city: string;
  exp: string;
  salaryLPA: [number, number];
  minScore: number;
  autoOffer: boolean;
  status: 'published' | 'active' | 'draft' | 'paused' | 'closed';
  keyRequirements: string[];
  description: string;
}

const JOB_TEMPLATES: JobTemplate[] = [
  {
    orgName: 'RazorFlow Technologies',
    title: 'Senior Backend Engineer (Payments Core)',
    domain: 'backend',
    city: 'Bengaluru',
    exp: '4-7 years',
    salaryLPA: [30, 48],
    minScore: 82,
    autoOffer: true,
    status: 'active',
    keyRequirements: ['Go or Rust experience in high-concurrency systems', 'PostgreSQL database tuning and transaction isolation', 'Kafka event streaming for financial ledgers'],
    description: `## About the Role\nRazorFlow is seeking a Senior Backend Engineer for our core Payments Infrastructure team. In this role, you will design, implement, and maintain high-throughput transactional APIs that process millions of requests daily.`,
  },
  {
    orgName: 'RazorFlow Technologies',
    title: 'Lead Full-Stack Engineer (Merchant Portal)',
    domain: 'fullstack',
    city: 'Bengaluru',
    exp: '5-9 years',
    salaryLPA: [35, 55],
    minScore: 80,
    autoOffer: false,
    status: 'active',
    keyRequirements: ['Next.js App Router, TypeScript, React Server Components', 'Node.js/Express backend APIs, PostgreSQL, Redis caching', 'Micro-frontend architecture and PCI-DSS compliance'],
    description: `## About the Role\nWe are looking for a Lead Full-Stack Engineer to own the Next-Gen Merchant Portal. This platform is the primary interface for thousands of merchants using RazorFlow.`,
  },
  {
    orgName: 'RazorFlow Technologies',
    title: 'Staff Security Engineer (AppSec & Cloud)',
    domain: 'security',
    city: 'Bengaluru',
    exp: '6-10 years',
    salaryLPA: [40, 65],
    minScore: 85,
    autoOffer: false,
    status: 'active',
    keyRequirements: ['Zero-trust security architecture', 'Kubernetes cluster hardening and mTLS', 'Automated security scanning in CI/CD pipelines'],
    description: `## About the Role\nAs a Staff Security Engineer, you will define the security posture for the entire RazorFlow platform. You will build secure defaults, design zero-trust networks, and automate vulnerability detection.`,
  },
  {
    orgName: 'NexusCloud Labs',
    title: 'Distributed Systems Engineer (Serverless Cloud)',
    domain: 'backend',
    city: 'Hyderabad',
    exp: '3-6 years',
    salaryLPA: [28, 45],
    minScore: 84,
    autoOffer: false,
    status: 'active',
    keyRequirements: ['Rust or Go systems programming', 'Kubernetes CRI/CNI plugin development', 'eBPF networking and low-latency RPCs'],
    description: `## About the Role\nNexusCloud is building a serverless container runtime for high-performance computing workloads. As a Distributed Systems Engineer, you will help design our control plane and write custom network plugins.`,
  },
  {
    orgName: 'NexusCloud Labs',
    title: 'Senior AI Systems Architect',
    domain: 'ai',
    city: 'Bengaluru',
    exp: '5-9 years',
    salaryLPA: [45, 75],
    minScore: 86,
    autoOffer: false,
    status: 'active',
    keyRequirements: ['LLM inference optimization (vLLM, TensorRT-LLM)', 'Distributed training pipelines with PyTorch and Ray', 'Vector search indexing at billion-vector scale'],
    description: `## About the Role\nWe are seeking a Senior AI Systems Architect to design our large-scale GPU cluster orchestration layer. You will work on accelerating LLM inference speeds and optimizing memory bandwidth.`,
  },
  {
    orgName: 'ZomatoScale QuickCommerce',
    title: 'Senior Frontend Architect (Consumer Web & Mobile Web)',
    domain: 'frontend',
    city: 'Gurgaon',
    exp: '5-8 years',
    salaryLPA: [32, 50],
    minScore: 80,
    autoOffer: true,
    status: 'active',
    keyRequirements: ['Sub-second First Contentful Paint optimization', 'React 19, Next.js, Web Vitals profiling', 'State synchronization across real-time order tracking'],
    description: `## About the Role\nZomatoScale is building the fastest delivery experience in India. We are looking for a Senior Frontend Architect to optimize our consumer web and mobile web apps.`,
  },
  {
    orgName: 'Google Cloud India',
    title: 'Cloud Infrastructure Engineer (Kubernetes Core)',
    domain: 'devops',
    city: 'Bengaluru',
    exp: '4-7 years',
    salaryLPA: [35, 60],
    minScore: 88,
    autoOffer: false,
    status: 'active',
    keyRequirements: ['Upstream Kubernetes contributions', 'Golang systems programming', 'Linux kernel namespace isolation and cgroups'],
    description: `## About the Role\nGoogle Cloud India is seeking a Cloud Infrastructure Engineer for our Kubernetes Core development team. You will work directly on contributing code to upstream Kubernetes.`,
  },
];

interface AptitudeSeedItem {
  category: string;
  difficulty: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  tags: string[];
}

const APTITUDE_BANK: AptitudeSeedItem[] = [
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'A train 180 meters long is traveling at a speed of 54 km/h. How many seconds will it take to pass an electric pole?',
    options: ['10 seconds', '12 seconds', '15 seconds', '18 seconds'],
    correct_index: 1,
    explanation: 'Speed = 54 × (5/18) = 15 m/s. Time = Distance / Speed = 180 / 15 = 12 seconds.',
    tags: ['speed', 'distance', 'trains'],
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'easy',
    question: 'If the price of a laptop is increased by 20% and then reduced by 20%, what is the net percentage change in price?',
    options: ['0% change', '4% increase', '4% decrease', '2% decrease'],
    correct_index: 2,
    explanation: 'Net change = x + y + (xy/100) = +20 - 20 - (400/100) = -4%, i.e., 4% decrease.',
    tags: ['percentage', 'profit-loss'],
  },
  {
    category: 'Quantitative Aptitude',
    difficulty: 'medium',
    question: 'Two pipes A and B can fill a water reservoir in 15 hours and 20 hours respectively. If both pipes are opened simultaneously, how much time will it take to fill the reservoir?',
    options: ['7.5 hours', '8.57 hours', '9.2 hours', '10 hours'],
    correct_index: 1,
    explanation: 'Combined rate = (1/15) + (1/20) = (4+3)/60 = 7/60. Time taken = 60/7 ≈ 8.57 hours.',
    tags: ['pipes-cisterns', 'time-work'],
  },
  {
    category: 'Logical Reasoning',
    difficulty: 'easy',
    question: 'Find the missing number in the sequence: 4, 9, 19, 39, 79, ?',
    options: ['149', '159', '169', '179'],
    correct_index: 1,
    explanation: 'Pattern: (previous number × 2) + 1. (79 × 2) + 1 = 158 + 1 = 159.',
    tags: ['number-series', 'pattern-recognition'],
  },
  {
    category: 'Logical Reasoning',
    difficulty: 'medium',
    question: 'At what angle are the hands of a clock inclined when the time is 4:40 PM?',
    options: ['90°', '100°', '110°', '120°'],
    correct_index: 1,
    explanation: 'Angle = |(30 × H) - (11/2 × M)| = |(30 × 4) - (11/2 × 40)| = |120 - 220| = 100°.',
    tags: ['clock-angles', 'geometry'],
  },
  {
    category: 'Verbal Ability',
    difficulty: 'easy',
    question: 'Select the word that is most nearly OPPOSITE in meaning to "PRAGMATIC".',
    options: ['Realistic', 'Idealistic', 'Practical', 'Logical'],
    correct_index: 1,
    explanation: 'Pragmatic means dealing with things sensibly and realistically. Its exact antonym is idealistic.',
    tags: ['vocabulary', 'antonyms'],
  },
  {
    category: 'Data Interpretation',
    difficulty: 'easy',
    question: 'A company\'s engineering headcount across 4 quarters is: Q1: 120, Q2: 150, Q3: 180, Q4: 210. What is the percentage growth in headcount from Q1 to Q4?',
    options: ['50%', '65%', '75%', '80%'],
    correct_index: 2,
    explanation: 'Growth = ((210 - 120) / 120) × 100 = (90 / 120) × 100 = 75%.',
    tags: ['percentage-growth', 'headcount-analytics'],
  },
];

interface CodingSeedItem {
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  tags: string[];
  description: string;
  starter_code: string;
  entry_point: string;
  public_tests: Array<{ input: any; expected: any }>;
  hidden_tests: Array<{ input: any; expected: any }>;
  reference_solution: string;
}

const CODING_BANK: CodingSeedItem[] = [
  {
    slug: 'two-sum',
    title: 'Two Sum',
    category: 'Algorithms & Hash Maps',
    difficulty: 'easy',
    tags: ['arrays', 'hash-map'],
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.',
    starter_code: 'function twoSum(nums: number[], target: number): number[] {\n  // Write solution\n  return [];\n}',
    entry_point: 'twoSum',
    public_tests: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { input: [[3, 2, 4], 6], expected: [1, 2] },
    ],
    hidden_tests: [
      { input: [[3, 3], 6], expected: [0, 1] },
    ],
    reference_solution: 'function twoSum(nums, target) { const map = new Map(); for (let i=0; i<nums.length; i++) { const comp = target - nums[i]; if (map.has(comp)) return [map.get(comp), i]; map.set(nums[i], i); } return []; }',
  },
  {
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    category: 'Data Structures & Stacks',
    difficulty: 'easy',
    tags: ['stack', 'string'],
    description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.',
    starter_code: 'function isValid(s: string): boolean {\n  // Write solution\n  return false;\n}',
    entry_point: 'isValid',
    public_tests: [
      { input: ['()'], expected: true },
      { input: ['()[]{}'], expected: true },
      { input: ['(]'], expected: false },
    ],
    hidden_tests: [
      { input: ['{[]}'], expected: true },
      { input: ['([)]'], expected: false },
    ],
    reference_solution: 'function isValid(s) { const stack = []; const pairs = { ")": "(", "}": "{", "]": "[" }; for (const ch of s) { if (ch === "(" || ch === "{" || ch === "[") stack.push(ch); else if (stack.pop() !== pairs[ch]) return false; } return stack.length === 0; }',
  },
];

interface CandidateDef {
  email: string;
  name: string;
  headline: string;
  phone: string;
  location: string;
  yoe: number;
  expectedSalary: number;
  skills: string[];
  targetRoles: string[];
  bio: string;
  avatarSeed: string;
}

const DEMO_CANDIDATES: CandidateDef[] = [
  {
    email: 'pratham@gmail.com',
    name: 'Pratham Verma',
    headline: 'Senior Full-Stack Architect | Distributed Systems & High-Scale React 19',
    phone: '+91 98765 43210',
    location: 'Bengaluru, India',
    yoe: 6,
    expectedSalary: 4500000,
    skills: ['TypeScript', 'React', 'Next.js', 'Node.js', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes', 'Go', 'Distributed Systems', 'TailwindCSS'],
    targetRoles: ['Senior Full-Stack Engineer', 'Lead Full-Stack Developer', 'Distributed Systems Architect'],
    bio: 'Passionate full-stack systems engineer with 6 years building high-concurrency payment gateways and developer tooling. Advocate for end-to-end type safety, deterministic state management, and sub-millisecond database queries.',
    avatarSeed: '1535713875002-d1d0cf377fde',
  },
  {
    email: 'priya.sharma@gmail.com',
    name: 'Priya Sharma',
    headline: 'Staff Frontend Engineer | Design Systems & Web Performance Specialist',
    phone: '+91 98111 22233',
    location: 'Bengaluru, India',
    yoe: 7,
    expectedSalary: 4200000,
    skills: ['React', 'Next.js', 'TypeScript', 'TailwindCSS', 'WebGL', 'Zustand', 'Design Systems', 'Web Vitals'],
    targetRoles: ['Staff UI Engineer', 'Lead Frontend Architect'],
    bio: 'Frontend specialist obsessive about sub-second load times, micro-frontend architecture, and accessible component libraries across enterprise web portals.',
    avatarSeed: '1494790108377-be9c29b29330',
  },
  {
    email: 'amit.patel@gmail.com',
    name: 'Amit Patel',
    headline: 'Senior Backend Engineer | High-Throughput Financial Systems (Go/Rust)',
    phone: '+91 98222 33344',
    location: 'Mumbai, India',
    yoe: 5,
    expectedSalary: 3600000,
    skills: ['Go', 'Rust', 'PostgreSQL', 'Kafka', 'Redis', 'Docker', 'gRPC', 'Distributed Consensus'],
    targetRoles: ['Senior Backend Engineer', 'Payments Core Engineer'],
    bio: 'Core infrastructure engineer focused on ACID guarantees, zero-data-loss event streaming, and low-latency API services in regulated banking environments.',
    avatarSeed: '1507003211169-0a1dd7228f2d',
  },
  {
    email: 'ananya.iyer@gmail.com',
    name: 'Ananya Iyer',
    headline: 'Senior AI Research Engineer | Multi-Agent Systems & LLM Fine-Tuning',
    phone: '+91 98333 44455',
    location: 'Bengaluru, India',
    yoe: 4,
    expectedSalary: 4500000,
    skills: ['Python', 'PyTorch', 'LangChain', 'LlamaIndex', 'FastAPI', 'CUDA', 'Vector Search', 'vLLM'],
    targetRoles: ['Senior AI Systems Architect', 'Staff GenAI Engineer'],
    bio: 'Machine learning practitioner specializing in parameter-efficient fine-tuning, autonomous retrieval-augmented generation pipelines, and scalable GPU serving.',
    avatarSeed: '1534528741775-53994a69daeb',
  },
  {
    email: 'vikram.reddy@gmail.com',
    name: 'Vikram Reddy',
    headline: 'Principal Security Architect | Cloud Security & Zero-Trust Architecture',
    phone: '+91 98444 55566',
    location: 'Hyderabad, India',
    yoe: 9,
    expectedSalary: 6000000,
    skills: ['Application Security', 'Kubernetes Hardening', 'OAuth2/OIDC', 'Penetration Testing', 'Cloud Security', 'OWASP'],
    targetRoles: ['Staff Security Engineer', 'Head of Information Security'],
    bio: 'Experienced security architect trusted to secure payment ledgers, implement zero-trust network boundaries, and conduct rigorous offensive security audits.',
    avatarSeed: '1500648767791-00dcc994a43e',
  },
  {
    email: 'sneha.malhotra@gmail.com',
    name: 'Sneha Malhotra',
    headline: 'Senior Site Reliability Lead | Kubernetes Operator & Observability Architect',
    phone: '+91 98555 66677',
    location: 'Gurgaon, India',
    yoe: 6,
    expectedSalary: 3800000,
    skills: ['Kubernetes', 'Terraform', 'Prometheus', 'Grafana', 'ArgoCD', 'AWS', 'GCP', 'Linux Internals'],
    targetRoles: ['Senior SRE', 'Cloud Infrastructure Engineer'],
    bio: 'Reliability specialist championing 99.999% uptime, automated multi-region disaster recovery, and declarative GitOps delivery pipelines.',
    avatarSeed: '1544005313-94ddf0286df2',
  },
  {
    email: 'rahul.gupta@gmail.com',
    name: 'Rahul Gupta',
    headline: 'Full-Stack Developer | Node.js, React & GraphQL Microservices',
    phone: '+91 98666 77788',
    location: 'Delhi, India',
    yoe: 3,
    expectedSalary: 2200000,
    skills: ['TypeScript', 'Node.js', 'React', 'GraphQL', 'PostgreSQL', 'Docker', 'TailwindCSS'],
    targetRoles: ['Full-Stack Engineer', 'Product Engineer'],
    bio: 'Fast-shipping product builder with a keen eye for user delight and clean modular architecture.',
    avatarSeed: '1519085360753-af0119f7cbe7',
  },
  {
    email: 'rohan.verma@gmail.com',
    name: 'Rohan Verma',
    headline: 'Junior Cloud Infrastructure Engineer | Docker, Linux & CI/CD Specialist',
    phone: '+91 98777 88899',
    location: 'Pune, India',
    yoe: 2,
    expectedSalary: 1600000,
    skills: ['Linux', 'Docker', 'GitHub Actions', 'Python', 'AWS', 'Terraform'],
    targetRoles: ['Junior DevOps Engineer', 'Cloud Operations Associate'],
    bio: 'Motivated early-career cloud practitioner dedicated to building reproducible developer environments and automated deployment checks.',
    avatarSeed: '1472099645785-5658abf4ff4e',
  },
  {
    email: 'kabir.shah@gmail.com',
    name: 'Kabir Shah',
    headline: 'Distributed Systems Engineer | Low-Latency Networking & eBPF',
    phone: '+91 98888 99900',
    location: 'Bengaluru, India',
    yoe: 5,
    expectedSalary: 4000000,
    skills: ['Rust', 'C++', 'Go', 'eBPF', 'Linux Kernel', 'gRPC', 'Distributed Systems'],
    targetRoles: ['Distributed Systems Engineer', 'Systems Software Engineer'],
    bio: 'Systems software developer passionate about kernel bypass networking, deterministic RPC benchmarks, and custom container runtimes.',
    avatarSeed: '1522075469751-3a6694fb2f61',
  },
];

interface HrSeedDef {
  email: string;
  name: string;
  orgName: string;
  title: string;
  location: string;
  specialties: string[];
}

const DEMO_HR_USERS: HrSeedDef[] = [
  {
    email: 'steve.hr@gmail.com',
    name: 'Steve Harrington',
    orgName: 'RazorFlow Technologies',
    title: 'Director of Global Engineering Talent',
    location: 'Bengaluru, India',
    specialties: ['Fintech Leadership', 'Distributed Systems Recruiting'],
  },
  {
    email: 'sarah.hr@gmail.com',
    name: 'Sarah Jenkins',
    orgName: 'NexusCloud Labs',
    title: 'Lead Talent Acquisition Partner',
    location: 'Bengaluru, India',
    specialties: ['Distributed Systems', 'Cloud & AI Talent'],
  },
  {
    email: 'rohit.hr@gmail.com',
    name: 'Rohit Sharma',
    orgName: 'ZomatoScale QuickCommerce',
    title: 'Senior Technical Talent Partner',
    location: 'Gurgaon, India',
    specialties: ['High-Scale Web & Mobile', 'Frontend Engineering'],
  },
  {
    email: 'anita.hr@gmail.com',
    name: 'Anita Desai',
    orgName: 'Google Cloud India',
    title: 'Staff Talent Advisor',
    location: 'Bengaluru, India',
    specialties: ['Site Reliability Engineering', 'DevOps & Infrastructure'],
  },
];

async function main(): Promise<void> {
  const startedAt = Date.now();

  // 1. Rigorous Pre-Flight Safety Verification
  console.log('🛡️ Validating database connection safety...');
  const safety = validateDatabaseSafety(connectionString);
  console.log(`🛡️ Target database validated: ${safety.sanitizedUrl} (Host: ${safety.host}, DB: ${safety.database})\n`);

  // 2. Dedicated Single-Session PostgreSQL Advisory Lock
  console.log('🔒 Acquiring PostgreSQL advisory lock on a dedicated session...');
  const lockClient = new PgClient({ connectionString });
  await lockClient.connect();

  let lockAcquired = false;
  try {
    const lockRes = await lockClient.query<{ pg_try_advisory_lock: boolean }>(
      'SELECT pg_try_advisory_lock($1) as pg_try_advisory_lock;',
      [SEED_LOCK_ID]
    );

    lockAcquired = lockRes.rows[0]?.pg_try_advisory_lock ?? false;
    if (!lockAcquired) {
      console.warn('⚠️ Another seed operation is currently active. Exiting safely without modifying any records.');
      return;
    }

    console.log('✅ Dedicated session advisory lock acquired successfully.');

    const stats = {
      orgsCreated: 0,
      orgsPreserved: 0,
      hrCreated: 0,
      hrPreserved: 0,
      candidatesCreated: 0,
      candidatesPreserved: 0,
      jobsCreated: 0,
      jobsPreserved: 0,
      appsCreated: 0,
      appsPreserved: 0,
      assessmentsCreated: 0,
      assessmentsPreserved: 0,
      interviewsCreated: 0,
      interviewsPreserved: 0,
      evaluationsCreated: 0,
      evaluationsPreserved: 0,
      offersCreated: 0,
      offersPreserved: 0,
      codingSubmissionsCreated: 0,
      codingSubmissionsPreserved: 0,
      bookmarksCreated: 0,
      bookmarksPreserved: 0,
      notificationsCreated: 0,
      notificationsPreserved: 0,
      prepCreated: 0,
      agentLogsCreated: 0,
      mockSessionsCreated: 0,
    };

    const existingUsersCount = await prisma.user.count();
    console.log(`🔍 Current database inspection: ${existingUsersCount} existing user(s) detected.`);
    console.log('🛡️ NON-DESTRUCTIVE MODE: Existing users, passwords, and custom data will be strictly preserved.\n');

    const defaultPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    // 1. Aptitude Questions (Idempotent check)
    const existingAptitudeCount = await prisma.aptitudeQuestion.count();
    if (existingAptitudeCount === 0) {
      console.log('📚 Seeding base Aptitude Questions...');
      for (const q of APTITUDE_BANK) {
        const found = await prisma.aptitudeQuestion.findFirst({ where: { question: q.question } });
        if (!found) {
          await prisma.aptitudeQuestion.create({
            data: {
              category: q.category,
              difficulty: q.difficulty,
              question: q.question,
              options: q.options,
              correct_index: q.correct_index,
              explanation: q.explanation,
              tags: q.tags,
              is_active: true,
            },
          });
        }
      }
      console.log(`✅ Base Aptitude Questions verified.`);
    } else {
      console.log(`📚 Aptitude questions already present (${existingAptitudeCount} items). Preserved.`);
    }

    // 2. Coding Problems (Idempotent upsert by slug)
    for (const prob of CODING_BANK) {
      await prisma.codingProblem.upsert({
        where: { slug: prob.slug },
        update: {},
        create: {
          slug: prob.slug,
          title: prob.title,
          category: prob.category,
          difficulty: prob.difficulty,
          tags: prob.tags,
          description: prob.description,
          starter_code: prob.starter_code,
          entry_point: prob.entry_point,
          public_tests: prob.public_tests as any,
          hidden_tests: prob.hidden_tests as any,
          reference_solution: prob.reference_solution as any,
          is_active: true,
          version: 1,
        },
      });
    }
    console.log(`💻 Coding Problems verified.`);

    // 3. Organizations (Idempotent find-or-create)
    console.log('\n🏢 Verifying Demo Organizations...');
    const orgMap = new Map<string, { id: string; name: string }>();

    for (const company of COMPANIES) {
      let org = await prisma.organization.findFirst({
        where: { name: company.name },
      });

      if (!org) {
        org = await prisma.organization.create({
          data: {
            name: company.name,
            industry: company.industry,
            size: company.size,
            logo_url: avatarUrl(company.logoSeed),
            settings: {
              isDemo: true,
              seedVersion: '1.0',
              ...company.settings,
            },
          },
        });
        stats.orgsCreated++;
        console.log(`  [CREATED] Organization: ${company.name}`);
      } else {
        stats.orgsPreserved++;
        console.log(`  [PRESERVED] Organization already exists: ${company.name}`);
      }
      orgMap.set(company.name, { id: org.id, name: org.name });
    }

    // 4. HR Recruiter Users (Idempotent check by email)
    console.log('\n👤 Verifying HR Recruiter Accounts...');
    const hrUserMap = new Map<string, string>();

    for (const hr of DEMO_HR_USERS) {
      const org = orgMap.get(hr.orgName);
      if (!org) continue;

      let user = await prisma.user.findUnique({
        where: { email: hr.email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: hr.email,
            password_hash: defaultPasswordHash,
            role: 'hr',
            org_id: org.id,
            profile: {
              isDemo: true,
              seedVersion: '1.0',
              name: hr.name,
              title: hr.title,
              location: hr.location,
              specialties: hr.specialties,
            },
          },
        });
        stats.hrCreated++;
        console.log(`  [CREATED] HR Recruiter: ${hr.email} (${hr.orgName})`);
      } else {
        stats.hrPreserved++;
        console.log(`  [PRESERVED] HR User exists: ${hr.email} (password & profile preserved)`);
      }
      hrUserMap.set(hr.email, user.id);
    }

    // 5. Candidate Users & Profiles (Idempotent check by email)
    console.log('\n🎓 Verifying Candidate Profiles...');
    const candidateMap = new Map<string, { userId: string; profileId: string; name: string }>();

    for (const c of DEMO_CANDIDATES) {
      let user = await prisma.user.findUnique({
        where: { email: c.email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: c.email,
            password_hash: defaultPasswordHash,
            role: 'candidate',
            profile: {
              isDemo: true,
              seedVersion: '1.0',
              name: c.name,
            },
          },
        });
        stats.candidatesCreated++;
        console.log(`  [CREATED] Candidate User: ${c.email}`);
      } else {
        stats.candidatesPreserved++;
        console.log(`  [PRESERVED] Candidate User exists: ${c.email}`);
      }

      let profile = await prisma.candidateProfile.findUnique({
        where: { user_id: user.id },
      });

      if (!profile) {
        profile = await prisma.candidateProfile.create({
          data: {
            user_id: user.id,
            full_name: c.name,
            headline: c.headline,
            phone: c.phone,
            location: c.location,
            timezone: 'Asia/Kolkata',
            bio: c.bio,
            skills: c.skills,
            target_roles: c.targetRoles,
            years_of_experience: c.yoe,
            work_mode: 'Hybrid',
            expected_salary: c.expectedSalary,
            target_locations: [c.location, 'Bengaluru', 'Remote (India)'],
            notice_period: '15 days',
            work_authorization: 'Indian Citizen',
            resume_url: DEMO_RESUME_URL,
            github_url: `https://github.com/${slugify(c.name)}`,
            linkedin_url: `https://linkedin.com/in/${slugify(c.name)}`,
            settings: {
              isDemo: true,
              seedVersion: '1.0',
            },
          },
        });
      } else {
        // Requirement 1: Never mutate existing profile settings or mark it as demo.
        // If already marked isDemo: true (from previous safe seed), it will be recognized as demo.
        // If unmarked, it is preserved completely and strictly treated as non-demo team data.
        const isExistingDemo = (profile.settings as any)?.isDemo === true;
        if (isExistingDemo) {
          console.log(`  [PRESERVED] Candidate Profile exists (Seed Demo): ${c.email}`);
        } else {
          console.log(`  [PRESERVED] Candidate Profile exists (Team/Non-Demo): ${c.email}`);
        }
      }

      candidateMap.set(c.email, {
        userId: user.id,
        profileId: profile.id,
        name: c.name,
      });
    }

    // 6. Job Postings (Idempotent check by org + title)
    console.log('\n💼 Verifying Job Postings...');
    const jobMap = new Map<string, { id: string; orgId: string; title: string; minScore: number; salaryLPA: [number, number] }>();

    for (const tpl of JOB_TEMPLATES) {
      const org = orgMap.get(tpl.orgName);
      if (!org) continue;

      const domainDef = DOMAIN_DATA.find((d) => d.key === tpl.domain) || DOMAIN_DATA[0];

      let job = await prisma.job.findFirst({
        where: {
          org_id: org.id,
          title: tpl.title,
        },
      });

      if (!job) {
        job = await prisma.job.create({
          data: {
            org_id: org.id,
            title: tpl.title,
            description: tpl.description,
            rubric: {
              isDemo: true,
              seedVersion: '1.0',
              technicalProficiency: { weight: 0.4, description: 'Core languages, data structures, and architecture principles.' },
              systemDesign: { weight: 0.3, description: 'Scalability, fault tolerance, API contracts.' },
              communication: { weight: 0.15, description: 'Clarity of explanation, structured thinking.' },
              cultureFit: { weight: 0.15, description: 'Ownership mindset and team collaboration.' },
            },
            thresholds: {
              isDemo: true,
              seedVersion: '1.0',
              minScore: tpl.minScore,
              autoOffer: tpl.autoOffer,
            },
            status: tpl.status,
            location: tpl.city,
            salary: `₹${tpl.salaryLPA[0]}L - ₹${tpl.salaryLPA[1]}L PA`,
            experienceLevel: tpl.exp,
            department: domainDef.label,
            skills: domainDef.skills.slice(0, 8),
            stages: [
              { id: 'applied', name: 'Applied', order: 1 },
              { id: 'screening', name: 'AI Screening', order: 2 },
              { id: 'assessment', name: 'Technical Assessment', order: 3 },
              { id: 'interview', name: 'Voice & Coding Round', order: 4 },
              { id: 'hr_round', name: 'HR Leadership Round', order: 5 },
              { id: 'offer', name: 'Offer Extended', order: 6 },
            ],
            assessmentConfig: {
              mcqCount: 10,
              codingProblemCount: 1,
              timeLimitMinutes: 45,
              proctoringRequired: true,
            },
          },
        });
        stats.jobsCreated++;
        console.log(`  [CREATED] Job: ${tpl.title} @ ${tpl.orgName}`);
      } else {
        // Requirement 2: Never mutate existing job thresholds/rubric or mark it as demo.
        // If already marked isDemo: true (from previous safe seed), it will be recognized as demo.
        // If unmarked, it is preserved completely and strictly treated as a non-demo team job.
        const isExistingDemoJob =
          (job.thresholds && typeof job.thresholds === 'object' && !Array.isArray(job.thresholds) && (job.thresholds as Record<string, unknown>).isDemo === true) ||
          (job.rubric && typeof job.rubric === 'object' && !Array.isArray(job.rubric) && (job.rubric as Record<string, unknown>).isDemo === true);

        stats.jobsPreserved++;
        if (isExistingDemoJob) {
          console.log(`  [PRESERVED] Job exists (Seed Demo): ${tpl.title} @ ${tpl.orgName}`);
        } else {
          console.log(`  [PRESERVED] Job exists (Team/Non-Demo): ${tpl.title} @ ${tpl.orgName}`);
        }
      }

      jobMap.set(`${tpl.orgName}::${tpl.title}`, {
        id: job.id,
        orgId: org.id,
        title: job.title,
        minScore: tpl.minScore,
        salaryLPA: tpl.salaryLPA,
      });
    }

    // 7. Applications & Connected Stages (Idempotent Child Repair with Transactions)
    console.log('\n📈 Verifying Applications & Pipelines...');

    interface AppSeedTarget {
      candidateEmail: string;
      orgName: string;
      jobTitle: string;
      status: 'applied' | 'screening_completed' | 'assessment' | 'interview_scheduled' | 'interviewed' | 'evaluation' | 'hr_round' | 'offered' | 'accepted' | 'rejected';
      hrRoundStatus?: 'scheduled' | 'passed' | 'pending';
      hrRoundScheduledInDays?: number;
      hrRoundCompletedDaysAgo?: number;
      appliedDaysAgo: number;
      scores?: {
        aptitude?: number;
        coding?: number;
        interview?: number;
        resume?: number;
        decision?: 'hire' | 'reject' | 'hold_for_review';
        reasoning?: string;
        offerSalaryLPA?: number;
        isAssessmentPending?: boolean;
      };
    }

    const TARGET_APPLICATIONS: AppSeedTarget[] = [
      {
        candidateEmail: 'pratham@gmail.com',
        orgName: 'RazorFlow Technologies',
        jobTitle: 'Senior Backend Engineer (Payments Core)',
        status: 'offered',
        hrRoundStatus: 'passed',
        hrRoundCompletedDaysAgo: 3,
        appliedDaysAgo: 14,
        scores: { aptitude: 94, coding: 96, interview: 94, resume: 95, decision: 'hire', reasoning: 'Exceptional full-stack candidate with deep concurrency proficiency.', offerSalaryLPA: 46 },
      },
      {
        candidateEmail: 'pratham@gmail.com',
        orgName: 'RazorFlow Technologies',
        jobTitle: 'Lead Full-Stack Engineer (Merchant Portal)',
        status: 'interview_scheduled',
        hrRoundStatus: 'scheduled',
        hrRoundScheduledInDays: 2,
        appliedDaysAgo: 10,
        scores: { aptitude: 92, coding: 94 },
      },
      {
        candidateEmail: 'pratham@gmail.com',
        orgName: 'NexusCloud Labs',
        jobTitle: 'Senior AI Systems Architect',
        status: 'assessment',
        appliedDaysAgo: 8,
        scores: { isAssessmentPending: true },
      },
      {
        candidateEmail: 'pratham@gmail.com',
        orgName: 'ZomatoScale QuickCommerce',
        jobTitle: 'Senior Frontend Architect (Consumer Web & Mobile Web)',
        status: 'applied',
        appliedDaysAgo: 4,
      },
      {
        candidateEmail: 'pratham@gmail.com',
        orgName: 'Google Cloud India',
        jobTitle: 'Cloud Infrastructure Engineer (Kubernetes Core)',
        status: 'hr_round',
        hrRoundStatus: 'scheduled',
        hrRoundScheduledInDays: 4,
        appliedDaysAgo: 12,
        scores: { aptitude: 90, coding: 92, interview: 93, resume: 91, decision: 'hire', reasoning: 'Outstanding performance in Linux internals and container orchestration.' },
      },
      {
        candidateEmail: 'pratham@gmail.com',
        orgName: 'NexusCloud Labs',
        jobTitle: 'Distributed Systems Engineer (Serverless Cloud)',
        status: 'rejected',
        appliedDaysAgo: 15,
        scores: { aptitude: 82, coding: 84, interview: 75, resume: 80, decision: 'reject', reasoning: 'Lacked deep low-latency Rust experience required for this role.' },
      },
      {
        candidateEmail: 'priya.sharma@gmail.com',
        orgName: 'RazorFlow Technologies',
        jobTitle: 'Lead Full-Stack Engineer (Merchant Portal)',
        status: 'interviewed',
        appliedDaysAgo: 5,
        scores: { aptitude: 86, coding: 92, interview: 88, resume: 90 },
      },
      {
        candidateEmail: 'amit.patel@gmail.com',
        orgName: 'RazorFlow Technologies',
        jobTitle: 'Senior Backend Engineer (Payments Core)',
        status: 'screening_completed',
        appliedDaysAgo: 6,
      },
      {
        candidateEmail: 'ananya.iyer@gmail.com',
        orgName: 'RazorFlow Technologies',
        jobTitle: 'Lead Full-Stack Engineer (Merchant Portal)',
        status: 'applied',
        appliedDaysAgo: 1,
      },
      {
        candidateEmail: 'vikram.reddy@gmail.com',
        orgName: 'RazorFlow Technologies',
        jobTitle: 'Staff Security Engineer (AppSec & Cloud)',
        status: 'accepted',
        hrRoundStatus: 'passed',
        hrRoundCompletedDaysAgo: 4,
        appliedDaysAgo: 20,
        scores: { aptitude: 90, coding: 88, interview: 94, resume: 92, decision: 'hire', reasoning: 'Strong principal-level security candidate with deep threat modeling knowledge.', offerSalaryLPA: 62 },
      },
      {
        candidateEmail: 'rahul.gupta@gmail.com',
        orgName: 'RazorFlow Technologies',
        jobTitle: 'Senior Backend Engineer (Payments Core)',
        status: 'rejected',
        appliedDaysAgo: 9,
        scores: { aptitude: 55, coding: 50, resume: 60, decision: 'reject', reasoning: 'Assessment score fell below threshold.' },
      },
      {
        candidateEmail: 'sneha.malhotra@gmail.com',
        orgName: 'NexusCloud Labs',
        jobTitle: 'Senior AI Systems Architect',
        status: 'evaluation',
        appliedDaysAgo: 11,
        scores: { aptitude: 88, coding: 90, interview: 85, resume: 88, decision: 'hold_for_review', reasoning: 'Good foundations. Awaiting pool comparisons.' },
      },
      {
        candidateEmail: 'kabir.shah@gmail.com',
        orgName: 'NexusCloud Labs',
        jobTitle: 'Distributed Systems Engineer (Serverless Cloud)',
        status: 'offered',
        appliedDaysAgo: 12,
        scores: { aptitude: 88, coding: 90, interview: 89, resume: 90, decision: 'hire', reasoning: 'Strong platform engineer with infrastructure automation expertise.', offerSalaryLPA: 42 },
      },
    ];

    for (const target of TARGET_APPLICATIONS) {
      const candidate = candidateMap.get(target.candidateEmail);
      const job = jobMap.get(`${target.orgName}::${target.jobTitle}`);

      if (!candidate || !job) continue;

      // 1. Verify parent entities are confirmed seed demo entities
      const candidateProfile = await prisma.candidateProfile.findUnique({
        where: { id: candidate.profileId },
        select: { id: true, settings: true },
      });
      const dbJob = await prisma.job.findUnique({
        where: { id: job.id },
        select: { id: true, thresholds: true, rubric: true },
      });

      const isCandidateDemo = (candidateProfile?.settings as any)?.isDemo === true;
      const isJobDemo = (dbJob?.thresholds as any)?.isDemo === true || (dbJob?.rubric as any)?.isDemo === true;

      if (!isCandidateDemo || !isJobDemo) {
        console.log(`  [PRESERVED TEAM DATA] Skipping application for non-demo candidate or job (${target.candidateEmail} -> ${target.jobTitle}).`);
        stats.appsPreserved++;
        continue;
      }

      let app = await prisma.application.findUnique({
        where: {
          candidate_id_job_id: {
            candidate_id: candidate.profileId,
            job_id: job.id,
          },
        },
        include: {
          coding_submissions: { select: { idempotency_key: true } },
          interview: { select: { id: true, engagement_signal: true } },
          assessments: { select: { id: true, category_breakdown: true } },
          evaluations: { select: { id: true, reasoning: true } },
        },
      });

      const needsAssessment =
        ['assessment', 'interview_scheduled', 'interviewed', 'evaluation', 'hr_round', 'decided', 'offered', 'accepted', 'rejected'].includes(target.status) &&
        (target.scores?.aptitude !== undefined || target.scores?.isAssessmentPending === true);

      const needsInterview =
        ['interview_scheduled', 'interviewed', 'evaluation', 'hr_round', 'decided', 'offered', 'accepted'].includes(target.status) ||
        (target.status === 'rejected' && target.scores?.interview !== undefined);

      const needsEvaluation = ['evaluation', 'hr_round', 'decided', 'offered', 'accepted', 'rejected'].includes(target.status) && target.scores?.decision;
      const needsOffer = ['offered', 'accepted'].includes(target.status) && target.scores?.offerSalaryLPA;

      if (!app) {
        // Create new demo application and its child records atomically in a single transaction
        await prisma.$transaction(async (tx) => {
          const newApp = await tx.application.create({
            data: {
              candidate_id: candidate.profileId,
              job_id: job.id,
              status: target.status,
              hr_round_status: target.hrRoundStatus,
              hr_round_scheduled_at: target.hrRoundScheduledInDays ? daysFromNow(target.hrRoundScheduledInDays) : null,
              hr_round_completed_at: target.hrRoundCompletedDaysAgo ? daysAgo(target.hrRoundCompletedDaysAgo) : null,
              applied_at: daysAgo(target.appliedDaysAgo),
            },
          });
          stats.appsCreated++;
          console.log(`  [CREATED] Application: ${candidate.name} -> ${job.title} (${target.status})`);

          if (needsAssessment) {
            const isPending = target.scores?.isAssessmentPending ?? false;
            const aptScore = target.scores?.aptitude ?? 85;
            const codScore = target.scores?.coding ?? 88;
            const overallScore = Number(((aptScore + codScore) / 2).toFixed(1));

            await tx.assessment.create({
              data: {
                application_id: newApp.id,
                test_type: 'aptitude',
                questions: APTITUDE_BANK.slice(0, 5) as any,
                responses: isPending ? Prisma.DbNull : ([{ questionId: 0, isCorrect: true }] as any),
                score: isPending ? null : overallScore,
                category_breakdown: isPending
                  ? ({ isDemo: true, seedVersion: '1.0' } as any)
                  : ({ isDemo: true, seedVersion: '1.0', 'Quantitative Aptitude': aptScore, 'Logical Reasoning': aptScore } as any),
                status: isPending ? 'pending' : 'completed',
                total_question_count: 5,
              },
            });
            stats.assessmentsCreated++;

            if (!isPending) {
              const dbProblem = await tx.codingProblem.findFirst({
                where: { slug: job.title.includes('Frontend') ? 'valid-parentheses' : 'two-sum' },
              });

              await tx.codingSubmission.create({
                data: {
                  idempotency_key: `seed-sub-${newApp.id}`,
                  application_id: newApp.id,
                  candidate_id: candidate.profileId,
                  problem_id: dbProblem?.id || null,
                  language: 'typescript',
                  code: 'function solution() { return true; }',
                  pass_rate: 1.0,
                  pass_rate_percent: 100,
                  pass_rate_ratio: 1.0,
                  status: 'completed',
                  ai_feedback: 'Optimal solution with clean typing.',
                },
              });
              stats.codingSubmissionsCreated++;
            }
          }

          if (needsInterview) {
            await tx.interview.create({
              data: {
                application_id: newApp.id,
                scheduled_at: target.status === 'interview_scheduled' ? daysFromNow(2) : daysAgo(4),
                transcript: [],
                engagement_signal: { isDemo: true, seedVersion: '1.0' } as any,
                status: target.status === 'interview_scheduled' ? 'scheduled' : 'completed',
              },
            });
            stats.interviewsCreated++;
          }

          if (needsEvaluation) {
            const resumeScore = target.scores?.resume ?? 88;
            const interviewScore = target.scores?.interview ?? 85;
            const aptitudeScore = target.scores?.aptitude ?? 85;
            const codingScore = target.scores?.coding ?? 88;
            const compositeScore = Number(((resumeScore * 0.25) + (interviewScore * 0.35) + (aptitudeScore * 0.15) + (codingScore * 0.25)).toFixed(1));

            await tx.evaluation.create({
              data: {
                application_id: newApp.id,
                stage: target.status,
                resume_score: resumeScore,
                interview_score: interviewScore,
                aptitude_score: aptitudeScore,
                coding_score: codingScore,
                composite_score: compositeScore,
                confidence: 0.94,
                decision: target.scores?.decision,
                reasoning: target.scores?.reasoning
                  ? `[SEED DEMO] ${target.scores.reasoning}`
                  : `[SEED DEMO] Evaluated with composite score of ${compositeScore}/100.`,
              },
            });
            stats.evaluationsCreated++;
          }

          if (needsOffer) {
            const salary = (target.scores?.offerSalaryLPA || 40) * 100000;
            await tx.offer.create({
              data: {
                application_id: newApp.id,
                role_title: job.title,
                salary,
                equity: '0.15% Stock Options (4-year vesting)',
                start_date: daysFromNow(20),
                status: target.status === 'accepted' ? 'accepted' : 'pending',
                offer_letter_content: `We are pleased to extend an offer for ${job.title} at ₹${(salary / 100000).toFixed(0)} LPA.`,
                valid_until: daysFromNow(14),
              },
            });
            stats.offersCreated++;
          }
        });
      } else {
        // App already exists: verify whether it carries demo seed signatures
        const hasSeedCoding = app.coding_submissions.some((s) => s.idempotency_key?.startsWith('seed-sub-'));
        const hasSeedInterview = (app.interview?.engagement_signal as any)?.isDemo === true;
        const hasSeedAssessment = app.assessments.some((a) => (a.category_breakdown as any)?.isDemo === true);
        const hasSeedEvaluation = app.evaluations.some((e) => e.reasoning?.includes('[SEED DEMO]'));
        const isSeedManagedApp = hasSeedCoding || hasSeedInterview || hasSeedAssessment || hasSeedEvaluation;

        // Requirement 3 & 5: Existing applications without seed signatures are NOT assumed to be seed-managed!
        if (!isSeedManagedApp) {
          console.log(`  [PRESERVED TEAM APPLICATION] Application exists without seed signatures: ${candidate.name} -> ${job.title}. Leaving completely untouched.`);
          stats.appsPreserved++;
          continue;
        }

        stats.appsPreserved++;
        console.log(`  [PRESERVED DEMO] Seed-managed application exists: ${candidate.name} -> ${job.title} (Checking missing child records...)`);

        const appId = app.id;
        const candidateProfileId = candidate.profileId;

        // Self-heal only missing child records for confirmed seed-managed applications
        await prisma.$transaction(async (tx) => {
          if (needsAssessment) {
            const existingAssessment = await tx.assessment.findFirst({
              where: { application_id: appId },
            });

            if (!existingAssessment) {
              const isPending = target.scores?.isAssessmentPending ?? false;
              const aptScore = target.scores?.aptitude ?? 85;
              const codScore = target.scores?.coding ?? 88;
              const overallScore = Number(((aptScore + codScore) / 2).toFixed(1));

              await tx.assessment.create({
                data: {
                  application_id: appId,
                  test_type: 'aptitude',
                  questions: APTITUDE_BANK.slice(0, 5) as any,
                  responses: isPending ? Prisma.DbNull : ([{ questionId: 0, isCorrect: true }] as any),
                  score: isPending ? null : overallScore,
                  category_breakdown: isPending
                    ? ({ isDemo: true, seedVersion: '1.0' } as any)
                    : ({ isDemo: true, seedVersion: '1.0', 'Quantitative Aptitude': aptScore, 'Logical Reasoning': aptScore } as any),
                  status: isPending ? 'pending' : 'completed',
                  total_question_count: 5,
                },
              });
              stats.assessmentsCreated++;

              if (!isPending) {
                const dbProblem = await tx.codingProblem.findFirst({
                  where: { slug: job.title.includes('Frontend') ? 'valid-parentheses' : 'two-sum' },
                });

                await tx.codingSubmission.upsert({
                  where: { idempotency_key: `seed-sub-${appId}` },
                  update: {},
                  create: {
                    idempotency_key: `seed-sub-${appId}`,
                    application_id: appId,
                    candidate_id: candidateProfileId,
                    problem_id: dbProblem?.id || null,
                    language: 'typescript',
                    code: 'function solution() { return true; }',
                    pass_rate: 1.0,
                    pass_rate_percent: 100,
                    pass_rate_ratio: 1.0,
                    status: 'completed',
                    ai_feedback: 'Optimal solution with clean typing.',
                  },
                });
                stats.codingSubmissionsCreated++;
              }
            } else {
              stats.assessmentsPreserved++;
            }
          }

          if (needsInterview) {
            const existingInterview = await tx.interview.findUnique({
              where: { application_id: appId },
            });

            if (!existingInterview) {
              await tx.interview.create({
                data: {
                  application_id: appId,
                  scheduled_at: target.status === 'interview_scheduled' ? daysFromNow(2) : daysAgo(4),
                  transcript: [],
                  engagement_signal: { isDemo: true, seedVersion: '1.0' } as any,
                  status: target.status === 'interview_scheduled' ? 'scheduled' : 'completed',
                },
              });
              stats.interviewsCreated++;
            } else {
              stats.interviewsPreserved++;
            }
          }

          if (needsEvaluation) {
            const existingEval = await tx.evaluation.findUnique({
              where: { application_id: appId },
            });

            if (!existingEval) {
              const resumeScore = target.scores?.resume ?? 88;
              const interviewScore = target.scores?.interview ?? 85;
              const aptitudeScore = target.scores?.aptitude ?? 85;
              const codingScore = target.scores?.coding ?? 88;
              const compositeScore = Number(((resumeScore * 0.25) + (interviewScore * 0.35) + (aptitudeScore * 0.15) + (codingScore * 0.25)).toFixed(1));

              await tx.evaluation.create({
                data: {
                  application_id: appId,
                  stage: target.status,
                  resume_score: resumeScore,
                  interview_score: interviewScore,
                  aptitude_score: aptitudeScore,
                  coding_score: codingScore,
                  composite_score: compositeScore,
                  confidence: 0.94,
                  decision: target.scores?.decision,
                  reasoning: target.scores?.reasoning
                    ? `[SEED DEMO] ${target.scores.reasoning}`
                    : `[SEED DEMO] Evaluated with composite score of ${compositeScore}/100.`,
                },
              });
              stats.evaluationsCreated++;
            } else {
              stats.evaluationsPreserved++;
            }
          }

          if (needsOffer) {
            const existingOffer = await tx.offer.findUnique({
              where: { application_id: appId },
            });

            if (!existingOffer) {
              const salary = (target.scores?.offerSalaryLPA || 40) * 100000;
              await tx.offer.create({
                data: {
                  application_id: appId,
                  role_title: job.title,
                  salary,
                  equity: '0.15% Stock Options (4-year vesting)',
                  start_date: daysFromNow(20),
                  status: target.status === 'accepted' ? 'accepted' : 'pending',
                  offer_letter_content: `We are pleased to extend an offer for ${job.title} at ₹${(salary / 100000).toFixed(0)} LPA.`,
                  valid_until: daysFromNow(14),
                },
              });
              stats.offersCreated++;
            } else {
              stats.offersPreserved++;
            }
          }
        });
      }
    }

    // 8. Talent Bookmarks for HR Dashboards (Idempotent upsert via @@unique([org_id, candidate_id]))
    console.log('\n🔖 Verifying HR Talent Bookmarks...');
    const BOOKMARKS = [
      {
        orgName: 'RazorFlow Technologies',
        candidateEmail: 'pratham@gmail.com',
        jobTitle: 'Lead Full-Stack Engineer (Merchant Portal)',
        notes: 'High-signal full-stack candidate. Excellent performance in system design and React architecture.',
      },
      {
        orgName: 'RazorFlow Technologies',
        candidateEmail: 'priya.sharma@gmail.com',
        jobTitle: 'Lead Full-Stack Engineer (Merchant Portal)',
        notes: 'Strong candidate with deep Next.js experience. High interview score.',
      },
      {
        orgName: 'NexusCloud Labs',
        candidateEmail: 'kabir.shah@gmail.com',
        jobTitle: 'Distributed Systems Engineer (Serverless Cloud)',
        notes: 'Offered candidate. Highly skilled in Rust systems programming.',
      },
    ];

    for (const b of BOOKMARKS) {
      const org = orgMap.get(b.orgName);
      const cand = candidateMap.get(b.candidateEmail);
      const job = b.jobTitle ? jobMap.get(`${b.orgName}::${b.jobTitle}`) : undefined;
      if (!org || !cand) continue;

      const existingBookmark = await prisma.talentBookmark.findUnique({
        where: {
          org_id_candidate_id: {
            org_id: org.id,
            candidate_id: cand.profileId,
          },
        },
      });

      if (!existingBookmark) {
        await prisma.talentBookmark.create({
          data: {
            org_id: org.id,
            candidate_id: cand.profileId,
            job_id: job?.id ?? null,
            notes: b.notes,
          },
        });
        stats.bookmarksCreated++;
      } else {
        stats.bookmarksPreserved++;
      }
    }

    // 9. Notifications for Candidate & Recruiter Dashboards (Idempotent check by user_id + title)
    console.log('\n🔔 Verifying Demo Notifications...');
    const allUserIdsByEmail = new Map<string, string>();
    for (const [email, id] of hrUserMap.entries()) {
      allUserIdsByEmail.set(email, id);
    }
    for (const [email, data] of candidateMap.entries()) {
      allUserIdsByEmail.set(email, data.userId);
    }

    const NOTIFICATIONS = [
      {
        userEmail: 'pratham@gmail.com',
        title: 'Offer Extended: Lead Full-Stack Engineer',
        message: 'RazorFlow Technologies has extended an official employment offer for the Lead Full-Stack Engineer (Merchant Portal) role at ₹48 LPA.',
        type: 'offer',
        read: false,
        createdAt: daysAgo(1),
      },
      {
        userEmail: 'pratham@gmail.com',
        title: 'HR Video Round Scheduled',
        message: 'Your 1:1 HR & Team Video Interview with Google Cloud India has been scheduled for upcoming Thursday.',
        type: 'interview',
        read: true,
        createdAt: daysAgo(3),
      },
      {
        userEmail: 'pratham@gmail.com',
        title: 'Aptitude Assessment Pending',
        message: 'Your technical assessment for the Senior AI Systems Architect role at NexusCloud Labs is waiting for your submission.',
        type: 'assessment',
        read: false,
        createdAt: daysAgo(4),
      },
      {
        userEmail: 'steve.hr@gmail.com',
        title: 'New High-Score Application Received',
        message: 'Candidate Pratham submitted an application for Lead Full-Stack Engineer with an AI match score of 92%.',
        type: 'application',
        read: true,
        createdAt: daysAgo(5),
      },
      {
        userEmail: 'steve.hr@gmail.com',
        title: 'Interview Evaluation Ready',
        message: 'AI evaluation and sentiment telemetry completed for Priya Sharma (Merchant Portal role).',
        type: 'evaluation',
        read: false,
        createdAt: daysAgo(2),
      },
      {
        userEmail: 'steve.hr@gmail.com',
        title: 'Candidate Accepted Offer',
        message: 'Vikram Reddy has accepted the offer for Staff Security Engineer (AppSec & Cloud).',
        type: 'offer',
        read: false,
        createdAt: daysAgo(1),
      },
    ];

    for (const notif of NOTIFICATIONS) {
      const userId = allUserIdsByEmail.get(notif.userEmail);
      if (!userId) continue;

      const existingNotif = await prisma.notification.findFirst({
        where: {
          user_id: userId,
          title: notif.title,
        },
      });

      if (!existingNotif) {
        await prisma.notification.create({
          data: {
            user_id: userId,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            read: notif.read,
            created_at: notif.createdAt,
          },
        });
        stats.notificationsCreated++;
      } else {
        stats.notificationsPreserved++;
      }
    }

    // 10. Prep Content (Idempotent upsert)
    console.log('\n📚 Verifying Prep Content Modules...');
    for (const company of COMPANIES) {
      const org = orgMap.get(company.name);
      await prisma.prepContent.upsert({
        where: {
          company_name_role_archetype: {
            company_name: company.name,
            role_archetype: 'Senior Software Engineer',
          },
        },
        update: {},
        create: {
          company_name: company.name,
          role_archetype: 'Senior Software Engineer',
          org_id: org?.id,
          culture_notes: company.cultureNotes,
          questions: [
            { question: `How would you architect a fault-tolerant subsystem at ${company.name}?`, type: 'technical' },
            { question: 'Describe a time you resolved a major production incident under time pressure.', type: 'behavioral' },
          ],
          skill_checklist: ['Distributed Systems', 'Database Optimization', 'Asynchronous Queues'],
        },
      });
      stats.prepCreated++;
    }

    // 11. Mock Practice Sessions for Showcase Candidate (Pratham)
    const pratham = candidateMap.get('pratham@gmail.com');
    if (pratham) {
      const existingMockCount = await prisma.mockSession.count({
        where: { candidate_id: pratham.profileId },
      });

      if (existingMockCount === 0) {
        console.log('\n🎯 Seeding Mock Practice Sessions for showcase candidate...');
        await prisma.mockSession.create({
          data: {
            candidate_id: pratham.profileId,
            target_company: 'RazorFlow Technologies',
            target_role: 'Senior Full-Stack Architect',
            difficulty: 'hard',
            type: 'mock',
            status: 'completed',
            current_section: 'interview',
            started_at: daysAgo(5),
            completed_at: daysAgo(5),
            final_score: 92.5,
            final_feedback: {
              summary: 'Exceptional depth in distributed transactions and system scalability.',
              strengths: ['Clean code structure', 'Strong communication of design tradeoffs'],
            },
            topic: 'Distributed Systems & Concurrency',
            focus_areas: ['System Design', 'PostgreSQL Concurrency'],
          },
        });
        stats.mockSessionsCreated++;
      }
    }

    // 12. Agent Execution Logs (Audit trail for analytics)
    for (const [, job] of jobMap) {
      const existingLog = await prisma.agentLog.findFirst({
        where: { job_id: job.id, agent_name: 'ResumeScreeningAgent' },
      });
      if (!existingLog) {
        await prisma.agentLog.create({
          data: {
            org_id: job.orgId,
            job_id: job.id,
            agent_name: 'ResumeScreeningAgent',
            action: 'screen_applications',
            input: { jobTitle: job.title },
            output: { candidatesScreened: 24, qualified: 12 },
            status: 'completed',
            created_at: randomPastDate(1, 5),
          },
        });
        stats.agentLogsCreated++;
      }
    }

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log('\n======================================================');
    console.log(`🎉 Safe Non-Destructive Seed Finished in ${elapsed}s!`);
    console.log('======================================================');
    console.log('📊 EXECUTION SUMMARY:');
    console.log(`   - Organizations:       ${stats.orgsCreated} created, ${stats.orgsPreserved} preserved`);
    console.log(`   - HR Accounts:         ${stats.hrCreated} created, ${stats.hrPreserved} preserved`);
    console.log(`   - Candidate Profiles:  ${stats.candidatesCreated} created, ${stats.candidatesPreserved} preserved`);
    console.log(`   - Job Postings:        ${stats.jobsCreated} created, ${stats.jobsPreserved} preserved`);
    console.log(`   - Applications:        ${stats.appsCreated} created, ${stats.appsPreserved} preserved`);
    console.log(`   - Assessments:         ${stats.assessmentsCreated} created, ${stats.assessmentsPreserved} preserved`);
    console.log(`   - Coding Submissions:  ${stats.codingSubmissionsCreated} created, ${stats.codingSubmissionsPreserved} preserved`);
    console.log(`   - Interviews:          ${stats.interviewsCreated} created, ${stats.interviewsPreserved} preserved`);
    console.log(`   - Evaluations:         ${stats.evaluationsCreated} created, ${stats.evaluationsPreserved} preserved`);
    console.log(`   - Offers Extended:     ${stats.offersCreated} created, ${stats.offersPreserved} preserved`);
    console.log(`   - Talent Bookmarks:    ${stats.bookmarksCreated} created, ${stats.bookmarksPreserved} preserved`);
    console.log(`   - Notifications:       ${stats.notificationsCreated} created, ${stats.notificationsPreserved} preserved`);
    console.log(`   - Prep Modules:        ${stats.prepCreated} verified`);
    console.log('------------------------------------------------------');
    console.log('🔑 TEST ACCOUNTS (Password: 123456789):');
    console.log('   HR Recruiter Login:');
    console.log('     Email:    steve.hr@gmail.com');
    console.log('     Org:      RazorFlow Technologies');
    console.log('   Candidate Login:');
    console.log('     Email:    pratham@gmail.com');
    console.log('     Profile:  Senior Full-Stack Engineer (6 applications, 1 offer)');
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Safe seed encountered an error:', error);
    throw error;
  } finally {
    if (lockAcquired) {
      console.log('🔓 Releasing PostgreSQL advisory lock on dedicated session...');
      try {
        await lockClient.query('SELECT pg_advisory_unlock($1);', [SEED_LOCK_ID]);
        console.log('✅ Dedicated session advisory lock released cleanly.');
      } catch (unlockErr) {
        console.error('Failed to release advisory lock:', unlockErr);
      }
    }
    await lockClient.end().catch(() => {});
    await prisma.$disconnect().catch(() => {});
  }
}

// When executed directly via CLI
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { main as safeSeed };
