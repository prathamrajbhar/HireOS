'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Scale,
  Clock
} from 'lucide-react';

export default function HrAnalyticsDashboard() {
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);

  const funnelSteps = [
    { name: 'Sourced Candidates', count: 54, pct: 100 },
    { name: 'AI Screened', count: 32, pct: 59 },
    { name: 'Interviews Completed', count: 18, pct: 33 },
    { name: 'Hiring Decisions', count: 8, pct: 14 }
  ];

  // Data for Vetting throughput trends
  const trendData = [
    { month: 'Jan', count: 24, rate: 68 },
    { month: 'Feb', count: 45, rate: 72 },
    { month: 'Mar', count: 38, rate: 70 },
    { month: 'Apr', count: 70, rate: 78 },
    { month: 'May', count: 56, rate: 75 },
    { month: 'Jun', count: 85, rate: 81 },
    { month: 'Jul', count: 98, rate: 85 },
  ];

  // SVG Coordinates calculation for 500x200 viewport
  // X: 40 to 460
  // Y: 20 to 160 (mapped from value 0 to 100)
  const getSvgCoordinates = () => {
    const width = 420; // 460 - 40
    const height = 140; // 160 - 20
    const points = trendData.map((d, i) => {
      const x = 40 + (i * (width / (trendData.length - 1)));
      const y = 160 - ((d.count / 100) * height);
      return { x, y, ...d };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} 160 L ${points[0].x} 160 Z`;

    return { points, linePath, areaPath };
  };

  const { points, linePath, areaPath } = getSvgCoordinates();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Page Header */}
      <div className="border-b border-slate-200/80 pb-4">
        <span className="text-xs font-bold text-purple-600 uppercase tracking-widest block mb-1">
          Intelligence Console
        </span>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hiring Analytics</h1>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Review recruiting volume conversion funnels, monthly interview completion trends, and bias check aggregate reports.
        </p>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

        <div className="rounded-3xl border border-white/60 bg-white/70 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md glass-panel flex items-center gap-4 hover:scale-[1.01] transition-transform">
          <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-inner">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-xl font-extrabold text-slate-800 leading-none">42 Hours</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">Avg Time-to-Hire</span>
          </div>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/70 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md glass-panel flex items-center gap-4 hover:scale-[1.01] transition-transform">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-inner">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-xl font-extrabold text-slate-800 leading-none">98.5%</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">Bias Norm Compliance</span>
          </div>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/70 p-5 shadow-xl shadow-slate-200/35 backdrop-blur-md glass-panel flex items-center gap-4 hover:scale-[1.01] transition-transform">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-xl font-extrabold text-slate-800 leading-none">74%</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">Hiring Conversion Gain</span>
          </div>
        </div>

      </div>

      {/* Main Charts Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left Column: Funnel & Line Chart */}
        <div className="lg:col-span-2 space-y-6">

          {/* SVG Trend Line Chart */}
          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 md:p-8 shadow-md backdrop-blur-md glass-panel space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <BarChart3 className="h-4.5 w-4.5 text-purple-600" />
                Hiring Activity Trend
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" />
                +25% MoM
              </span>
            </div>

            {/* SVG Plot */}
            <div className="relative">
              <svg className="w-full h-auto" viewBox="0 0 500 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Grids */}
                <line x1="40" y1="20" x2="460" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />
                <line x1="40" y1="55" x2="460" y2="55" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />
                <line x1="40" y1="90" x2="460" y2="90" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />
                <line x1="40" y1="125" x2="460" y2="125" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />
                <line x1="40" y1="160" x2="460" y2="160" stroke="#e2e8f0" strokeWidth="1" />

                {/* Y Axis Labels */}
                <text x="15" y="24" fill="#94a3b8" fontSize="8" fontWeight="bold" fontFamily="monospace">100</text>
                <text x="15" y="94" fill="#94a3b8" fontSize="8" fontWeight="bold" fontFamily="monospace">50</text>
                <text x="20" y="164" fill="#94a3b8" fontSize="8" fontWeight="bold" fontFamily="monospace">0</text>

                {/* Area Gradient Fill */}
                <path d={areaPath} fill="url(#purpleAreaGrad)" />

                {/* Line Path */}
                <path d={linePath} stroke="url(#purpleLineGrad)" strokeWidth="3" strokeLinecap="round" />

                {/* Interactive Points */}
                {points.map((p, idx) => (
                  <g key={idx} className="cursor-pointer group" onMouseEnter={() => setActiveTooltip(idx)} onMouseLeave={() => setActiveTooltip(null)}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={activeTooltip === idx ? '6' : '4'}
                      fill={activeTooltip === idx ? '#9333ea' : '#a855f7'}
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="transition-all duration-150"
                    />
                  </g>
                ))}

                {/* X Axis Labels */}
                {points.map((p, idx) => (
                  <text
                    key={idx}
                    x={p.x}
                    y="180"
                    fill={activeTooltip === idx ? '#7c3aed' : '#64748b'}
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {p.month}
                  </text>
                ))}

                {/* Definitions */}
                <defs>
                  <linearGradient id="purpleLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                  <linearGradient id="purpleAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(168, 85, 247, 0.15)" />
                    <stop offset="100%" stopColor="rgba(99, 102, 241, 0.0)" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Tooltip Hover Overlay */}
              {activeTooltip !== null && (
                <div
                  className="absolute bg-slate-900 text-white rounded-xl p-2.5 shadow-xl text-[10px] pointer-events-none space-y-0.5 border border-slate-800 animate-in fade-in zoom-in-95 duration-100"
                  style={{
                    left: `${(points[activeTooltip].x / 500) * 100}%`,
                    top: `${(points[activeTooltip].y / 200) * 100 - 30}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <span className="block font-black text-slate-400 uppercase tracking-wider leading-none">
                    {trendData[activeTooltip].month} Session
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-extrabold text-white">Throughput: {trendData[activeTooltip].count}</span>
                    <span className="text-emerald-400 font-bold">({trendData[activeTooltip].rate}% rate)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 md:p-8 shadow-md backdrop-blur-md glass-panel space-y-6">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2.5">
              Hiring Conversion Funnel
            </h3>

            <div className="space-y-4">
              {funnelSteps.map((step, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>{step.name}</span>
                    <span className="text-slate-400 font-extrabold">{step.count} ({step.pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-200/50 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-indigo-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${step.pct}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Diversity & Distribution */}
        <div className="space-y-6">

          {/* Diversity Check Index */}
          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-md backdrop-blur-md glass-panel space-y-4">
            <div className="border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-black text-slate-900">Diversity Check Index</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Demographics audit</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Anonymized metrics report variance comparison ratios between different genders and regional schools.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                  <span>Gender Variance Score</span>
                  <span className="text-emerald-600 font-bold">0.02% variance</span>
                </div>
                <div className="w-full bg-slate-200/50 rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-1.5 rounded-full" style={{ width: '99%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                  <span>School Origin Weighting</span>
                  <span className="text-emerald-600 font-bold">0.05% variance</span>
                </div>
                <div className="w-full bg-slate-200/50 rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-1.5 rounded-full" style={{ width: '98%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Vetting Distribution Donuts */}
          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-md backdrop-blur-md glass-panel space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2.5">
              Interviews by Domain
            </h3>

            <div className="flex items-center gap-6 py-2">
              {/* SVG Donut */}
              <div className="relative h-20 w-20 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                  {/* segment 1: Frontend (45%) */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#a855f7" strokeWidth="4" strokeDasharray="45 100" strokeDashoffset="0" />
                  {/* segment 2: Backend (35%) */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#6366f1" strokeWidth="4" strokeDasharray="35 100" strokeDashoffset="-45" />
                  {/* segment 3: PM (20%) */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="20 100" strokeDashoffset="-80" />
                </svg>
              </div>

              {/* Legends */}
              <div className="space-y-2 min-w-0 flex-grow">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    Frontend
                  </span>
                  <span className="text-slate-800">45%</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    Backend
                  </span>
                  <span className="text-slate-800">35%</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Product
                  </span>
                  <span className="text-slate-800">20%</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
