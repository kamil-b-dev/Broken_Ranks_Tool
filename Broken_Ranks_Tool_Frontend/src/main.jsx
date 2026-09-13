import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App.jsx";
import AppErrorBoundary from "./app/AppErrorBoundary.jsx";
import "./styles/base.css";
import "./features/builds/styles/build-library.css";
import "./features/builds/styles/build-comparison.css";
import "./features/builds/styles/build-comparison-responsive.css";
import "./features/builder/styles/builder-layout.css";
import "./features/builder/styles/equipment-figure.css";
import "./features/builder/styles/builder-controls.css";
import "./features/builder/styles/builder-responsive.css";
import "./shared/styles/scrollbars.css";
import "./styles/themes.css";
import "./features/optimizer/styles/optimizer-shell.css";
import "./features/optimizer/styles/optimizer-goals.css";
import "./features/optimizer/styles/optimizer-report.css";
import "./features/optimizer/styles/optimizer-results.css";
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
