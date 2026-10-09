import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App.jsx";
import AppErrorBoundary from "./app/AppErrorBoundary.jsx";
import "./styles/base.css";
import "./shared/styles/scrollbars.css";
import { EquipmentProvider } from "./app/EquipmentProvider.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <AppErrorBoundary>
            <EquipmentProvider>
                <App />
            </EquipmentProvider>
        </AppErrorBoundary>
    </React.StrictMode>
);
