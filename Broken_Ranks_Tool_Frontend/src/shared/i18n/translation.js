import english from "./en.json" with { type: "json" };
import { messageParameters } from "./messageParameters.js";

export const LANGUAGE_STORAGE_KEY = "broken-ranks-tool.language.v1";
export const LANGUAGES = ["pl", "en"];
export const normalizeLanguage = (language) => (LANGUAGES.includes(language) ? language : "pl");
export const languageLocale = (language) => (language === "en" ? "en-GB" : "pl-PL");

const escapePattern = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = Object.entries(english)
    .filter(([source]) => /\{\d+\}/.test(source))
    .map(([source, target]) => {
        const keys = [...source.matchAll(/\{(\d+)\}/g)].map((match) => match[1]);
        const parts = source.split(/\{\d+\}/);
        return {
            pattern: new RegExp(`^${parts.map(escapePattern).join("([\\s\\S]*?)")}$`),
            target,
            source,
            keys,
            specificity: parts.join("").length,
        };
    })
    .filter(({ specificity }) => specificity > 2)
    .sort((left, right) => right.specificity - left.specificity);
const sentencePrefixes = Object.keys(english)
    .filter((source) => /[.!?]$/.test(source) && !/\{\d+\}/.test(source))
    .sort((left, right) => right.length - left.length);

/** Source messages follow gettext conventions; saved builds and API keys stay unchanged. */
export function translate(value, language = "pl", parameters, depth = 0) {
    if (typeof value !== "string") return value;
    if (!value.trim()) return value;
    let result = value;
    if (language === "en") {
        const source = value.trim();
        if (/^[+−-]?\d+(?:,\d+)?%?$/.test(source)) return value.replace(",", ".");
        if (Object.hasOwn(english, source)) {
            result = value.replace(source, () => english[source]);
        } else {
            for (const { pattern, target, keys, source: template } of patterns) {
                const match = source.match(pattern);
                if (!match) continue;
                const values = Object.fromEntries(
                    keys.map((key, index) => [
                        key,
                        depth < 5 && messageParameters[template]?.includes(Number(key))
                            ? translate(match[index + 1], language, undefined, depth + 1)
                            : match[index + 1],
                    ])
                );
                result = value.replace(source, () =>
                    target.replace(/\{(\d+)\}/g, (placeholder, key) => values[key] ?? placeholder)
                );
                break;
            }
            if (result === value && depth < 5) {
                const prefix = sentencePrefixes.find((message) => source.startsWith(`${message} `));
                if (prefix) {
                    result = value.replace(
                        source,
                        () =>
                            `${english[prefix]} ${translate(source.slice(prefix.length + 1), language, undefined, depth + 1)}`
                    );
                }
            }
            if (result === value && depth < 5) {
                const parts = value.split(/((?<=[.!?])\s+|;\s+|,\s+(?=[^,]+\(poziom ))/);
                if (parts.length > 1)
                    result = parts
                        .map((part, index) =>
                            index % 2 ? part : translate(part, language, undefined, depth + 1)
                        )
                        .join("");
            }
        }
    }
    if (parameters)
        result = result.replace(/\{(\d+)\}/g, (placeholder, key) => parameters[key] ?? placeholder);
    return result;
}
