/**
 * Application-wide constants and configuration
 */
export const config = {
  // Base URL
  baseUrl: "https://kairos.ai",

  // GitHub
  github: {
    repoUrl: "https://github.com/anomalyco/kairos",
    starsFormatted: {
      compact: "150K",
      full: "150,000",
    },
  },

  // Social links
  social: {
    twitter: "https://x.com/kairos",
    discord: "https://discord.gg/kairos",
  },

  // Static stats (used on landing page)
  stats: {
    contributors: "850",
    commits: "11,000",
    monthlyUsers: "6.5M",
  },
} as const
