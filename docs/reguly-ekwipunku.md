# Reguły ekwipunku i układania kamieni

Dokument opisuje reguły odczytane z aplikacji 2026-09-03. Jest kontekstem dla zmian edytora, kalkulatora i optymalizatora. Nie stanowi niezależnej specyfikacji zewnętrznej gry. Rozbieżności implementacji wymieniono osobno; nie należy utrwalać ich jako zamierzonych reguł. Aktualizuj ten dokument razem ze zmianami zachowania.

## 1. Niezależne cechy przedmiotu

- **Kategoria** określa miejsce noszenia przedmiotu.
- **Rzadkość** (`RARE`, `LEGENDARY`, `EPIC`, `SET`) określa m.in. zwykłe lub wbudowane drify oraz liczbę orbów.
- **Tier** określa dopuszczalny rozmiar drifa i liczbę zwykłych gniazd. Edytor ogranicza też tier orba do tieru przedmiotu.
- **Gwiazdki** (1–9) zmieniają statystyki, skuteczność kamieni i pojemność; w jednym przypadku również liczbę gniazd. Nie zmieniają tieru ani rozmiaru kamienia.
- **Dane szablonu** zawierają bazową pojemność, statystyki i ewentualny własny bonus do drifów. Nie należy wyliczać tych wartości wyłącznie z rzadkości.

Sloty `helmet`, `armor`, `cape`, `legs`, `boots`, `gloves`, `belt`, `necklace` odpowiadają swoim kategoriom. `ring1` i `ring2` przyjmują `RING`, `shield` przyjmuje `OFF_HAND`, a `weapon` przyjmuje `WEAPON_1H`, `WEAPON_2H` lub `WEAPON_RANGED`. Sama ta mapa nie definiuje współzależności broni dwuręcznej i drugiej ręki.

## 2. Rzadkość przedmiotu

| Rzadkość | Drify | Orby |
| --- | --- | --- |
| RARE | Zwykłe gniazda, ograniczenia tieru i pojemności | Maksymalnie 1 |
| LEGENDARY | Zwykłe gniazda, ograniczenia tieru i pojemności | Maksymalnie 2; drugi ofensywny |
| EPIC | Typy wbudowane wynikające z mapy przedmiotów; brak zwykłych gniazd | Maksymalnie 1 |
| SET | Edytor i optymalizator stosują ścieżkę wbudowanych drifów; brak zwykłych gniazd | Maksymalnie 1 |

Samo `EPIC` lub `SET` nie gwarantuje dwóch wbudowanych drifów: lista pochodzi z `EquipmentRulesRegistry.EPIC_BUILTIN_DRIFS`, według nazwy bez końcowego rzymskiego oznaczenia wariantu.

Obecna mapa: Allenor — obrażenia fizyczne i krytyk; Attawa — krytyk i trafienie mentalne; Gorthdar — ogień i krytyk; Imisindo — krytyk i trafienie dystansowe; Latarnia Życia — wyssanie many i krytyk; Washi — krytyk i trafienie wręcz; Żmij — krytyk i podwójny atak.

Edytor wybiera dla wbudowanych bonusów szablony `MAGNIDRIF` i pozwala ustawić poziomy 1–16. Ich typy są stałe. Optymalizator zachowuje całe sloty epickie i setowe, również poziomy drifów. Wbudowane drify nadal wpływają na statystyki i liczbę bonusów używaną do obliczania kary.

## 3. Wpływ gwiazdek

Wartości procentowe w tabeli oznaczają zwiększenie względem bazy, nie kolejne mnożenie przez każdy wcześniejszy poziom gwiazdek.

| Gwiazdki | Zwiększenie statystyk | Zwiększenie bonusu orba | Bonus do drifów | Dodatkowa pojemność |
| --- | --- | --- | --- | --- |
| 1 | 0% | 0% | 0% | 0 |
| 2 | 3% | 0% | 0% | 0 |
| 3 | 6% | 0% | 0% | 0 |
| 4 | 10% | 5% | 0% | 0 |
| 5 | 15% | 10% | 0% | 0 |
| 6 | 20% | 20% | 0% | 0 |
| 7 | 25% | 30% | 3% | +1 |
| 8 | 35% | 50% | 8% | +2 |
| 9 | 50% | 75% | 15% | +4 |

