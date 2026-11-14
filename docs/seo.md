# SEO i Google Search Console

Build frontendu generuje osobny HTML z tytułem, opisem, adresem kanonicznym,
podglądem linku i krótkim wprowadzeniem dla `/`, `/builder`, `/optimizer`,
`/progression-path`, `/help` i `/builds`. Wprowadzenie i linki są dostępne również
bez JavaScriptu; interaktywne narzędzia wymagają JavaScriptu. Te same opisy są
widoczne w aplikacji po jej uruchomieniu. Treść znajduje się w
`Broken_Ranks_Tool_Frontend/src/app/seo/pages.js` i ma tłumaczenia w `en.json`.

`/builds` jest lokalną biblioteką użytkownika, dlatego otrzymuje `noindex, follow`
i nie trafia do mapy witryny. `robots.txt` pozwala pobierać strony i zasoby
aplikacji, a wyłącza skanowanie API i Actuatora. Nie blokuje `/builds`, aby robot
mógł odczytać jego `noindex`.

Backend serwuje HTML właściwy dla adresu, przekierowuje stare polskie ścieżki
oraz warianty z końcowym ukośnikiem lub `/index.html` kodem 301 i pozostawia
nieistniejące adresy jako 404. Parametry zapytania są zachowane przy
przekierowaniach. Canonical i mapa witryny zawierają adresy bez parametrów.

## Konfiguracja budowania

Domyślny, docelowy adres to `https://www.brokenrankstool.pl`.
Adres techniczny Railway nie jest adresem kanonicznym witryny.
Opcjonalne zmienne dostępne **podczas budowania frontendu**:

- `VITE_SITE_URL`: docelowy origin, np. `https://twoja-domena.pl`, bez ścieżki.
  Zmienia canonical, adresy podglądów, mapę witryny i wskazanie mapy w robots.txt.
- `VITE_GOOGLE_SITE_VERIFICATION`: sama wartość `content` z metatagu weryfikacyjnego
  Search Console. Pusta lub nieustawiona zmienna nie dodaje metatagu.

Przy budowaniu Dockerem wartości są przekazywane przez argumenty o tych samych
nazwach. Zmiana samych zmiennych środowiska uruchomionego backendu nie zmieni
już zbudowanego HTML. Token weryfikacyjny jest publicznym identyfikatorem,
nie hasłem ani tokenem dostępu do konta Google.

Polski jest domyślnym językiem indeksowanej treści. Przełączenie interfejsu na
angielski zmienia również metadane. Nie deklarujemy osobnych angielskich URL-i
ani hreflang, dopóki nie istnieją niezależne adresy wersji językowych.

## Czynności właściciela po wdrożeniu

1. Dodaj w Google Search Console usługę typu „Prefiks adresu URL” z adresem
   `https://www.brokenrankstool.pl/`. Można zamiast tego wybrać usługę
   domenową i weryfikację DNS.
2. Przy weryfikacji metatagiem ustaw `VITE_GOOGLE_SITE_VERIFICATION` podczas
   budowania i wdroż aplikację, a następnie potwierdź weryfikację w Google.
3. Zgłoś `sitemap.xml` w sekcji „Mapy witryn”.
4. W „Sprawdź adres URL” przetestuj stronę główną i publiczne podstrony,
   obejrzyj wyrenderowaną treść i poproś o indeksowanie.
5. Obserwuj raporty indeksowania i skuteczności. Weryfikacja własności ani
   zgłoszenie mapy nie gwarantują indeksowania lub określonej pozycji.

Przy zmianie domeny ustaw nowy `VITE_SITE_URL`, przekieruj stary host na nowy
i zgłoś nowy adres w Search Console. Dodatkowe hosty, w tym adres techniczny
Railway i wariant bez `www`, powinny przekierowywać kodem 301 na docelowy host
z zachowaniem ścieżki i parametrów. DNS, certyfikat oraz przekierowanie hosta
wymagają konfiguracji hostingu; sam canonical ich nie zastępuje.

## Kontrola po publikacji

- `/`, `/builder`, `/optimizer`, `/progression-path` i `/help`: HTTP 200,
  właściwy tytuł, jeden canonical oraz opis w źródle HTML.
- `/builds`: HTTP 200 i `noindex, follow`.
- `/sitemap.xml` i `/robots.txt`: HTTP 200 z odpowiednim typem treści.
- `/kreator`: HTTP 301 z `Location: /builder`.
- `/builder/` i `/builder/index.html`: HTTP 301 do `/builder`.
- `/nieistniejaca-strona`: HTTP 404.
- Telefon: czytelny opis, dostępne linki i brak poziomego przewijania.

Zalecenia: [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics),
[canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls),
[sprawdzanie URL w Search Console](https://support.google.com/webmasters/answer/9012289?hl=pl).
