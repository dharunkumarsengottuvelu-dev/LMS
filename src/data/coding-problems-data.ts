import type { CodingProblem } from "@/types/coding";

export interface CodingSolutionApproach {
  name: string;
  timeComplexity: string;
  spaceComplexity: string;
  explanation: string;
  code: Record<string, string>;
}

export interface CodingEditorialSolution {
  overview: string;
  approaches: CodingSolutionApproach[];
}

export interface CodingDiscussPost {
  id: string;
  problemId?: string;
  title: string;
  author: {
    name: string;
    avatar?: string;
    badge?: string;
  };
  tags: string[];
  content: string;
  upvotes: number;
  commentsCount: number;
  createdAt: string;
  pinned?: boolean;
}

export interface ExtendedCodingProblem extends CodingProblem {
  topic_tags?: string[];
  acceptance_rate?: string;
  hints?: string[];
  solution_editorial?: CodingEditorialSolution;
  example_cases?: {
    input: string;
    output: string;
    explanation?: string;
  }[];
}

// Clean initial problems array - all static mock data removed
export const LEETCODE_CODING_PROBLEMS: ExtendedCodingProblem[] = [];

// Clean initial discussions array - all fake mock posts removed
export const INITIAL_DISCUSS_POSTS: CodingDiscussPost[] = [];
