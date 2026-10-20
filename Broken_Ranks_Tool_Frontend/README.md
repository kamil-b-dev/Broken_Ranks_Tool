# Frontend

Interfejs React/Vite dla kalkulatora i optymalizatora Broken Ranks.

Kod w `src/features` jest grupowany według funkcji aplikacji (`builder`, `builds`,
`equipment`, `optimizer`). Elementy współdzielone znajdują się w `src/shared`,
kompozycja aplikacji w `src/app`, a arkusze stylów w `src/styles`.

Adresy widoków są anglojęzyczne: `/` (start), `/builder` (kreator), `/optimizer`
(optymalizator), `/builds` (zapisane buildy) i `/progression-path` (ścieżka rozwoju).
Stare adresy `/kreator`, `/optymalizator`, `/buildy` i `/sciezka-rozwoju` są
zamieniane na odpowiadające im adresy angielskie przez `replaceState`, bez
dodatkowego wpisu w historii i z zachowaniem parametrów oraz fragmentu URL.
Interfejs obsługuje polski (domyślny) i angielski. Przełącznik PL/EN w nagłówku
zapamiętuje wybór w przeglądarce; działa również na telefonie. Zmiana języka
zachowuje build, wynik optymalizacji i postęp odhaczania etapów ścieżki.
API używa angielskich adresów opisanych w [OpenAPI](../docs/openapi.yaml).
Zasady dodawania tłumaczeń opisuje [lokalizacja interfejsu](../docs/i18n.md).

Najważniejsze polecenia:

```powershell
npm ci
npm run dev
npm run format:check
npm run lint
npm run test:coverage
npm run build
npm run check:bundle-size
npm run test:e2e
npm run test:performance
```

`npm run assets:optimize` odtwarza wersje WebP, gdy w odpowiednim miejscu zostanie
podmieniony źródłowy PNG wymieniony w `scripts/optimize-assets.mjs`.

`npm run assets:optimize:mobile` i `npm run assets:optimize:ui` odtwarzają mniejsze
warianty grafik do kontrolek. Oryginalne grafiki pozostają źródłami tych wariantów.
E2E obejmuje Chromium oraz mobilny WebKit (`npx playwright install webkit`).
Profil `test:performance` buduje produkcję i uruchamia ją przez `vite preview`,
kontrolując zasoby konkretnych widoków oraz regresje krytycznych interakcji.
Raporty funkcjonalne i wydajnościowe są rozdzielone, a CI instaluje oba silniki
i uruchamia oba profile przeglądarkowe.
Czyste testy domenowe używają Node i puli wątków; komponenty i hooki pozostają
w jsdom. Pliki testowe zachowują izolację. MSW uruchamia się tylko w testach
importujących `src/test/server.js`, z odrzucaniem nieobsłużonych żądań.

Przy pracy nad pojedynczą funkcją można uruchamiać powiązane testy bez zbierania
pełnego pokrycia:

```powershell
npm run test:watch
npm run test:domain
npm run test:ui
npm run test:related -- src/features/optimizer/reorganization/reorganizationPreflight.js
npm test -- src/features/optimizer/reorganization
```

`test:related` wybiera testy po zależnościach importów. Zmiany konfiguracji, fixture'ów
wczytywanych z dysku i wspólnego setupu wymagają szerszego uruchomienia. Przed
integracją zmian nadal obowiązuje `npm run test:coverage`: uruchamia oba projekty
i sprawdza dotychczasowe progi globalne oraz progi dla poszczególnych plików.