- Dodatkowa pojemność obowiązuje tylko przy niezerowej bazowej pojemności. Baza 0 lub brak wartości daje pojemność 0.
- Bonus do drifów z gwiazdek dodaje się do własnego bonusu przedmiotu. Przykład: własne 20% i 9 gwiazdek daje mnożnik `1 + 0,20 + 0,15 = 1,35`.
- Statystyki specjalne nie otrzymują zwykłego zwiększenia statystyk. `ItemStatProcessor` wydziela je przed rozdziałem premii.
- Kalkulator rozdziela pulę dodatkowych punktów osobno między statystyki bazowe i odporności. Pula to zaokrąglona suma wartości danej grupy pomnożona przez premię gwiazdek, a rozdział korzysta z `RandomProvider`. Nie zakładaj, że każda statystyka indywidualnie wzrośnie dokładnie o procent z tabeli.
- Dla tierów II i III od 7 gwiazdek dochodzi drugie zwykłe gniazdo drifa. Pozostałe tiery nie otrzymują dodatkowego gniazda z gwiazdek.

## 4. Zwykłe drify: tier, rozmiar i gniazda

| Tier przedmiotu | Największy dopuszczalny drif | Liczba gniazd |
| --- | --- | --- |
| I | SUBDRIF | 1 |
| II–III | SUBDRIF | 1; od 7 gwiazdek 2 |
| IV–VI | BIDRIF | 2 |
| VII–IX | MAGNIDRIF | 2 |
| X–XII | ARCYDRIF | 3 |

Mniejsze rozmiary są dozwolone. Tabela nie dotyczy wbudowanych drifów epików i setów.

| Rozmiar | Dozwolone poziomy |
| --- | --- |
| SUBDRIF | 1–6 |
| BIDRIF | 1–11 |
| MAGNIDRIF | 1–16 |
| ARCYDRIF | 1–21 |

**Rozmiar i poziom to różne cechy.** Arcydrif na poziomie 6 nadal wymaga przedmiotu dopuszczającego arcydrif; nie staje się subdrifem.

W jednym przedmiocie nie wolno powtórzyć typu bonusu (`bonusType`), nawet używając różnych rozmiarów lub szablonów tego drifa. Między przedmiotami typy mogą się powtarzać, z globalną karą opisaną dalej.

Drify `DAMAGE_ENERGY`, `DAMAGE_FIRE`, `DAMAGE_FROST` można umieszczać wyłącznie w `weapon`, a w broni może znajdować się tylko jeden z nich. Ograniczenie nie obejmuje `DAMAGE_MAGIC` ani `DAMAGE_PHYSICAL`. Kalkulator, edytor i optymalizator stosują tę samą regułę.

## 5. Pojemność i moc drifów

`moc drifa = basePower jego typu bonusu × mnożnik aktualnego poziomu`

| Poziom | Mnożnik mocy |
| --- | --- |
| 1–6 | 1 |
| 7–11 | 2 |
| 12–16 | 3 |
| 17–21 | 4 |

Bazowe moce typów znajdują się w `DRIF_BONUS_TYPE`; nie są jednakowe dla wszystkich drifów. Suma mocy zwykłych drifów musi mieścić się w pojemności konkretnego przedmiotu. Wolne gniazdo nie zastępuje wolnej pojemności i odwrotnie. Orby nie zużywają tej pojemności.

Przykład: dla mocy bazowej 4 poziom 6 zużywa 4 pojemności, poziom 7 zużywa 8, poziom 16 zużywa 12, a poziom 17 zużywa 16. Zmiana poziomu 11 na 7 nie uwalnia pojemności; dopiero zejście do 6 ją zmniejsza.

W optymalizatorze sloty `EPIC` i `SET` są wyłączone z rozliczania pojemności. Walidator kalkulatora wyłącza z mocy rozpoznane wbudowane bonusy; nie jest to ogólne pozwolenie na wkładanie dowolnych kamieni do epików lub setów.

