import { useTranslation } from "../../shared/i18n/useTranslation";
import { pageForPath } from "./pages";
import "./page-introduction.css";

export default function PageIntroduction({ path = "/", home = false }) {
    const { t } = useTranslation();
    const page = pageForPath(path);
    return <p className={home ? "home-description" : "page-description"}>{t(page.description)}</p>;
}
