import { defineConfig, type Plugin } from "vite";
import solidPlugin from "vite-plugin-solid";

// The app window only loads its own bundle and assets; WhatsApp runs in
// <webview> guests, which this policy does not cover. Styles stay inline-able
// for the UI components. Added to built pages only so the dev server keeps
// its own scripts.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

function contentSecurityPolicy(): Plugin {
  return {
    name: "altus-content-security-policy",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: {
          "http-equiv": "Content-Security-Policy",
          content: CONTENT_SECURITY_POLICY,
        },
        injectTo: "head-prepend",
      },
    ],
  };
}

// https://vitejs.dev/config
export default defineConfig({
  plugins: [solidPlugin(), contentSecurityPolicy()],
});