## 6. Wartości bonusów i kara za powtórzenia

Wartość drifa na poziomie 1 pochodzi z `baseValue`; następne poziomy dodają `increment`. Przyrosty za poziomy 19, 20 i 21 są podwójne. Obliczenia uwzględniają wartości procentowe i ujemne.

Wkład drifa jest mnożony przez `1 + bonus przedmiotu do drifów + bonus gwiazdek do drifów`. Następnie obowiązuje mnożnik zależny od liczby drifów tego samego typu w całym zestawie:

| Liczba drifów typu | Mnożnik |
| --- | --- |
| 1–3 | 1,00 |
| 4 | 0,95 |
| 5 | 0,87 |
| 6 | 0,80 |
| 7 | 0,74 |
| 8 | 0,69 |
| 9 | 0,64 |
| 10 | 0,59 |
| 11 | 0,54 |
| 12 i więcej | 0,50 |

Kara obejmuje wszystkie wkłady danego typu, nie tylko czwarty i następne kamienie. Nie należy stosować jej do niezależnych źródeł statystyki, np. bazowych statystyk postaci.

Capy i bazowe moce są zapisane w `DRIF_BONUS_TYPE`; nie każdy typ ma cap. Redukcje zużycia many i kondycji mają ujemny kierunek, więc większa wartość liczbowa nie zawsze oznacza lepszy efekt. Zakresy liczby drifów 0–12 w żądaniu optymalizacji są ograniczeniami konfiguracji optymalizatora; nie myl ich z tabelą kary.

Kalkulator uwzględnia również źródła inne niż drify: statystyki przedmiotów, orby, dane postaci i domyślne 2% krytyka oraz po 5% regeneracji many i kondycji. Cel procentowy trzeba odnosić do właściwej sumy, nie wyłącznie do wkładu przekładanych drifów.

## 7. Orby

- Maksymalnie jeden orb w zwykłym, epickim i setowym przedmiocie; maksymalnie dwa w legendarnym. Drugi orb musi być ofensywny.
- Typ bonusu orba nie powinien powtarzać się w całym zestawie. Backend odrzuca powtórzenia wewnątrz przedmiotu, a przy obliczaniu kolejnych przedmiotów pomija już użyty typ.
- Edytor dopuszcza orby o tierze nie większym niż tier przedmiotu.
- SUBORB ma maksymalnie poziom 1; BIORB, MAGNIORB i ARCYORB — poziom 3. Wartości na poziomach pochodzą z pól `bonusLvl1/2/3`, a nie ze wzoru przyrostów drifa.
- Bonus orba mnoży się przez `1 + orbMod` gwiazdek z tabeli. Nie stosuje się do niego bonusu przedmiotu do drifów ani kary za liczbę drifów.

Kategorie pierwszego orba według slotu:

| Slot | Kategorie |
| --- | --- |
| weapon | OFFENSIVE |
| shield | OFFENSIVE, DEFENSIVE |
| helmet, armor, legs, boots | DEFENSIVE |
| cape, belt, gloves | OFFENSIVE |
| ring1, ring2, necklace | UTILITY |

Legenda ma dwa dostępne miejsca na orby; nie ma obowiązku zapełniania obu. Pierwszy orb może należeć do kategorii dopuszczonej dla slotu lub być ofensywny, drugi musi być ofensywny. Dozwolone są więc także dwa ofensywne orby o różnych bonusach. Edytor i backend uwzględniają ten wyjątek dla legend. Backend sprawdza rzadkość przedmiotu przy dopuszczaniu drugiego orba, limit dwóch orbów i zakaz powtarzania bonusu w przedmiocie.

## 8. Doradca i blokady

Doradca analizuje aktualny build i przedstawia rekomendowane zakupy oraz zamiany. Nie stosuje wyniku automatycznie. Blokada całego slotu zachowuje jego konfigurację, a blokada konkretnego drifa zachowuje ten drif w danej pozycji. Każda rekomendacja musi respektować tier, liczbę gniazd, pojemność, unikalność bonusu w przedmiocie oraz ograniczenia żywiołów i orbów.

