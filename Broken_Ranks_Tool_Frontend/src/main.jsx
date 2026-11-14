import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App.jsx";
import AppErrorBoundary from "./app/AppErrorBoundary.jsx";
import "./styles/base.css";
import "./shared/styles/scrollbars.css";
import "./shared/styles/checkboxes.css";
import "./shared/styles/selects.css";
import "./shared/styles/number-inputs.css";
import "./shared/styles/interface-preferences.css";
import { EquipmentProvider } from "./app/EquipmentProvider.jsx";
import LanguageProvider from "./shared/i18n/LanguageProvider.jsx";
import PageMetadata from "./app/seo/PageMetadata.jsx";
import "./app/seo/page-introduction.css";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <LanguageProvider>
            <PageMetadata />
            <AppErrorBoundary>
                <EquipmentProvider>
                    <App />
                </EquipmentProvider>
            </AppErrorBoundary>
        </LanguageProvider>
    </React.StrictMode>
);
