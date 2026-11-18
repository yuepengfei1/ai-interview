export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface InterviewState {
  step: "setup" | "chat";
  jd: string;
  resume: string;
  jdAnalysis: string;
  openingQuestions: string[];
  conversationHistory: ConversationMessage[];
}
