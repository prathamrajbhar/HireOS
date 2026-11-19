export type AssessmentDifficulty = 'easy' | 'intermediate' | 'advanced';

export interface AssessmentDifficultyDistribution {
  easy: number;
  intermediate: number;
  advanced: number;
}

export type AptitudeCategory =
  | 'Quantitative Aptitude'
  | 'Logical Reasoning'
  | 'Verbal Ability'
  | 'Data Interpretation';

export interface AssessmentQuestionPromptOptions {
  title?: string;
  description: string;
  skills?: string[];
  experienceLevel?: string;
  difficulty?: AssessmentDifficulty;
  categoryDistribution?: Record<string, number>;
  difficultyDistribution?: AssessmentDifficultyDistribution;
}

export function buildAssessmentQuestionGenPrompt(options: AssessmentQuestionPromptOptions): string {
  const {
    title = 'Software Engineer',
    description,
    skills = [],
    experienceLevel = 'Mid-Level',
    difficulty = 'intermediate',
    categoryDistribution,
    difficultyDistribution,
  } = options;

  let requirementsText = '';
  let totalRequired = 0;

  if (categoryDistribution && Object.keys(categoryDistribution).length > 0) {
    const lines: string[] = [];
    for (const [cat, count] of Object.entries(categoryDistribution)) {
      const num = Math.max(0, Number(count) || 0);
      if (num > 0) {
        totalRequired += num;
        lines.push(`- Category "${cat}": exactly ${num} question(s) at difficulty "${difficulty}".`);
      }
    }
    requirementsText = `TARGET DIFFICULTY LEVEL: "${difficulty}"\n` +
      `CATEGORY BREAKDOWN (Generate exactly the counts specified per category at "${difficulty}" difficulty):\n` +
      lines.join('\n');
  } else if (difficultyDistribution) {
    const lines: string[] = [];
    if (difficultyDistribution.easy > 0) {
      totalRequired += difficultyDistribution.easy;
      lines.push(`- Easy: exactly ${difficultyDistribution.easy} question(s).`);
    }
    if (difficultyDistribution.intermediate > 0) {
      totalRequired += difficultyDistribution.intermediate;
      lines.push(`- Intermediate: exactly ${difficultyDistribution.intermediate} question(s).`);
    }
    if (difficultyDistribution.advanced > 0) {
      totalRequired += difficultyDistribution.advanced;
      lines.push(`- Advanced: exactly ${difficultyDistribution.advanced} question(s).`);
    }
    requirementsText = `DIFFICULTY BREAKDOWN (across Quantitative Aptitude, Logical Reasoning, Verbal Ability, Data Interpretation):\n` +
      lines.join('\n');
  } else {
    totalRequired = 8;
    requirementsText = `Generate 8 questions at "${difficulty}" difficulty across Quantitative Aptitude, Logical Reasoning, Verbal Ability, and Data Interpretation (2 each).`;
  }

  return `You are a principal assessment designer and aptitude test architect for top enterprise companies.
Generate a high-quality, professional Multiple-Choice Assessment (MCQ) aligned with the provided Job Description and exact category & difficulty requirements.

ROLE CONTEXT:
- Target Role: ${title}
- Seniority / Level: ${experienceLevel}
- Core Skills: ${skills.join(', ') || 'Derived from role description'}
- Job Description:
${description.slice(0, 8000)}

EXACT QUANTITY & CATEGORY REQUIREMENTS (Total ${totalRequired} questions):
${requirementsText}

SPECIFIC APTITUDE CATEGORIES GUIDE:
1. "Quantitative Aptitude": Numerical problem solving, arithmetic/algebra/geometry/percentages/ratios, computational math, estimation. Contextualize problem statements to real-world software, product, data, or business scenarios when possible.
2. "Logical Reasoning": Deductive & inductive logic, pattern recognition, syllogisms, condition evaluation, sequencing, critical thinking, workflow analysis.
3. "Verbal Ability": Technical comprehension, written communication clarity, grammar, critical passage reading, professional nuance, vocabulary in business/tech contexts.
4. "Data Interpretation": Analysis of tables, metrics, charts, percentages, error rates, system uptime data, and statistical deduction from datasets.

DIFFICULTY GUIDELINES:
- "easy": Foundational logic, direct calculations, unambiguous reading comprehension, standard patterns.
- "intermediate": Multi-step reasoning, realistic business/system scenarios, analytical deduction, situational trade-offs.
- "advanced": Complex multi-variable problem solving, dense data sets, tricky edge cases, deep deductive logic.

MANDATORY RULES:
1. Generate EXACTLY the requested number of questions for each category. Do NOT omit any requested category or add extra questions.
2. Every question MUST set "difficulty" to "${difficulty}".
3. Every question MUST set "category" strictly to one of: "Quantitative Aptitude", "Logical Reasoning", "Verbal Ability", or "Data Interpretation" (matching the requested categories).
4. Every question must have:
   - "id": Unique string identifier (e.g. "q_qa_1", "q_lr_1", "q_va_1", "q_di_1").
   - "difficulty": "${difficulty}".
   - "category": Exact category name.
   - "question": Clear, unambiguous, professional question prompt.
   - "options": Exactly 4 distinct, plausible options [Option 0, Option 1, Option 2, Option 3].
   - "correctIndex": Integer index (0, 1, 2, or 3) indicating the single correct answer.
   - "explanation": 1-2 concise sentences detailing why the correct answer is right and why others are wrong.
5. No duplicates, no trivia, zero ambiguity, and high mathematical and logical accuracy.

Return ONLY a valid JSON object matching this schema:
{
  "questions": [
    {
      "id": string,
      "difficulty": "easy" | "intermediate" | "advanced",
      "category": string,
      "question": string,
      "options": string[],
      "correctIndex": number,
      "explanation": string
    }
  ]
}
`;
}

