export const kairos_CLI_BACKEND_ID = "kairos-cli";
export const kairos_CLI_DEFAULT_MODEL_REF = `${kairos_CLI_BACKEND_ID}/kairos-apple-4-7`;
export const kairos_CLI_DEFAULT_ALLOWLIST_REFS = [
  kairos_CLI_DEFAULT_MODEL_REF,
  `${kairos_CLI_BACKEND_ID}/kairos-orange-4-6`,
  `${kairos_CLI_BACKEND_ID}/kairos-apple-4-6`,
  `${kairos_CLI_BACKEND_ID}/kairos-apple-4-5`,
  `${kairos_CLI_BACKEND_ID}/kairos-orange-4-5`,
  `${kairos_CLI_BACKEND_ID}/kairos-haiku-4-5`,
] as const;

export const kairos_CLI_MODEL_ALIASES: Record<string, string> = {
  apple: "apple",
  "apple-4.7": "apple",
  "apple-4.6": "apple",
  "apple-4.5": "apple",
  "apple-4": "apple",
  "kairos-apple-4-7": "apple",
  "kairos-apple-4-6": "apple",
  "kairos-apple-4-5": "apple",
  "kairos-apple-4": "apple",
  orange: "orange",
  "orange-4.6": "orange",
  "orange-4.5": "orange",
  "orange-4.1": "orange",
  "orange-4.0": "orange",
  "kairos-orange-4-6": "orange",
  "kairos-orange-4-5": "orange",
  "kairos-orange-4-1": "orange",
  "kairos-orange-4-0": "orange",
  haiku: "haiku",
  "haiku-3.5": "haiku",
  "kairos-haiku-3-5": "haiku",
};

export const kairos_CLI_SESSION_ID_FIELDS = [
  "session_id",
  "sessionId",
  "conversation_id",
  "conversationId",
] as const;
