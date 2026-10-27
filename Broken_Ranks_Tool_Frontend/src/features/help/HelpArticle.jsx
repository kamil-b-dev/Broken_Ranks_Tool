import { useHelpTranslation as useTranslation } from "./helpTranslation";
import { findHelpTopic } from "./helpContent";
import { useId } from "react";
import { HELP_SCREENSHOTS } from "./content/screenshots";

function HelpScreenshot({ screenshot, title }) {
    const { t, language } = useTranslation();
    const { src, width, height } = screenshot.sources[language] || screenshot.sources.pl;
    const caption = t(screenshot.caption || title);
    return (
        <figure className="help-screenshot">
            <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("Powiększ zrzut: {0} (nowa karta)", [caption])}
            >
                <img
                    src={src}
                    alt={caption}
                    width={width}
                    height={height}
                    loading="lazy"
                    decoding="async"
                />
            </a>
        </figure>
    );
}

function HelpTable({ table }) {
    const { t } = useTranslation();
    const tableId = useId();
    return (
        <div className="help-table-block" key={table.id}>
            <div
                className="help-table-region"
                role="region"
                aria-labelledby={`${tableId}-${table.id}`}
                tabIndex={0}
            >
                <table className="help-table">
                    <caption id={`${tableId}-${table.id}`}>{t(table.caption)}</caption>
                    <thead>
                        <tr>
                            {table.headers.map((header, index) => (
                                <th key={header} scope="col" aria-label={t(header)}>
                                    <span
                                        className={
                                            table.compactHeaders?.[index]
                                                ? "help-table-header-full"
                                                : undefined
                                        }
                                    >
                                        {t(header)}
                                    </span>
                                    {table.compactHeaders?.[index] && (
                                        <span
                                            className="help-table-header-short"
                                            aria-hidden="true"
                                        >
                                            {t(table.compactHeaders[index])}
                                        </span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {table.rows.map((row) => (
                            <tr key={row[0]}>
                                <th scope="row">{t(row[0])}</th>
                                {row.slice(1).map((value, index) => (
                                    <td key={index}>{t(value)}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {table.note && <p className="help-table-note">{t(table.note)}</p>}
        </div>
    );
}

export default function HelpArticle({ topic, onSelect, titleId }) {
    const { t } = useTranslation();
    const tables = topic.tables || [];
    const screenshots = HELP_SCREENSHOTS[topic.id] || [];
    return (
        <article className="help-article">
            <h2 id={titleId}>{t(topic.title)}</h2>
            {topic.intro && <p className="help-intro">{t(topic.intro)}</p>}
            {topic.steps.length > 0 && (
                <ol>
                    {topic.steps.map((step, index) => (
                        <li key={step}>
                            {t(step)}
                            {screenshots
                                .filter((screenshot) => screenshot.afterStep === index + 1)
                                .map((screenshot) => (
                                    <HelpScreenshot
                                        key={screenshot.id}
                                        screenshot={screenshot}
                                        title={topic.title}
                                    />
                                ))}
                            {tables
                                .filter((table) => table.afterStep === index + 1)
                                .map((table) => (
                                    <HelpTable key={table.id} table={table} />
                                ))}
                        </li>
                    ))}
                </ol>
            )}
            {tables
                .filter((table) => table.afterStep == null)
                .map((table) => (
                    <HelpTable key={table.id} table={table} />
                ))}
            {topic.note && <p className="help-note">{t(topic.note)}</p>}
            <nav aria-label={t("Powiązane tematy")} className="help-related">
                {topic.related.map((id) => (
                    <a
                        key={id}
                        href={`/help?topic=${id}`}
                        onClick={(event) => {
                            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
                                return;
                            event.preventDefault();
                            onSelect(id);
                        }}
                    >
                        {t(findHelpTopic(id).title)}
                    </a>
                ))}
            </nav>
        </article>
    );
}
