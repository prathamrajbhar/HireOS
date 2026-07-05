'use client';

import React, { useState } from 'react';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import { Check, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function PricingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const plans = [
    {
      name: 'Free Launch Tier',
      price: '$0',
      description: 'Fully active tier for startups and candidates. Experience the future of recruitment with zero upfront fees.',
      features: [
        'Post up to 3 active jobs',
        'AI Rubric Assist extractor',
        'Live voice interview room (WebRTC simulated)',
        'Unified candidate profiles',
        'Composite scoring & basic audit logs',
      ],
      buttonText: 'Get Started Now',
      active: true,
    },
    {
      name: 'Professional Scale',
      price: 'Coming Soon',
      description: 'Advanced routing configurations, high-throughput queues, and automatic candidate sourcing integrations.',
      features: [
        'Unlimited active job openings',
        'Custom voice interviewer configuration',
        'Advanced double-pass bias audit reports',
        'Google Calendar scheduler sync',
        'Team permission roles (admin, reviewer)',
      ],
      buttonText: 'Join Waitlist',
      active: false,
    },
  ];

  const faqs = [
    {
      question: 'Is it actually free to use?',
      answer: 'Yes! The current launch release is completely free for both companies posting jobs and candidates looking for roles. No billing integration is active in this phase.',
    },
    {
      question: 'How does the AI voice interview work?',
      answer: 'Candidates select an interview slot. When joining, they enter our live room where an Interviewer Agent reads questions and transcribes candidate answers in real time. It automatically handles latency dips by switching to text fallback if necessary.',
    },
    {
      question: 'Is my candidate data secure?',
      answer: 'Absolutely. We enforce strict PostgreSQL schemas with Prisma-guided tenant isolation. Recruiter Org A can never access Candidate profiles applied to Org B unless they explicitly share consent.',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <PublicNavbar />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full animate-in fade-in duration-200">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Pricing blueprint</span>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
            Plans for Teams of All Sizes
          </h1>
          <p className="mt-4 text-slate-600 text-sm max-w-xl mx-auto leading-relaxed">
            Choose a plan that fits your recruiting volume. Experience automated AI pipelines without human overhead.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-20">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`rounded-3xl border p-8 shadow-sm flex flex-col justify-between glass-panel relative ${
                plan.active 
                  ? 'border-indigo-200 bg-white/50 shadow-md ring-2 ring-indigo-500/10' 
                  : 'border-slate-200 bg-white/20 opacity-80'
              }`}
            >
              {plan.active && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider shadow">
                  Currently Active
                </span>
              )}
              <div>
                <h3 className="text-lg font-bold text-slate-800">{plan.name}</h3>
                <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">{plan.description}</p>
                
                <div className="my-6">
                  <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                  {plan.active && <span className="text-xs text-slate-500 font-semibold ml-1">/ lifetime</span>}
                </div>

                <ul className="space-y-3.5 border-t border-slate-100 pt-6">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-600 font-semibold">
                      <Check className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                {plan.active ? (
                  <button className="w-full text-center rounded-full bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-700 shadow transition-all cursor-pointer">
                    {plan.buttonText}
                  </button>
                ) : (
                  <button className="w-full text-center rounded-full bg-slate-100 py-3 text-xs font-bold text-slate-400 border border-slate-200 transition-all cursor-not-allowed">
                    {plan.buttonText}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-2xl mx-auto border-t border-slate-200 pt-16">
          <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/60 bg-white/40 shadow-sm backdrop-blur-md glass-panel overflow-hidden"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full px-6 py-4 flex justify-between items-center text-left font-bold text-sm text-slate-800 hover:bg-white/30 transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <HelpCircle className="h-4.5 w-4.5 text-indigo-500" />
                      {faq.question}
                    </span>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-4 pt-1 text-xs text-slate-600 border-t border-slate-100/50 leading-relaxed font-semibold">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
