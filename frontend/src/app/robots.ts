import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/staff/",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/sentry-example-page",
          "/booking/confirmation",
        ],
      },
    ],
    sitemap: "https://totetaxi.com/sitemap.xml",
  };
}
