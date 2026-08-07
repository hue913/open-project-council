import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PublicDemoApp } from "./PublicDemoApp";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PublicDemoApp />
  </StrictMode>,
);
