import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // officeparser (and its transitive deps) rely on dynamic/native module
  // resolution that Next's bundler mangles — "Cannot read properties of
  // undefined (reading 'parseOffice')" in production when bundled. Keeping
  // it external makes the serverless function require() it at runtime
  // from node_modules instead, matching how it works in local `next dev`.
  serverExternalPackages: ["officeparser", "adm-zip"],
};

export default nextConfig;
