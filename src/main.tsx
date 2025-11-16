import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../App.tsx";
import { PayLinkPublicPage } from "../components/PayLinkPublicPage";
import "../styles/globals.css";

const rootElement = document.getElementById("root");

function getPayLinkTokenFromPath(): string | null {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname;
  const match = path.match(/^\/pay-links\/([^/]+)\/?$/i);
  return match ? match[1] : null;
}

const payLinkToken = getPayLinkTokenFromPath();

createRoot(rootElement!).render(
  <StrictMode>
    {payLinkToken ? <PayLinkPublicPage token={payLinkToken} /> : <App />}
  </StrictMode>,
);
