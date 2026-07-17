'use client';

import { useState, useEffect, useRef } from 'react';
import { getTopicsForRoleAndCompany, defaultAnswers } from '@/lib/interviewTopics';
import { evaluateInterview } from '@/lib/interviewScorer';

export interface Message {
  id: string;
  role: 'ai' | 'candidate';
  content: string;
  timestamp: string;
}

export type InterviewPhase = 'Introduction' | 'Core Vetting' | 'Deep-Dive' | 'Wrap-up';

interface UseInterviewSessionProps {
  company: string;
  role: string;
  difficulty: string;
  storageKey: string;
  onComplete: (data: unknown) => void;
}

export function useInterviewSession({
  company,
  role,
  storageKey,
  onComplete,
}: UseInterviewSessionProps) {
  const [stage, setStage] = useState<'check' | 'session' | 'fallback'>('check');
  const [phase, setPhase] = useState<InterviewPhase>('Introduction');
  const [messages, setMessages] = useState<Message[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(900); // 15 mins
  const [micActive, setMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  
  const topicIndex = useRef(0);
  const isFollowUp = useRef(false);
  const transcriptData = useRef<{ question: string; answer: string; feedback: string }[]>([]);

  const topics = getTopicsForRoleAndCompany(role, company);

  useEffect(() => {
    if (stage !== 'session' && stage !== 'fallback') return;
    const t = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [stage]);

  const startSession = () => {
    setStage('session');
    setPhase('Introduction');
    setIsAnalyzing(true);
    setTimeout(() => {
      setMessages([
        {
          id: 'ai-init',
          role: 'ai',
          content: `Hello! Welcome to your interview for the ${role} position at ${company}. I am your AI Vetting Agent. Let's begin. ${topics[0].question}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      setIsAnalyzing(false);
    }, 1500);
  };

  const submitAnswer = (text: string) => {
    if (!text.trim() || isAnalyzing) return;

    const timestamp = new Date().toLocaleTimeString();
    setMessages((prev) => [...prev, { id: `c-${Date.now()}`, role: 'candidate', content: text, timestamp }]);
    setIsAnalyzing(true);

    setTimeout(() => {
      const currentTopic = topics[topicIndex.current];
      
      if (!isFollowUp.current) {
        transcriptData.current.push({
          question: currentTopic.question,
          answer: text,
          feedback: `Good initial details on ${currentTopic.topic}.`
        });

        setPhase('Deep-Dive');
        isFollowUp.current = true;
        setMessages((prev) => [
          ...prev,
          { id: `ai-${Date.now()}`, role: 'ai', content: currentTopic.followUp, timestamp: new Date().toLocaleTimeString() }
        ]);
        setIsAnalyzing(false);
      } else {
        transcriptData.current[topicIndex.current] = {
          ...transcriptData.current[topicIndex.current],
          feedback: transcriptData.current[topicIndex.current].feedback + ` Follow-up detail: "${text.slice(0, 60)}...".`
        };

        isFollowUp.current = false;
        topicIndex.current += 1;

        if (topicIndex.current < topics.length) {
          setPhase('Core Vetting');
          setMessages((prev) => [
            ...prev,
            { id: `ai-${Date.now()}`, role: 'ai', content: `Got it. Let's move to the next area. ${topics[topicIndex.current].question}`, timestamp: new Date().toLocaleTimeString() }
          ]);
          setIsAnalyzing(false);
        } else {
          setPhase('Wrap-up');
          setMessages((prev) => [
            ...prev,
            { id: `ai-${Date.now()}`, role: 'ai', content: `Thank you, that covers the core technical dimensions. I will compile the report now.`, timestamp: new Date().toLocaleTimeString() }
          ]);
          setIsAnalyzing(false);
          setTimeout(handleComplete, 3000);
        }
      }
    }, 2000);
  };

  const handleComplete = () => {
    const results = evaluateInterview({ role, topics, transcriptData: transcriptData.current });
    localStorage.setItem(storageKey, JSON.stringify(results));
    onComplete(results);
  };

  const simulateSpeaking = () => {
    if (isSimulating || isAnalyzing) return;
    setIsSimulating(true);

    const currentTopic = topics[topicIndex.current];
    const targetQuestion = messages[messages.length - 1]?.content || '';
    const answer = defaultAnswers[targetQuestion] || defaultAnswers[currentTopic.question] || 'I would organize modular layers and validate inputs.';

    let currentLen = 0;
    const words = answer.split(' ');
    let currentText = '';

    const interval = setInterval(() => {
      if (currentLen < words.length) {
        currentText += (currentLen > 0 ? ' ' : '') + words[currentLen];
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'candidate' && last.id.startsWith('c-sim-')) {
            last.content = currentText;
            return next;
          } else {
            return [...next, { id: `c-sim-${Date.now()}`, role: 'candidate', content: currentText, timestamp: new Date().toLocaleTimeString() }];
          }
        });
        currentLen++;
      } else {
        clearInterval(interval);
        setIsSimulating(false);
        setMessages((prev) => prev.filter(m => !m.id.startsWith('c-sim-')));
        submitAnswer(answer);
      }
    }, 100);
  };

  return {
    stage,
    phase,
    messages,
    timeRemaining,
    micActive,
    camActive,
    isAnalyzing,
    isSimulating,
    startSession,
    submitAnswer,
    simulateSpeaking,
    wrapUp: handleComplete,
    toggleMic: () => setMicActive(p => !p),
    toggleCam: () => setCamActive(p => !p),
    setStage,
  };
}
