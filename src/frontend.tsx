/**
 * Entry point for the React app, included by src/index.html.
 */
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./styles/global.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { BrowserNotice } from "./components/BrowserNotice";
import { isDesktop } from "./lib/desktop";

const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    {isDesktop ? <App /> : <BrowserNotice />}
  </StrictMode>
);

if (import.meta.hot) {
  // With hot module reloading, `import.meta.hot.data` is persisted.
  const root = (import.meta.hot.data.root ??= createRoot(elem));
  root.render(app);
} else {
  createRoot(elem).render(app);
}
