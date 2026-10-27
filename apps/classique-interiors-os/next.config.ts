import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "archiver", "exceljs", "xlsx", "@vercel/blob"],
  devIndicators: false,
};

export default nextConfig;
