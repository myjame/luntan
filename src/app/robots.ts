import type { MetadataRoute } from "next";

import { absoluteUrl, siteOrigin } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/circles", "/discover", "/posts/", "/square", "/users/"],
        disallow: [
          "/account-status",
          "/admin",
          "/api/",
          "/login",
          "/me",
          "/register",
          "/search"
        ]
      }
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteOrigin
  };
}
