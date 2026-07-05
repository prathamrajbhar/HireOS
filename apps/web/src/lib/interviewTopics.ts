export interface Topic {
  topic: string;
  question: string;
  followUp: string;
  keywords: string[];
}

export const getTopicsForRoleAndCompany = (role: string, company: string): Topic[] => {
  const r = role.toLowerCase();
  const c = company.toLowerCase();

  if (r.includes('frontend') || r.includes('developer') || r.includes('engineer') && !r.includes('backend')) {
    if (c.includes('swiggy')) {
      return [
        {
          topic: 'Swiggy Menu Virtualization',
          question: 'How would you optimize list rendering for a food delivery menu containing thousands of nested items?',
          followUp: 'That makes sense. But how would you handle dynamic item heights depending on varying image aspect ratios and description texts without causing Cumulative Layout Shift (CLS)?',
          keywords: ['virtual', 'window', 'aspect', 'cls', 'preload', 'memo']
        },
        {
          topic: 'Micro-Frontend Federation',
          question: 'How would you build a micro-frontend shell for Swiggy that loads checkouts and tracking portals independently?',
          followUp: 'Excellent. What strategy would you use to share user authentication tokens and common cart states securely between these federated modules?',
          keywords: ['federation', 'webpack', 'iframe', 'event', 'context', 'storage']
        }
      ];
    }
    return [
      {
        topic: 'Web Performance Optimization',
        question: 'Explain how you optimize load times for large image galleries on slow cellular connections.',
        followUp: 'Good. How do you handle lazy loading placeholder generation, and how would you implement fallback handling if an asset fails to download?',
        keywords: ['lazy', 'placeholder', 'blurhash', 'webp', 'srcset', 'fallback']
      },
      {
        topic: 'API Integration boundaries',
        question: 'Describe your experience configuring strict type boundaries in complex API response layers.',
        followUp: 'Right. How do you handle runtime payload validation (e.g. Zod or runtypes) if the server suddenly sends unexpected nullable fields?',
        keywords: ['type', 'zod', 'validation', 'nullable', 'schema', 'typescript']
      }
    ];
  }

  if (r.includes('product') || r.includes('pm')) {
    return [
      {
        topic: 'UPI Intent Localizations',
        question: 'How would you design a localized UPI payment checkout experience that optimizes for speed and success rates?',
        followUp: 'Interesting. If a specific UPI app has a high failure rate, how would you direct user flow without making the UI feel cluttered or pushy?',
        keywords: ['intent', 'upi', 'success', 'routing', 'latency', 'fallback']
      },
      {
        topic: 'Transaction Retries',
        question: 'How do you design a retry logic policy for failed credit card checkout authorizations?',
        followUp: 'Okay. How do you balance merchant billing safety (preventing double-spend) with candidate UX during automatic retries?',
        keywords: ['retry', 'idempotency', 'lock', 'ledger', 'backoff', 'notification']
      }
    ];
  }

  // Default fallback
  return [
    {
      topic: 'Architectural Scale',
      question: 'How do you approach scaling a distributed service that handles highly concurrent read/write ratios?',
      followUp: 'Understood. How would you handle database lock contention if thousands of users try to update the exact same ledger row concurrently?',
      keywords: ['concurrency', 'lock', 'scale', 'cache', 'redis', 'replica']
    },
    {
      topic: 'Engineering Collaboration',
      question: 'Tell me about a time you handled a feature dispute with a product manager.',
      followUp: 'Nice. How did you verify the final trade-off, and what metrics did you use to evaluate if your technical compromise was successful?',
      keywords: ['compromise', 'metrics', 'communication', 'vitals', 'data', 'collaboration']
    }
  ];
};

export const defaultAnswers: Record<string, string> = {
  'How would you optimize list rendering for a food delivery menu containing thousands of nested items?': 
    'I would implement windowed list rendering using react-window or custom virtualization. By rendering only the items visible in the viewport and a small buffer, we keep the DOM node count low, significantly improving scroll performance and reducing layout calculation times.',
  'That makes sense. But how would you handle dynamic item heights depending on varying image aspect ratios and description texts without causing Cumulative Layout Shift (CLS)?':
    'To prevent CLS, I would reserve explicit boxes using aspect-ratio rules or load skeletal screens. For dynamic heights, we can measure cell heights on mounting and cache them, using dynamic sizing keys, or use CSS grid setups with fixed content zones.',
  'How would you build a micro-frontend shell for Swiggy that loads checkouts and tracking portals independently?':
    'I would use Webpack Module Federation to load build segments at runtime. The shell app acts as host, routing paths to remote entry URLs. We contain CSS using modular selectors or Tailwind prefixes.',
  'Excellent. What strategy would you use to share user authentication tokens and common cart states securely between these federated modules?':
    'We can use local storage combined with a lightweight custom event broker at the window level, or share a common state hook bundled in a shared dependency library.',
  'Explain how you optimize load times for large image galleries on slow cellular connections.':
    'I would use srcset for responsive sizes, convert images to modern formats like WebP or AVIF, and load low-resolution placeholders generated via Blurhash strings to keep users engaged.',
  'Good. How do you handle lazy loading placeholder generation, and how would you implement fallback handling if an asset fails to download?':
    'Placeholders are generated server-side during static building. For loading failures, we add onError handlers to the image tags that dynamically swap the src with a fallback SVG icon.',
  'Describe your experience configuring strict type boundaries in complex API response layers.':
    'I enforce strict types on all fetch clients. We create typescript interfaces representing backend models and map incoming raw responses to clean UI objects.',
  'Right. How do you handle runtime payload validation (e.g. Zod or runtypes) if the server suddenly sends unexpected nullable fields?':
    'We run Zod parse checks at the boundary. If the check fails, the schema catches it, default values are filled in, and it reports a silent logger event instead of breaking the entire app.',
  'How would you design a localized UPI payment checkout experience that optimizes for speed and success rates?':
    'I would implement a direct UPI intent integration. It detects GPay or PhonePe apps on the phone and launches them directly, prefilling the transaction parameters.',
  'Interesting. If a specific UPI app has a high failure rate, how would you direct user flow without making the UI feel cluttered or pushy?':
    'We track bank failure metrics on our server. If failures exceed a threshold, we show a small warning indicator saying "High failure rate currently" and list alternate UPI options.',
  'How do you design a retry logic policy for failed credit card checkout authorizations?':
    'We use immediate exponential backoff retries with random jitter for connection drops. If it is an auth error, we present the descriptive error directly so they can choose other cards.',
  'Okay. How do you balance merchant billing safety (preventing double-spend) with candidate UX during automatic retries?':
    'We include a unique idempotency key with every payment request. If the connection drops and we retry, the server recognizes the key and returns the existing transaction state instead of charging again.',
  'How do you approach scaling a distributed service that handles highly concurrent read/write ratios?':
    'I would implement read replicas for databases, distribute load with Nginx, and place Redis caches in front of database layers for frequently queried reads.',
  'Understood. How would you handle database lock contention if thousands of users try to update the exact same ledger row concurrently?':
    'I would implement optimistic locking with version columns, or enqueue updates into a message queue (like RabbitMQ) to serialize writes on that row.',
  'Tell me about a time you handled a feature dispute with a product manager.':
    'The PM wanted to track user actions instantly, creating heavy network lag. I compiled latency metrics in DevTools and proposed batching logs together in intervals.',
  'Nice. How did you verify the final trade-off, and what metrics did you use to evaluate if your technical compromise was successful?':
    'We monitored layout load times and API error rates before and after the batching launch. It reduced client CPU load by 35% while capturing 100% of logs.'
};
