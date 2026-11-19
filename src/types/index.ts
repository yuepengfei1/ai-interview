export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface InterviewMode {
  scenario: "tech" | "behavioral" | "coding" | "general";
  pressure: "gentle" | "standard" | "stress";
}

export interface InterviewState {
  step: "setup" | "chat";
  interviewId: string;
  jd: string;
  resume: string;
  jdAnalysis: string;
  mode: InterviewMode;
  openingQuestions: string[];
  conversationHistory: ConversationMessage[];
}
