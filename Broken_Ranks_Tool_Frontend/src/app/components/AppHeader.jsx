import crest from "../../assets/broken-ranks-crest.webp";
import drifOptimizerIcon from "../../assets/navigation-icons/drif-optimizer.png";
import equipmentBuilderIcon from "../../assets/navigation-icons/equipment-builder.png";
import { APP_ROUTES } from "../useAppRoute";

const AppHeader = ({
    activeView,
    buildCount = 0,
    disabled,
    fileInputRef,
    onViewChange,
    onSaveBuild,
    onLoadBuild,
}) => (
    <header className="app-masthead shrink-0">
        <a
            className="brand-lockup"
            href={APP_ROUTES.home}
            aria-label="Broken Ranks Tool — strona główna"
            aria-current={activeView === "home" ? "page" : undefined}
            onClick={(event) => {
                event.preventDefault();
                onViewChange("home");
            }}
        >
            <div className="brand-crest" aria-hidden="true">
                <img src={crest} alt="" />
            </div>
            <h1>Broken Ranks Tool</h1>
        </a>
        <nav className="main-switch" aria-label="Główne widoki aplikacji">
            <a
                href={APP_ROUTES.home}
                onClick={(event) => {
                    event.preventDefault();
                    onViewChange("home");
                }}
                aria-current={activeView === "home" ? "page" : undefined}
                className={`flex-1 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] transition-all ${activeView === "home" ? "border-amber-700 bg-stone-900/90 text-stone-100 shadow-inner" : "border-transparent text-stone-500 hover:bg-stone-900/50 hover:text-stone-200"}`}
            >
                <span className="main-switch-icon main-switch-home-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path d="m3 11 9-8 9 8M5.5 9.5V21h13V9.5M9 21v-7h6v7" />
                    </svg>
                </span>
                <span className="main-switch-label">Strona główna</span>
            </a>
            <a
                href={APP_ROUTES.builder}
                onClick={(event) => {
                    event.preventDefault();
                    if (!disabled) onViewChange("builder");
                }}
                aria-disabled={disabled || undefined}
                aria-current={activeView === "builder" ? "page" : undefined}
                className={`flex-1 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] transition-all ${activeView === "builder" ? "border-red-700 bg-stone-900/90 text-stone-100 shadow-inner" : "border-transparent text-stone-500 hover:bg-stone-900/50 hover:text-stone-200"}`}
            >
                <span className="main-switch-icon" aria-hidden="true">
                    <img src={equipmentBuilderIcon} alt="" draggable="false" />
                </span>
                <span className="main-switch-label">Kreator ekwipunku</span>
            </a>
            <a
                href={APP_ROUTES.optimizer}
                onClick={(event) => {
                    event.preventDefault();
                    if (!disabled) onViewChange("optimizer");
                }}
                aria-disabled={disabled || undefined}
                aria-current={activeView === "optimizer" ? "page" : undefined}
                className={`flex-1 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] transition-all ${activeView === "optimizer" ? "border-purple-500 bg-purple-950/30 text-purple-300 shadow-inner" : "border-transparent text-stone-500 hover:bg-stone-900/50 hover:text-stone-200"}`}
            >
                <span className="main-switch-icon" aria-hidden="true">
                    <img src={drifOptimizerIcon} alt="" draggable="false" />
                </span>
                <span className="main-switch-label">Optymalizator drifów</span>
            </a>
            <a
                href={APP_ROUTES.builds}
                onClick={(event) => {
                    event.preventDefault();
                    if (!disabled) onViewChange("builds");
                }}
                aria-disabled={disabled || undefined}
                aria-current={activeView === "builds" ? "page" : undefined}
                className={`flex-1 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] transition-all ${activeView === "builds" ? "border-amber-600 bg-amber-950/25 text-amber-200 shadow-inner" : "border-transparent text-stone-500 hover:bg-stone-900/50 hover:text-stone-200"}`}
            >
                <span className="main-switch-icon main-switch-library-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path d="M5 5.5h10.5v13H5zM8.5 2.5H19v13h-3.5M8 9h4.5M8 12h4.5M8 15h3" />
                    </svg>
                </span>
                <span className="main-switch-label">
                    Buildy lokalne
                    <small>{buildCount}/10</small>
                </span>
            </a>
        </nav>
        <div className="header-actions">
            <button
                type="button"
                onClick={onSaveBuild}
                disabled={disabled || buildCount >= 10}
                title={buildCount >= 10 ? "Biblioteka lokalna jest pełna" : undefined}
                className="header-action header-action-primary"
            >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M5 3h12l2 2v16H5V3Zm3 0v6h8V3M8 21v-8h8v8" />
                </svg>
                Zapisz lokalnie
            </button>
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                title="Wczytaj build zapisany w Broken Ranks Tool lub wyeksportowany z Broken HUD"
                className="header-action"
            >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M3 6h7l2 2h9v12H3V6Zm9 11V10m0 0-3 3m3-3 3 3" />
                </svg>
                <span className="header-action-label">
                    Wczytaj build
                    <small>także z Broken HUD</small>
                </span>
            </button>
            <input
                ref={fileInputRef}
                type="file"
                accept="application/json,text/plain,.json,.txt"
                onChange={onLoadBuild}
                className="hidden"
            />
        </div>
    </header>
);

export default AppHeader;
