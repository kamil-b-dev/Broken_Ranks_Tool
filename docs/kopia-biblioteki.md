# Kopia całej biblioteki buildów

W widoku „Buildy lokalne” przycisk „Pobierz całą bibliotekę” zapisuje jeden JSON
z nazwami, identyfikatorami, datami, wyposażeniem, konfiguracją postaci, blokadami
i pełnymi plecakami wszystkich buildów. Kopia ma format
`broken-ranks-tool-build-library`, wersję 1 i listę `builds`. Nie obejmuje
niezapisanego roboczego kreatora ani lokalnego postępu planera.

„Wczytaj kopię biblioteki” przyjmuje plik do 10 MB, obejmujący najwyżej 10 buildów.
Każdy build przechodzi ten sam importer i walidację katalogową co pojedynczy plik.
Niepoprawny rekord odrzuca całą kopię bez częściowego zapisu. Obsługiwane są
wersje 1–3 buildów wewnątrz kopii. Otwieranie zaimportowanego buildu przelicza
statystyki według aktualnych reguł, tak jak pozostałe zapisy biblioteki.

Przed zapisem aplikacja pokazuje podgląd. Konflikt oznacza zgodne ID lub nazwę
bez rozróżniania wielkości liter. Domyślnie zachowuje oba buildy, nadając kopii
nowe ID i nazwę z sufiksem. Każdy wpis można pominąć lub wskazać konkretny
konfliktujący zapis do zastąpienia. Dwa wpisy nie mogą zastąpić tego samego
zapisu. Limit 10 obowiązuje również wynik importu; nadmiar wymaga zmiany decyzji.

Cała wybrana operacja jest zapisywana jednym zapisem pod Web Lock. Zmiana
biblioteki w innej karcie po otwarciu podglądu unieważnia ten podgląd; użytkownik
musi ponownie wczytać kopię i sprawdzić konflikty. Brak miejsca lub uszkodzona
biblioteka pozostawiają poprzedni zapis bez zmian. Import nie zmienia aktywnego
kreatora. Pojedyncze pliki buildu i wersja lokalnego magazynu pozostają bez zmian.
