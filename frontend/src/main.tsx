// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { FoliosProvider } from "./contexts/FoliosContext";
import App from "./App";
// OJO: no importes "./index.css" porque no existe.
// App.css ya se importa dentro de App.tsx.

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <FoliosProvider>
        <App />
      </FoliosProvider>
    </BrowserRouter>
  </React.StrictMode>
);