Cele Doradcy są względne wobec statystyk obliczonych przez backend dla aktualnego buildu. Użytkownik wskazuje główny modyfikator, również obecnie równy zero. Może maksymalizować jego efekt, wskazać wartość docelową albo przyrost w punktach procentowych. Dla redukcji większy efekt oznacza bardziej ujemną wartość; cel podaje się jako dodatnią wielkość redukcji. Pozostałe obecne mody są domyślnie chronione na aktualnym poziomie. Dla każdego można dopuścić spadek w p.p. albo wyłączyć ochronę. Końcowe plany muszą spełniać minima według kalkulatora; Doradca nie stosuje tolerancji 0,5 p.p. z trybu „od zera”.

Doradca ma osobne wyszukiwanie zaczynające się od posiadanych drifów, z zachowaniem ich liczby, rozmiarów i poziomów. Przełożenia do wolnego gniazda i zamiany dwóch sztuk są zawsze dopuszczone. Osobne opcje pozwalają analizować gwiazdki, ulepszanie drifów, zakup dodatkowych drifów, wymiany przedmiotów i zmiany orbów. Domyślnie włączone są tylko przełożenia i gwiazdki. Żadna opcja nie pozwala usuwać posiadanych drifów lub obniżać ich poziomów. Drify wbudowane nie są przekładane ani ulepszane; gwiazdki i orby ich przedmiotu mogą być zmieniane, o ile cały slot nie jest zablokowany.

Plan zawiera maksymalnie 1–3 działania. Jedno działanie to przełożenie, zamiana dwóch drifów, podniesienie jednego przedmiotu do wybranej liczby gwiazdek, ulepszenie jednego drifa lub pojedynczy zakup/wymiana. Gwiazdki analizowane są na wszystkich wyższych poziomach do 9, razem ze zmianami pojemności, gniazd i bonusów. Wymiana przedmiotu zachowuje jego aktualne gwiazdki i kamienie oraz wymaga zgodności z nowym przedmiotem; podniesienie gwiazdek jest osobnym działaniem. Wyszukiwanie może przejściowo naruszać minima modów, aby znaleźć kompensującą kombinację; prezentowany wynik musi je spełniać.

W jednym żądaniu backend ładuje katalog i współdzieli cache wkładów slotów (klucz obejmuje przedmiot, gwiazdki, orby i drify). Bada krótkie plany w ograniczonej wiązce, z limitem 20 000 ocenionych stanów i budżetem 1,5 s lub 5 s dla całej analizy, z rezerwą na weryfikację. Operacje odczytu danych i pojedyncza weryfikacja kalkulatorem nie są przerywane w połowie, więc czas odpowiedzi może przekroczyć budżet. Zatrzymanie kończy wyszukiwanie i pozwala zwrócić sprawdzone propozycje. Sprawdzanych jest maksymalnie 18 finalistów; UI otrzymuje do 6 planów, w tym znalezione alternatywy samych przełożeń i pojedynczego ulepszenia. Brak planu oznacza brak znalezionej poprawy w sprawdzonym zakresie, nie dowód niemożliwości.

Przy maksymalizacji ranking preferuje większy efekt do capa, a przy równym efekcie mniejszą ingerencję. Przy zadanym celu pierwszeństwo mają plany, które go osiągają, następnie mniej zakupów/ulepszeń, mniej podniesionych poziomów i mniej działań. To miara ingerencji, nie koszt walutowy. Cele już spełnione przez aktualny build nie wymagają zmian. Po ręcznej zmianie buildu, bazowych statystyk lub blokad trzeba ponowić analizę przed zastosowaniem starego planu.

Profil profesji może być wybrany ręcznie jako magiczny lub fizyczny. W trybie automatycznym wynika z całego założonego ekwipunku i bazowych statystyk postaci: Moc/Wiedza wskazują profil magiczny, a Siła/Zręczność fizyczny. Przy remisie profil jest uniwersalny. Zamiennik przedmiotu musi należeć do wybranego profilu albo być uniwersalny; niesklasyfikowane bronie są dopuszczalne dla obu profili. Blokada slotu wyłącza jego gwiazdki, przedmiot i orb z rekomendowanych zmian.

