import { supabase } from '../lib/supabase';

export interface QuestionData {
  id?: number;
  letter: string;
  question: string;
  answer: string;
}

// In-memory cache to store questions fetched from Supabase
let questionsCache: QuestionData[] = [];
const usedQuestions = new Set<string>();

/**
 * Fetches all questions from Supabase and caches them locally
 * Call this when the app first starts (Welcome Screen)
 */
export const fetchAllQuestions = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*');
      
    if (error) {
      console.error("Error fetching questions from Supabase:", error);
      return false;
    }
    
    if (data) {
      questionsCache = data as QuestionData[];
      console.log(`Loaded ${questionsCache.length} questions from database.`);
      return true;
    }
    return false;
  } catch (err) {
    console.error("Unexpected error fetching questions:", err);
    return false;
  }
};

/**
 * Flushes the memory of used questions, invoked when a completely new Match is started
 */
export const clearUsedQuestions = () => {
  usedQuestions.clear();
};

/**
 * Gets a random, unused question for a specific letter from the local cache
 */
export const getRandomQuestionForLetter = (letter: string): QuestionData | null => {
  // Filter the cache for questions matching the requested letter that haven't been used yet
  const availableQuestions = questionsCache.filter(q => q.letter === letter && !usedQuestions.has(q.question));
  
  if (availableQuestions.length === 0) {
    // Fallback if all questions for this letter have been exhausted
    return {
      letter,
      question: `نفدت جميع الأسئلة الخاصة بهذا الحرف (${letter}) أو لم يتم العثور عليها`,
      answer: "غير متوفر"
    };
  }
  
  // Pick one randomly
  const randomIndex = Math.floor(Math.random() * availableQuestions.length);
  const selected = availableQuestions[randomIndex];
  
  // Mark it as used
  usedQuestions.add(selected.question);
  
  return selected;
};
