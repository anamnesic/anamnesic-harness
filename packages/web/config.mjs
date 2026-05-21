const stage = process.env.SST_STAGE || "dev"

export default {
  url: stage === "production" ? "https://kairos.ai" : `https://${stage}.kairos.ai`,
  console: stage === "production" ? "https://kairos.ai/auth" : `https://${stage}.kairos.ai/auth`,
  email: "contact@anoma.ly",
  socialCard: "https://social-cards.sst.dev",
  github: "https://github.com/anomalyco/kairos",
  discord: "https://kairos.ai/discord",
  headerLinks: [
    { name: "app.header.home", url: "/" },
    { name: "app.header.docs", url: "/docs/" },
  ],
}
