import { useTranslation } from "../../shared/i18n/useTranslation";
import { findHelpTopic } from "./helpContent";
import { useId } from "react";

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
    return (
        <article className="help-article">
            <h2 id={titleId}>{t(topic.title)}</h2>
            {topic.intro && <p className="help-intro">{t(topic.intro)}</p>}
            {topic.steps.length > 0 && (
                <ol>
                    {topic.steps.map((step, index) => (
                        <li key={step}>
                            {t(step)}
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
