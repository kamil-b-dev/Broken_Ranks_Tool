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
```

`npm run assets:optimize` odtwarza wersje WebP, gdy w odpowiednim miejscu zostanie
podmieniony źródłowy PNG wymieniony w `scripts/optimize-assets.mjs`.
