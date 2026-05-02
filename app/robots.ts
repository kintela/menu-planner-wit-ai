import type { MetadataRoute } from "next"

function getBaseUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000"

  const normalizedUrl = envUrl.startsWith("http") ? envUrl : `https://${envUrl}`
  return normalizedUrl.endsWith("/") ? normalizedUrl.slice(0, -1) : normalizedUrl
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl()

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/auth/", "/debug", "/debug-", "/setup", "/test-", "/login", "/profile"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
