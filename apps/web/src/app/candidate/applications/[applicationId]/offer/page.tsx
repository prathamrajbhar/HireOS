'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { mockOffers } from '@/lib/mockData';
import { ChevronRight, Gift, MessageSquare, Send, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { getCompanyDomain } from '@/utils/logo';

export default function CandidateOfferPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = use(params);

  const initialOffer = mockOffers.find((o) => o.applicationId === applicationId) || mockOffers[0];
  const [offer, setOffer] = useState(initialOffer);
  const [negotiationMsg, setNegotiationMsg] = useState('');
  const [counterSalary, setCounterSalary] = useState('');
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [actionDone, setActionDone] = useState<'accepted' | 'declined' | null>(null);

  const handleSendNegotiation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!negotiationMsg.trim()) return;

    const newMessage = {
      id: `neg-${Date.now()}`,
      author: 'candidate' as const,
      message: negotiationMsg,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      proposedSalary: counterSalary.trim() || undefined,
    };

    setOffer({
      ...offer,
      status: 'negotiating',
      negotiationHistory: [...offer.negotiationHistory, newMessage],
    });

    setNegotiationMsg('');
    setCounterSalary('');
  };

  const handleAccept = () => {
    setOffer({ ...offer, status: 'accepted' });
    setActionDone('accepted');
    setShowAcceptModal(false);
  };

  const handleDecline = () => {
    setOffer({ ...offer, status: 'declined' });
    setActionDone('declined');
    setShowDeclineModal(false);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'Accepted';
      case 'declined':
        return 'Declined';
      case 'negotiating':
        return 'Negotiating';
      case 'offered':
        return 'Offered';
      default:
        return status;
    }
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'declined':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'negotiating':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <Link href="/candidate/applications" className="hover:text-indigo-650 transition-colors">Applications</Link>
        <ChevronRight className="h-3 w-3 text-slate-300" />
        <Link href={`/candidate/applications/${applicationId}`} className="hover:text-indigo-655 transition-colors">{offer.jobTitle}</Link>
        <ChevronRight className="h-3 w-3 text-slate-300" />
        <span className="text-slate-800">Offer Letter</span>
      </div>

      {/* Title block */}
      <div className="rounded-3xl border border-white/60 bg-white/45 p-6 shadow-md backdrop-blur-md glass-panel flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200 p-0.5 shadow-sm overflow-hidden flex-shrink-0">
            <img
              src={`https://logo.clearbit.com/${getCompanyDomain(offer.orgName)}`}
              alt={offer.orgName}
              className="h-full w-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Offer Letter</h1>
            <p className="text-xs text-slate-550 font-semibold">{offer.jobTitle} at <span className="text-indigo-605 font-bold">{offer.orgName}</span></p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${getStatusPill(offer.status)}`}>
          {getStatusLabel(offer.status)}
        </span>
      </div>

      {actionDone && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 shadow-sm ${
          actionDone === 'accepted'
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          {actionDone === 'accepted' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 text-rose-500 mt-0.5" />
          )}
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wide">
              {actionDone === 'accepted' ? 'Offer Accepted!' : 'Offer Declined'}
            </h4>
            <p className="text-[11px] font-medium opacity-90 leading-relaxed">
              {actionDone === 'accepted'
                ? "Congratulations! You have signed and accepted the offer. The HR team will contact you shortly to complete onboarding paperwork."
                : "You have declined this offer. The recruiters have been notified of your decision."}
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Info + Negotiation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns: Offer details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-white/60 bg-white/45 p-6 sm:p-8 shadow-md backdrop-blur-md glass-panel space-y-6">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
              <Gift className="h-4.5 w-4.5 text-indigo-500" />
              Compensation Structure
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50/50 border border-slate-150 p-4 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Base Salary</span>
                <span className="text-xl font-extrabold text-slate-800 mt-1 block">{offer.baseSalary}</span>
                <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Annual CTC</span>
              </div>
              <div className="bg-slate-50/50 border border-slate-150 p-4 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Target Bonus</span>
                <span className="text-xs font-bold text-slate-800 mt-1 block line-clamp-2">{offer.bonus}</span>
              </div>
              <div className="bg-slate-50/50 border border-slate-150 p-4 rounded-2xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Stock Options</span>
                <span className="text-xs font-bold text-slate-800 mt-1 block line-clamp-2">{offer.equity}</span>
              </div>
            </div>

            {/* Dates & Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Timeline</h4>
                <div className="space-y-2 text-[11px] font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>Target Start Date</span>
                    <span className="text-slate-900 font-bold">{offer.joiningDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Offer Expiration</span>
                    <span className="text-slate-900 font-bold">{offer.expiryDate}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Benefits & Perks</h4>
                <ul className="space-y-1.5 text-[11px] font-semibold text-slate-505 list-disc list-inside">
                  {offer.benefits.map((benefit, idx) => (
                    <li key={idx} className="leading-relaxed">{benefit}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Letter PDF placeholder link */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500 font-semibold text-[11px]">
                <FileText className="h-4.5 w-4.5 text-indigo-500" />
                <span>swiggy_offer_letter.pdf</span>
              </div>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-xs font-bold text-indigo-650 hover:underline inline-flex items-center gap-1"
              >
                Download PDF Letter
              </a>
            </div>

            {/* Accept / Decline triggers */}
            {offer.status !== 'accepted' && offer.status !== 'declined' && (
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowAcceptModal(true)}
                  className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 text-xs shadow-md shadow-emerald-50 hover:shadow-lg transition-all cursor-pointer text-center"
                >
                  Accept & Sign Offer
                </button>
                <button
                  onClick={() => setShowDeclineModal(true)}
                  className="rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 font-bold py-3 px-6 text-xs transition-all cursor-pointer text-center"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Negotiation Console */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/60 bg-white/45 p-6 shadow-md backdrop-blur-md glass-panel flex flex-col h-[480px]">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2.5 mb-4 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-indigo-500" />
              Sourcing Negotiation Chat
            </h3>

            {/* Chat flow list */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4 scrollbar-thin">
              {offer.negotiationHistory.map((neg) => {
                const isHr = neg.author === 'hr';
                return (
                  <div key={neg.id} className={`flex flex-col max-w-[85%] ${isHr ? 'self-start' : 'self-end ml-auto'}`}>
                    <div className={`p-3 rounded-2xl text-[11px] leading-relaxed ${
                      isHr 
                        ? 'bg-slate-100 border border-slate-200 text-slate-700 rounded-tl-sm' 
                        : 'bg-indigo-600 text-white rounded-tr-sm'
                    }`}>
                      {neg.message}
                      {neg.proposedSalary && (
                        <span className={`block mt-1 font-bold text-[10px] ${isHr ? 'text-indigo-650' : 'text-emerald-300'}`}>
                          Proposed CTC: {neg.proposedSalary}
                        </span>
                      )}
                    </div>
                    <span className={`text-[8px] text-slate-400 font-semibold mt-1 px-1 ${!isHr && 'text-right'}`}>
                      {neg.timestamp}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Textarea submit counter form */}
            {offer.status !== 'accepted' && offer.status !== 'declined' && (
              <form onSubmit={handleSendNegotiation} className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Counter CTC (e.g. ₹38L)"
                    value={counterSalary}
                    onChange={(e) => setCounterSalary(e.target.value)}
                    className="w-1/3 px-3 py-2 text-[10px] font-bold rounded-xl border border-slate-200 bg-white/70 focus:outline-none focus:border-indigo-500"
                  />
                  <textarea
                    placeholder="Discuss compensation terms with recruiter..."
                    value={negotiationMsg}
                    onChange={(e) => setNegotiationMsg(e.target.value)}
                    required
                    rows={1}
                    className="flex-1 px-3 py-2 text-[11px] font-semibold rounded-xl border border-slate-200 bg-white/70 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center cursor-pointer flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>

      {/* Accept Confirmation Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-100 rounded-3xl border border-white/60 max-w-sm w-full p-6 space-y-6 shadow-2xl animate-in scale-in duration-200">
            <div className="text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-extrabold text-slate-900">Sign & Accept Offer</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                By clicking confirm, you legally accept the employment contract terms with Swiggy starting on {offer.joiningDate}.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs shadow-md cursor-pointer"
              >
                Sign Offer
              </button>
              <button
                onClick={() => setShowAcceptModal(false)}
                className="flex-1 rounded-full border border-slate-200 bg-white text-slate-600 font-bold py-2.5 text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Confirmation Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-100 rounded-3xl border border-white/60 max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in scale-in duration-200">
            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Decline Employment Offer</h3>
              <p className="text-xs text-slate-400 font-medium">Please let the Swiggy team know why you are declining.</p>
            </div>
            <textarea
              placeholder="e.g. Accepted another offer / Comp terms were not met..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white/70 focus:outline-none focus:border-rose-500"
            />
            <div className="flex gap-3">
              <button
                onClick={handleDecline}
                className="flex-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 text-xs shadow-md cursor-pointer"
              >
                Decline Offer
              </button>
              <button
                onClick={() => setShowDeclineModal(false)}
                className="flex-1 rounded-full border border-slate-200 bg-white text-slate-600 font-bold py-2.5 text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