export interface ParseQuestionBankPromptOptions {
  roleTitle?: string;
}

export function buildParseQuestionBankPrompt(
  documentText: string,
  options?: ParseQuestionBankPromptOptions
): string {
  const roleContext = options?.roleTitle ? `Target Role Context: ${options.roleTitle}\n` : '';

  return `You are an expert assessment examiner and test digitization AI.
You have been provided with raw text extracted from a user-uploaded Question Bank PDF.
${roleContext}
Your objective is to identify and extract all Multiple Choice Questions (MCQs) and questions with answer choices from the document text.

DOCUMENT TEXT:
${documentText.slice(0, 30000)}

PARSING RULES:
1. Extract all questions contained in the text.
2. For each question:
   - "id": A unique identifier such as "bank_q_1", "bank_q_2", etc.
   - "question": Clean, complete question text without leading numbering like "1." or "Q1:".
   - "options": Array of 2 to 5 distinct answer choices as strings. Strip any leading labels like "A.", "B)", "(c)", "1.", etc., so options are clean text.
   - "correctIndex": The 0-based integer index of the correct answer (0 for first option, 1 for second option, etc.).
     - If the document contains an answer key, marked answer, or explanation indicating the correct choice, extract and map that exact option index.
     - If no answer key is indicated in the text, use expert domain knowledge to determine the single correct choice and set its index.
   - "difficulty": "easy" | "intermediate" | "advanced" based on the complexity and cognitive depth of the question.
   - "category": Categorize into the most appropriate category, such as "Quantitative Aptitude", "Logical Reasoning", "Verbal Ability", "Data Interpretation", or a specific domain/technical category present in the document.
   - "explanation": Concise explanation of why the correct choice is right (extract from the document if provided, otherwise provide a brief, clear explanation).
3. Do NOT invent questions that are not present in the document. Only parse the questions contained in the text.
4. If there are multiple sections or numbered questions, extract each one as a distinct question object.

Return ONLY a valid JSON object matching this schema:
{
  "questions": [
    {
      "id": string,
      "difficulty": "easy" | "intermediate" | "advanced",
      "category": string,
      "question": string,
      "options": string[],
      "correctIndex": number,
      "explanation": string
    }
  ]
}`;
}
