/** Accessible inline feedback shared by application workflows. */
const AppNotice = ({ notice, onDismiss }) =>
    notice && (
        <div
            className={`build-file-notice build-file-notice-${notice.type}`}
            role={notice.type === "error" ? "alert" : "status"}
            aria-live={notice.type === "error" ? "assertive" : "polite"}
        >
            <span aria-hidden="true">{notice.type === "success" ? "✓" : "!"}</span>
            <p>{notice.message}</p>
            {onDismiss ? (
                <button type="button" onClick={onDismiss} aria-label="Zamknij komunikat">
                    ×
                </button>
            ) : null}
        </div>
    );

export default AppNotice;
