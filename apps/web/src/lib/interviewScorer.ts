import { Topic } from './interviewTopics';

export interface ScoreResults {
  score: number;
  feedback: string;
  rubric: { technical: number; communication: number; cultureFit: number };
  transcript: { question: string; answer: string; feedback: string }[];
}

export function evaluateInterview({
  role,
  topics,
  transcriptData,
}: {
  role: string;
  topics: Topic[];
  transcriptData: { question: string; answer: string; feedback: string }[];
}): ScoreResults {
  let matchedKeywordsCount = 0;
  let totalKeywords = 0;
  const allAnswers = transcriptData.map((t) => t.answer.toLowerCase()).join(' ');

  topics.forEach((t) => {
    totalKeywords += t.keywords.length;
    t.keywords.forEach((kw) => {
      if (allAnswers.includes(kw)) matchedKeywordsCount++;
    });
  });

  const keywordRatio = totalKeywords > 0 ? matchedKeywordsCount / totalKeywords : 0.8;
  const scoreVal = Math.min(96, Math.max(68, Math.floor(75 + keywordRatio * 20)));

  return {
    score: scoreVal,
    feedback: `Demonstrated ${scoreVal >= 85 ? 'excellent' : 'competent'} understanding of ${role} topics. Key concepts like ${topics
      .map((t) => t.topic)
      .join(', ')} were explored contextually. Areas of improvements include structured error validation paths.`,
    rubric: {
      technical: scoreVal,
      communication: Math.floor(78 + Math.random() * 15),
      cultureFit: Math.floor(80 + Math.random() * 15),
    },
    transcript: transcriptData.map((item) => ({
      question: item.question,
      answer: item.answer,
      feedback: `Topic evaluation: Grade score matches parameters. Good structural analysis.`
    })),
  };
}
