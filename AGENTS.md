# Zasady pracy w repozytorium

## Kontekst domenowy ekwipunku

Przed zmianami dotyczącymi ekwipunku, drifów, orbów, gwiazdek, kalkulatora statystyk lub optymalizatora przeczytaj [reguły ekwipunku](docs/reguly-ekwipunku.md).

Przed zmianami dotyczącymi edytora ekwipunku, API, kalkulatora, walidacji lub integracji wyniku przeczytaj również [zasady integracji ekwipunku](docs/reguly-integracji-ekwipunku.md).

Przed zmianami dotyczącymi algorytmu optymalizacji, jego walidacji, celów, oceny wyniku, komunikatów lub interfejsu optymalizatora przeczytaj również [reguły optymalizatora](docs/reguly-optymalizatora.md).

Przed zmianami dotyczącymi trybu Doradcy, jego działań, strategii, rankingu, ochron modów, capów, limitów, kandydatów, alternatyw, komunikatów lub sposobu wyszukiwania przeczytaj również [reguły Doradcy](docs/reguly-doradcy.md).

Przed rozpoczęciem prac nad kreatorem ścieżki rozwoju ekwipunku, planowaniem kolejnych przedmiotów, przenoszeniem lub ulepszaniem drifów pomiędzy etapami oraz prezentacją grafu rozwoju przeczytaj [reguły kreatora ścieżki rozwoju](docs/reguly-kreatora-sciezki-rozwoju.md). Funkcjonalność jest obecnie wyłącznie zaplanowana i nie należy łączyć jej z trybem prostym optymalizatora.

- Rozróżniaj reguły domenowe, ograniczenia wybranego trybu i szczegóły obecnego algorytmu. Luki walidacji nie oznaczają dozwolonych konfiguracji.
- Zachowuj spójność reguł między edytorem, backendowym kalkulatorem i optymalizatorem. Przy zmianie reguły aktualizuj również dokument domenowy.
- Nie rozszerzaj trybu „od zera” na dobór przedmiotów, orbów lub gwiazdek. Ten tryb optymalizuje wyłącznie rozmieszczenie i poziomy drifów na przekazanym ekwipunku.
- Capy i cele procentowe optymalizatora są celami miękkimi. Ich nieosiągnięcie ma zwracać najlepszy znaleziony poprawny build z ostrzeżeniem, a nie odrzucać wynik.

## Organizacja kodu

Przy każdej zmianie — zarówno dodawaniu nowych funkcji i plików, jak i refaktoryzacji — dbaj o ich właściwe rozmieszczenie w pakietach i katalogach.

- Pakiet lub katalog powinien odpowiadać domenie oraz pojedynczej odpowiedzialności kodu, a nie tylko miejscu, z którego najłatwiej uzyskać dostęp do zależności.
- W Javie zawsze zachowuj zgodność deklaracji `package` ze ścieżką pliku. Testy umieszczaj w pakiecie odpowiadającym testowanej klasie lub funkcji; współdzielone fabryki i fixture'y testowe trzymaj przy warstwie, której szczegóły enkapsulują.
- We frontendzie grupuj komponenty, hooki i funkcje domenowe według funkcji aplikacji. Elementy specyficzne dla wydzielonego przepływu umieszczaj w jego własnym katalogu zamiast rozszerzać ogólny katalog bez wyraźnej granicy.
- Przed utworzeniem nowego pakietu sprawdź istniejącą strukturę i nazewnictwo. Nie twórz pakietu dla pojedynczej drobnej klasy, jeśli nie wyznacza ona rzeczywistej granicy odpowiedzialności.
- Po przeniesieniu plików sprawdź importy, widoczność klas, konfigurację skanowania frameworka oraz uruchom testy obszaru objętego zmianą.

## Weryfikacja zmian

Dobieraj zakres weryfikacji proporcjonalnie do ryzyka i obszaru zmiany. Nie uruchamiaj automatycznie pełnego zestawu testów po każdej poprawce.

- Po każdej zmianie plików frontendu sformatuj zmienione pliki za pomocą Prettiera. Przed zakończeniem pracy uruchom `npm run format:check` i usuń wszystkie zgłoszone różnice formatowania.
- Po każdej zmianie plików Java uruchom `./mvnw spotless:apply` przed testami. Przed zakończeniem pracy uruchom `./mvnw spotless:check` albo pełne `./mvnw clean verify` i potwierdź jego rzeczywisty kod wyjścia; samo wygenerowanie raportów testów lub JaCoCo nie oznacza, że faza `verify` zakończyła się powodzeniem.

- Zmiany wyłącznie dokumentacyjne: bez testów.
- Drobne zmiany wizualne, CSS i assety: lint dotyczący zmienionych plików, odpowiedni test komponentu tylko wtedy, gdy istnieje lub wnosi wartość, oraz krótka kontrola wizualna. Build uruchamiaj, gdy zmiana dotyczy importów, assetów albo konfiguracji bundlera.
- Lokalna zmiana komponentu: testy bezpośrednio zmienionego komponentu i lint. Nie uruchamiaj pełnego zestawu bez dodatkowego powodu.
- Zmiany logiki współdzielonej, stanu aplikacji, API, zapisu/odczytu konfiguracji lub krytycznych przepływów: uruchom testy powiązanych modułów, a pełny zestaw testów, jeśli zakres może powodować regresje w wielu częściach aplikacji.
- Pełny zestaw testów uruchamiaj również przed większym wydaniem albo gdy użytkownik wyraźnie o niego poprosi.

Nie powtarzaj tej samej kosztownej weryfikacji bez nowej zmiany, która mogła wpłynąć na jej wynik. Jeśli test niezwiązany ze zmianą okaże się niestabilny, najpierw uruchom go osobno zamiast od razu powtarzać cały zestaw.
