# Reguły ekwipunku w grze

Dokument opisuje wyłącznie zasady domenowe ekwipunku, drifów, orbów i gwiazdek. Nie opisuje interfejsu, API ani ograniczeń algorytmów. Zachowania aplikacji znajdują się w [integracji ekwipunku](reguly-integracji-ekwipunku.md), [regułach optymalizatora](reguly-optymalizatora.md) i [regułach Doradcy](reguly-doradcy.md).

## 1. Przedmioty i sloty

- Kategoria określa miejsce noszenia przedmiotu.
- Rzadkość (`RARE`, `LEGENDARY`, `EPIC`, `SET`) określa rodzaj drifów i liczbę orbów.
- Tier określa dopuszczalny rozmiar zwykłego drifa, liczbę jego gniazd i maksymalny rozmiar orba.
- Gwiazdki (1–9) zmieniają statystyki, skuteczność kamieni i pojemność; w jednym przypadku również liczbę gniazd.
- Przedmiot ma bazową pojemność, statystyki i ewentualny własny bonus do drifów.

Sloty `helmet`, `armor`, `cape`, `legs`, `boots`, `gloves`, `belt`, `necklace` odpowiadają swoim kategoriom. `ring1` i `ring2` przyjmują `RING`, `shield` przyjmuje `OFF_HAND`, a `weapon` przyjmuje `WEAPON_1H`, `WEAPON_2H` lub `WEAPON_RANGED`.

## 2. Rzadkość

| Rzadkość | Drify | Orby |
| --- | --- | --- |
| RARE | Zwykłe gniazda, ograniczenia tieru i pojemności | Maksymalnie 1 |
| LEGENDARY | Zwykłe gniazda, ograniczenia tieru i pojemności | Maksymalnie 2; drugi ofensywny |
| EPIC | Wbudowane typy drifów; brak zwykłych gniazd | Maksymalnie 1 |
| SET | Wbudowane typy drifów; brak zwykłych gniazd | Maksymalnie 1 |

Epicki lub setowy przedmiot nie musi mieć dwóch wbudowanych drifów. Znane pary to: Allenor — obrażenia fizyczne i krytyk; Attawa — krytyk i trafienie mentalne; Gorthdar — ogień i krytyk; Imisindo — krytyk i trafienie dystansowe; Latarnia Życia — wyssanie many i krytyk; Washi — krytyk i trafienie wręcz; Żmij — krytyk i podwójny atak.

Wbudowane drify mają stałe typy. Wpływają na statystyki i liczbę drifów uwzględnianą przez karę za powtórzenia.

## 3. Gwiazdki

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

- Zwiększenia odnoszą się do wartości bazowej.
- Dodatkowa pojemność obowiązuje tylko przy niezerowej pojemności bazowej.
- Bonus do drifów z gwiazdek dodaje się do własnego bonusu przedmiotu.
- Statystyki specjalne nie otrzymują zwykłego zwiększenia statystyk.
- Dodatkowe punkty są rozdzielane możliwie równo w obrębie właściwej grupy statystyk.
- Przedmioty tieru II i III od 7 gwiazdek otrzymują drugie zwykłe gniazdo drifa.

## 4. Zwykłe drify

| Tier przedmiotu | Największy dopuszczalny drif | Liczba gniazd |
| --- | --- | --- |
| I | SUBDRIF | 1 |
| II–III | SUBDRIF | 1; od 7 gwiazdek 2 |
| IV–VI | BIDRIF | 2 |
| VII–IX | MAGNIDRIF | 2 |
| X–XII | ARCYDRIF | 3 |

Mniejsze rozmiary są dozwolone. Ograniczenia nie dotyczą wbudowanych drifów.

| Rozmiar | Dozwolone poziomy |
| --- | --- |
| SUBDRIF | 1–6 |
| BIDRIF | 1–11 |
| MAGNIDRIF | 1–16 |
| ARCYDRIF | 1–21 |

Rozmiar i poziom są niezależne. W jednym przedmiocie nie wolno powtórzyć typu bonusu drifa. Między przedmiotami typ może się powtarzać.

Drify `DAMAGE_ENERGY`, `DAMAGE_FIRE` i `DAMAGE_FROST` można umieszczać wyłącznie w broni, a broń może zawierać tylko jeden z tych typów. Ograniczenie nie obejmuje `DAMAGE_MAGIC` ani `DAMAGE_PHYSICAL`.

## 5. Pojemność i moc

`moc drifa = bazowa moc typu bonusu × mnożnik poziomu`

| Poziom | Mnożnik mocy |
| --- | --- |
| 1–6 | 1 |
| 7–11 | 2 |
| 12–16 | 3 |
| 17–21 | 4 |

Suma mocy zwykłych drifów musi mieścić się w pojemności przedmiotu. Wolne gniazdo nie zastępuje wolnej pojemności i odwrotnie. Orby nie zużywają pojemności drifów. Wbudowane drify nie zużywają zwykłej pojemności.

## 6. Wartości bonusów, powtórzenia i capy

Wartość drifa na poziomie 1 pochodzi z wartości bazowej, kolejne poziomy dodają przyrost, a przyrosty za poziomy 19–21 są podwójne. Wkład jest mnożony przez łączny bonus przedmiotu i gwiazdek, a następnie przez karę globalną:

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

Kara obejmuje wszystkie drify danego typu, ale nie niezależne źródła tej samej statystyki. Nie każdy typ ma cap. Redukcje zużycia many i kondycji mają ujemny kierunek: większy efekt oznacza bardziej ujemną wartość.

Na końcową statystykę wpływają również przedmioty, orby, statystyki postaci oraz domyślne 2% krytyka i po 5% regeneracji many i kondycji.

## 7. Orby

- Zwykły, epicki i setowy przedmiot mieści maksymalnie jeden orb; legendarny maksymalnie dwa.
- Typ bonusu orba nie może powtarzać się w całym zestawie.
- Orb nie może mieć rozmiaru wyższego niż dopuszczony przez tier przedmiotu.
- SUBORB ma maksymalnie poziom 1; BIORB, MAGNIORB i ARCYORB — poziom 3.
- Bonus orba jest zwiększany przez gwiazdki, ale nie przez bonus przedmiotu do drifów ani karę za powtarzające się drify.

| Slot | Kategorie pierwszego orba |
| --- | --- |
| weapon | OFFENSIVE |
| shield | OFFENSIVE, DEFENSIVE |
| helmet, armor, legs, boots | DEFENSIVE |
| cape, belt, gloves | OFFENSIVE |
| ring1, ring2, necklace | UTILITY |

W legendarnym przedmiocie pierwszy orb może należeć do kategorii slotu albo być ofensywny, a drugi musi być ofensywny. Dwa ofensywne orby muszą mieć różne typy bonusu. Brak orba jest poprawnym stanem.
