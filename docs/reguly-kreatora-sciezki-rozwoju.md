# Reguły kreatora ścieżki rozwoju

> **TODO:** Funkcjonalność opisana w tym dokumencie jest planowana na przyszłość. Obecny kod zawiera wyłącznie granicę modułu. Nie istnieją jeszcze endpoint, model żądania, algorytm planowania ani interfejs użytkownika.

## 1. Zakres funkcjonalności

Kreator ścieżki rozwoju będzie osobną dużą funkcją aplikacji. Nie jest częścią trybu prostego, trybu zaawansowanego ani Doradcy i nie należy rozszerzać żadnego z tych trybów o jego odpowiedzialności.

Jego zadaniem będzie przedstawienie drogi od ekwipunku dostępnego na początku gry do docelowego buildu utworzonego przez gracza w kreatorze. Ścieżka przedmiotów w grze jest w większości ograniczona i liniowa. Rzadkie rzeczywiste alternatywy mogą tworzyć rozgałęzienia, ale narzędzie nie powinno generować sztucznych wariantów bez wartości dla gracza.

## 2. Model prezentacji

Podstawową prezentacją powinna być czytelna oś kolejnych etapów ekwipunku. Graf należy stosować w miejscach, w których istnieje rzeczywisty wybór drogi rozwoju.

Główny węzeł reprezentuje etap ekwipunku, a nie każdą pojedynczą zmianę poziomu drifa. Przy węźle powinien znajdować się plan operacji na kamieniach, na przykład:

- pozostawienie drifa na obecnym poziomie,
- ulepszenie drifa do kolejnego istotnego poziomu,
- przeniesienie drifa do nowego przedmiotu,
- zastąpienie drifa przejściowego docelowym,
- świadome pominięcie nieopłacalnego ulepszenia.

## 3. Planowanie przedmiotów i drifów

Warstwę prawie liniowej ścieżki przedmiotów należy oddzielić od dynamicznego planu drifów. Plan drifów zależy co najmniej od:

- liczby gniazd i pojemności kolejnych przedmiotów,
- ograniczeń tieru, rozmiaru i poziomu drifa,
- bonusów przedmiotów i gwiazdek,
- globalnej kary za powtarzanie typu drifa,
- możliwości i kosztu przeniesienia kamienia,
- kosztu utworzenia, ulepszenia albo zastąpienia drifa,
- czasu korzystania z rozwiązania przejściowego,
- przydatności kamienia w docelowym buildzie.

Algorytm nie powinien optymalizować każdego etapu niezależnie. Lokalnie najlepszy układ może prowadzić do niepotrzebnego wydatku, jeżeli kamień zostanie zastąpiony na następnym etapie.

Istotne poziomy drifów to `6`, `11`, `16` i `21`. Plan powinien operować przede wszystkim na tych progach, o ile przyszłe reguły nie uzasadnią poziomu pośredniego.

## 4. Ocena decyzji

Planowana ocena operacji powinna uwzględniać łącznie:

```text
wartość natychmiastowa
+ wartość zachowana w kolejnych etapach
- koszt wykonania
- strata wynikająca z szybkiego zastąpienia
```

Należy rozróżnić:

- inwestycję docelową — użyteczną również w końcowym buildzie,
- inwestycję przejściową — użyteczną wystarczająco długo, aby uzasadnić koszt,
- inwestycję nieopłacalną — dającą krótką poprawę przed bliskim zastąpieniem.

Kreator nie powinien nazywać ścieżki najlepszą bez zdefiniowanego kryterium oraz dowodu właściwego dla zastosowanego sposobu wyszukiwania.

## 5. Dane wymagane przed implementacją

Przed rozpoczęciem implementacji trzeba uzgodnić i udokumentować co najmniej:

- katalog etapów rozwoju przedmiotów dla każdej profesji,
- rzeczywiste alternatywy między przedmiotami,
- koszty pozyskania, ulepszania, przenoszenia i zastępowania drifów,
- reguły odzyskiwania kamieni,
- sposób wyceny czasu korzystania z rozwiązania przejściowego,
- kryteria porównania ścieżek, np. koszt, szybkość, wzrost siły i liczba zmian,
- kontrakt wejścia oraz sposób wskazania buildu początkowego i docelowego.

Bez danych kosztowych można wyznaczyć ścieżkę statystyczną, ale nie wiarygodny plan ekonomiczny.

## 6. Granice pierwszej wersji

Pierwsza wersja powinna obejmować obecny build, build docelowy oraz niewielką liczbę istotnych etapów pośrednich. Nie powinna próbować prezentować każdego poziomu postaci ani każdej technicznie możliwej konfiguracji.

Moduł nie może zmieniać reguł ekwipunku ani duplikować kalkulatora statystyk. Powinien korzystać ze wspólnej walidacji, kalkulatora i domenowych reguł drifów. Jego rozwój nie może zmieniać semantyki istniejących trybów optymalizatora.