Ograniczenia obecnego algorytmu Doradcy: wymiany przedmiotów dotyczą zwykłych slotów i do trzech kandydatów na slot, wybranych według bonusu do drifów i pojemności. Zakupy drifów dotyczą głównego moda i poziomów 1/6/11/16/21 dopuszczonych przez rozmiar. Nie są to ograniczenia domenowe gry. Pełną przebudowę z katalogu nadal obsługuje tryb „od zera”.

Obecny katalog orbów używa innych kluczy statystyk niż drify. Włączenie zmian orbów nie powoduje ich przeszukiwania, jeśli nie mogą wpłynąć na wybrany mod ani chronione mody. Zwiększenie bonusów istniejących orbów przez gwiazdki pozostaje uwzględnione w końcowym kalkulatorze.

## 9. Znane rozbieżności implementacji
- Ograniczenie tieru orba jest filtrem edytora, nie kontrolą w `OrbStatProcessor`.
- `DrifSecurityValidator` sprawdza przekroczenie pojemności tylko wtedy, gdy wynosi ona więcej niż 0. Nie kontroluje liczby gniazd. Nie oznacza to nieskończonej pojemności lub liczby gniazd dla danych wejściowych API.
- Końcowy walidator optymalizatora sprawdza ilości, liczbę drifów, pojemność i duplikaty; nie powtarza całej kontroli tieru, żywiołów ani zachowania inwentarza. Nie zastępuje sprawdzania poprawności ruchów i danych wejściowych.
- Dla brakującego poziomu import edytora stosuje 21, a backend zwykle 1 i normalizację do rozmiaru. Przy interpretowaniu niepełnych konfiguracji trzeba uwzględnić tę różnicę.

## 10. Mapa implementacji

Ścieżki backendowe poniżej są względem `Broken_Ranks_Tool_Backend/src/main/java/pl/brokenranks/tool/broken_ranks_tool/`:

| Obszar | Źródła |
| --- | --- |
| Kategorie slotów, orby, wbudowane drify, kary | `equipment/domain/rules/EquipmentRulesRegistry.java` |
| Gwiazdki, rozmiary, moce i capy | `equipment/domain/enums/ITEM_STAR.java`, `DRIF_SIZE.java`, `ORB_SIZE.java`, `DRIF_BONUS_TYPE.java`, `RARITY.java` |
| Poziomy, pojemność, moc | `equipment/service/validator/UpgradeLevelPolicy.java`, `equipment/domain/util/DrifPowerRules.java` |
| Dopasowanie i walidacja kamieni | `equipment/service/validator/EquipmentPlacementRules.java`, `DrifSecurityValidator.java`, `OrbSecurityValidator.java` |
| Statystyki, bonusy i naliczanie kary | `equipment/service/calculator/processor/ItemStatProcessor.java`, `DrifStatProcessor.java`, `OrbStatProcessor.java`; `equipment/service/calculator/DrifCounter.java`, `StatsAccumulator.java` |
| Wartość drifa | `equipment/domain/rules/DrifValueCalculator.java`; `optimization/engine/rules/DrifOptimizationMath.java` |
| Gniazda i inwentarz optymalizatora | `optimization/engine/context/OptimizationSlotContextFactory.java`, `OptimizationInitialStateFactory.java` |
| Blokady optymalizatora i doradcy | `optimization/constraints/OptimizationLockService.java` |
| Kontrola końcowego układu | `optimization/engine/result/OptimizationFinalResultValidator.java`, `OptimizationSetupMapper.java` |

Odpowiedniki frontendowe względem `Broken_Ranks_Tool_Frontend/src/`: `components/gear_slot/gearSlotDomain.js`, `StandardDrifSlot.jsx`, `BuiltInDrifSlots.jsx`; `hooks/useGearSlot.js`, `useGearSlotDragDrop.js`; `components/optimization/OptimizerSettingsPanel.jsx`, `OptimizerLocksColumn.jsx`.

Przy zmianach reguł sprawdzaj powiązane warstwy zamiast zakładać, że edytor lub sam optymalizator jest jedynym źródłem zachowania.
