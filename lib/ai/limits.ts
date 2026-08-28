/** Caps sized for Groq free tier (~30 RPM, 8K TPM, 200K TPD, org-wide). */
export const AI_LIMITS = {
  chatPerUser: 5,
  debriefPerUser: 3,
  regenPerUser: 1,
  adminBriefPerDay: 3,
  groqCallsPerOrg: 40,
  chatHistory: 4,
  questionMax: 280,
  recentTrades: 8,
  instruments: 4,
  noteChars: 40,
  tokens: {
    daily: 320,
    debrief: 220,
    chat: 280,
    coach: 260,
  },
} as const;
