import type { NextConfig } from "next";
import { buildContentSecurityPolicyReportOnly } from "./security/csp-report-only";

const baseSecurityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "interest-cohort=()",
    ].join(", "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    const headers = [...baseSecurityHeaders];
    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
      headers.push({
        key: "Content-Security-Policy-Report-Only",
        value: buildContentSecurityPolicyReportOnly(),
      });
    }
    return [{ source: "/:path*", headers }];
  },
  async redirects() {
    return [
      { source: "/branch", destination: "/branches", permanent: true },
      { source: "/warehouse", destination: "/warehouses", permanent: true },
    ];
  },
};

export default nextConfig;
