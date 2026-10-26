# Pomoc w aplikacji

Treści pomocy znajdują się we frontendzie w `src/features/help/content/`, w plikach
odpowiadających obszarom aplikacji. `src/features/help/helpContent.js` łączy katalog
i definiuje grupy tematów.
Każdy temat zawiera tytuł, kroki i powiązane tematy. Wprowadzenie i uwaga są opcjonalne.
Tematy referencyjne mogą zamiast kroków zawierać tabele (`tables`) z podpisem,
nagłówkami, wierszami i opcjonalną uwagą. Tabele mają nagłówki kolumn i wierszy
oraz region przewijania dostępny z klawiatury.
Opcjonalne `afterStep` umieszcza tabelę we wskazanym punkcie instrukcji (numeracja od 1).
Polskie teksty korzystają ze wspólnego katalogu tłumaczeń `src/shared/i18n/en.json`.
Instrukcje opisują działanie aplikacji; reguły domenowe nadal określają dokumenty ekwipunku,
optymalizatora, Doradcy i ścieżki rozwoju.

- Link **Instrukcja** w głównym menu komputera lub skrót w nagłówku telefonu otwiera stronę `/help`.
- Temat można udostępnić przez `/help?topic=advisor` (lub inne ID z katalogu tematów).
- **Jak korzystać?** otwiera temat aktualnej funkcji w panelu bocznym, na telefonie na pełnym ekranie.
- Ikony **?** przy ustawieniach pokazują krótkie wyjaśnienia przez dotknięcie, fokus lub najechanie.
- Przekroczona pojemność jest wyjaśniana bezpośrednio w edytorze, bez otwierania pomocy.

Panel i strona używają tego samego komponentu artykułu. `HelpProvider` utrzymuje
bieżący widok aplikacji zamontowany również podczas otwarcia strony pomocy.
Osobny wpis historii zachowuje wcześniejszy adres z parametrami, wybrany slot i szkice.
Zmiana tematu zastępuje adres bieżącego wpisu pomocy, więc jeden powrót przywraca pracę.
Bezpośrednie wejście na stronę pomocy pozwala wrócić na stronę główną.
Pomoc działa także podczas błędu lub ładowania katalogu.

Panel używa natywnego modalnego `dialog`, blokuje przewijanie tła i przywraca fokus
po zamknięciu; Escape zamyka panel i podpowiedzi. Strona pomocy ukrywa aktualny widok
również przed nawigacją klawiaturą. Testy obejmują historię, zachowanie szkicu, tłumaczenia,
telefon 320 px oraz kontrolę dostępności axe.

Oprawa strony i panelu pomocy korzysta z istniejących tekstur paneli aplikacji.
Wspólny styl własnych tooltipów jest w `src/shared/styles/tooltips.css`:
obejmuje podpowiedzi `?` i podglądy przedmiotów, drifów oraz orbów w bazie danych.
`src/features/help/help.css` odpowiada za menu tematów, treść instrukcji i panel boczny.

Tematy są podzielone na ekwipunek i statystyki, plecak i historię zmian, podstawy
optymalizatora, ustawienia Od zera, Doradcę, Reorganizację, zapis i porównanie oraz
ścieżkę rozwoju. Menu na komputerze używa rozwijanych grup i otwiera grupę wybranego
tematu. Na telefonie te same grupy występują w liście wyboru. Poszczególne artykuły
pozostają krótkie; uzupełnienia nie dodają nowych tooltipów.
