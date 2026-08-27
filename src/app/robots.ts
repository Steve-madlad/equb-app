import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!baseUrl) {
    throw new Error("Base url missing in ENV")
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/search",
          "/login",
          "/register",
          "/equb-app.png",
        ],
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard/",
          "/settings/",
          "/financial-activities/",
          "/notifications/",
          "/payments/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
