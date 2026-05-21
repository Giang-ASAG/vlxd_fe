import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "@/app/globals.css";
import { healthPoller } from "./lib/api-client";
const container = document.getElementById("root");
if (!container) {
    throw new Error("Root container not found");
}
healthPoller.start();
createRoot(container).render(<StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>);
