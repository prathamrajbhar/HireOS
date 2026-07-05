'use client';

import React, { useRef } from 'react';
import { Sparkles, Bold, Italic, List, Heading, FileText } from 'lucide-react';

interface JobDescriptionProps {
  jd: string;
  setJd: (val: string) => void;
  onAiAssist: () => void;
  assisting: boolean;
}

const TEMPLATES = [
  {
    name: 'Software Engineer',
    text: `### Role Overview\nWe are looking for a Senior Frontend Engineer to build high-performance web applications using React, TypeScript, and Next.js.\n\n### Key Responsibilities\n- Design and implement interactive, responsive user interfaces.\n- Optimize loading performance and web vitals.\n- Collaborate with backend engineers to integrate REST/GraphQL APIs.\n\n### Requirements\n- 5+ years of experience with modern frontend frameworks.\n- Strong expertise in TypeScript, TailwindCSS, and state management.\n- Experience with Next.js App Router and server components.`
  },
  {
    name: 'Product Manager',
    text: `### Role Overview\nWe are seeking a Technical Product Manager to lead the roadmap and execution of our recruitment automation platform.\n\n### Key Responsibilities\n- Define product requirements, user stories, and feature specifications.\n- Collaborate with engineering, design, and marketing to ship updates weekly.\n- Analyze product metrics and user feedback to prioritize the backlog.\n\n### Requirements\n- 4+ years of experience in product management for B2B SaaS products.\n- Deep understanding of API integrations, LLMs, or AI agent architectures.\n- Excellent communication and stakeholder management skills.`
  },
  {
    name: 'UX Designer',
    text: `### Role Overview\nWe are looking for a Senior Product Designer to craft intuitive, beautiful, and accessible recruitment workflows.\n\n### Key Responsibilities\n- Design wireframes, user flows, and interactive mockups.\n- Build and maintain our premium glassmorphic UI component library.\n- Conduct user research sessions and translate insights into design solutions.\n\n### Requirements\n- 5+ years of experience in UX/UI design for web and mobile products.\n- Proficiency in Figma and creating reusable design systems.\n- Strong portfolio demonstrating interactive prototyping and clean aesthetics.`
  }
];

export default function JobDescriptionCard({
  jd,
  setJd,
  onAiAssist,
  assisting,
}: JobDescriptionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = prefix + (selectedText || 'text') + suffix;

    setJd(text.substring(0, start) + replacement + text.substring(end));
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText || 'text').length);
    }, 0);
  };

  return (
    <div className="rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-md glass-panel space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4.5 w-4.5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-800">Job Description</h3>
        </div>
        <button
          type="button"
          onClick={onAiAssist}
          disabled={!jd || assisting}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-650 border border-purple-200 bg-purple-50 hover:bg-purple-100/80 px-3.5 py-1.5 rounded-full transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Sparkles className={`h-3.5 w-3.5 ${assisting ? 'animate-spin' : ''}`} />
          {assisting ? 'Parsing JD...' : 'AI Assist Extract'}
        </button>
      </div>

      {/* Templates Prefill */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Templates:</span>
        {TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.name}
            type="button"
            onClick={() => setJd(tmpl.text)}
            className="text-[10px] font-bold bg-white/60 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white px-2.5 py-1 rounded-lg transition-all cursor-pointer"
          >
            {tmpl.name}
          </button>
        ))}
      </div>

      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 bg-white/30 border border-slate-200/50 p-1.5 rounded-xl">
        <button
          type="button"
          onClick={() => applyFormat('**', '**')}
          title="Bold"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white/60 transition-all cursor-pointer"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('*', '*')}
          title="Italic"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white/60 transition-all cursor-pointer"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('\n- ')}
          title="Bullet List"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white/60 transition-all cursor-pointer"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('\n### ')}
          title="Header"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white/60 transition-all cursor-pointer"
        >
          <Heading className="h-3.5 w-3.5" />
        </button>
        <div className="h-4 w-px bg-slate-200 mx-2" />
        <span className="text-[10px] text-slate-400 font-bold ml-auto pr-2 select-none">
          {jd.length} chars
        </span>
      </div>

      {/* Editor Body */}
      <textarea
        ref={textareaRef}
        required
        rows={10}
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        placeholder="Paste roles, responsibilities, technical stacks, or select a template above to get started..."
        className="w-full px-4 py-3 text-xs rounded-2xl border border-slate-200/80 bg-white/50 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all glass-input leading-relaxed"
      />
    </div>
  );
}
