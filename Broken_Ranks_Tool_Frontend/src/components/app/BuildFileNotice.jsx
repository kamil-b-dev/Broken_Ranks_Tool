const BuildFileNotice = ({ notice, onDismiss }) =>
    notice && (
        <div
            className={`build-file-notice build-file-notice-${notice.type}`}
            role={notice.type === "error" ? "alert" : "status"}
        >
            <span aria-hidden="true">{notice.type === "error" ? "!" : "✓"}</span>
            <p>{notice.message}</p>
            <button type="button" onClick={onDismiss} aria-label="Zamknij komunikat">
                ×
            </button>
        </div>
    );

export default BuildFileNotice;
