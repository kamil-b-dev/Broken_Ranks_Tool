import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App.jsx";
import "./styles/base.css";
import "./styles/build-library.css";
import "./styles/builder.css";
import "./styles/themes.css";
import "./styles/optimizer.css";
import { EquipmentProvider } from "./app/EquipmentProvider.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <EquipmentProvider>
            <App />
        </EquipmentProvider>
    </React.StrictMode>
);
