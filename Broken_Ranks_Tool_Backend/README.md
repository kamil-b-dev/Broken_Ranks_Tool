# Backend

API Spring Boot 4 uruchamiane na Javie 21. Spring Framework, Jackson 3, Hibernate i Tomcat korzystają ze spójnych wersji zarządzanych przez BOM Spring Boot.

Pakiety najwyższego poziomu odpowiadają funkcjom i kierunkowi zależności:

- `catalog` — publiczny odczyt katalogu i DTO inicjalizujące frontend,
- `equipment` — reguły domenowe, walidacja i kalkulator statystyk,
- `optimization` — doradca oraz silnik optymalizacji,
- `progressionpath` — automatyczna ścieżka od poziomu 1 do wskazanego celu,
  z planem przedmiotów oraz przeniesień i ulepszeń konkretnych sztuk kamieni,
- `core` — konfiguracja i współdzielona infrastruktura HTTP.

`POST /api/progression-path/plan` przyjmuje profesję, poziom i wyposażenie docelowe
oraz opcjonalne sloty biżuterii zarezerwowane jako „res”. Planner generuje etapy
przedmiotów i wcześniejsze konfiguracje drifów oraz orbów. Przejście epik → legenda
uwzględnia wymagane 9★ epika i reset do 1★ legendy. Wynik sprawdza wspólnym
kalkulatorem i odtwarzaniem tożsamości zasobów; nie obniża poziomu ani rozmiaru
kamieni. Nie deklaruje optimum ani wyceny ekonomicznej. Endpoint współdzieli limit kosztownych
obliczeń z optymalizatorem. Szczegóły opisuje [ścieżka rozwoju](../docs/sciezka-rozwoju.md).

Lokalny profil czyta wersjonowany katalog z `database/catalog/broken_ranks.db`.
Zasady jego aktualizacji opisuje `database/README.md`.

Po zmianie DTO uruchom backend ponownie. Odświeżenie Vite aktualizuje frontend,
ale działająca JVM zachowuje wcześniej wczytane klasy. Starszy backend odrzuci
nowe pola żądania, np. `balanceStats` i `minItemLevelGap`, jako `MALFORMED_JSON`.
Nie wyłączaj ścisłej walidacji nieznanych pól w celu obejścia różnicy wersji.

```powershell
./mvnw spring-boot:run
./mvnw clean verify
```
