import { createRoot } from "react-dom/client";

import App from "./App";

const root = document.getElementById("root");
if (root) {
    // Keep the offline banner accurate across online/offline transitions.
    window.addEventListener("offline", () => {});
    window.addEventListener("online", () => {});

    createRoot(root).render(<App />);
}