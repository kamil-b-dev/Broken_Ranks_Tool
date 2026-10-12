# Frontend

Interfejs React/Vite dla kalkulatora i optymalizatora Broken Ranks.

Kod w `src/features` jest grupowany według funkcji aplikacji (`builder`, `builds`,
`equipment`, `optimizer`). Elementy współdzielone znajdują się w `src/shared`,
kompozycja aplikacji w `src/app`, a arkusze stylów w `src/styles`.

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
Czyste testy domenowe używają Node; komponenty i hooki pozostają w jsdom.
