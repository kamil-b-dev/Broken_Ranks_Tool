# Utrzymanie i odzyskiwanie produkcji

Produkcja: <https://brokenrankstool-production.up.railway.app>.
Backend, frontend i katalog SQLite są dostarczane w jednym obrazie.
Katalog jest tylko do odczytu; biblioteka użytkownika znajduje się w przeglądarce.

## Monitoring

Workflow **Production monitoring** sprawdza co około 10 minut:

- `/`: odpowiedź HTML aplikacji, a nie sam kod HTTP 200;
- `/actuator/health/readiness`: status `UP`;
- `/api/initial-data`: niepuste listy przedmiotów, orbów i drifów oraz reguły gry.

Nieudane żądanie jest ponawiane po 10 sekundach. Trwała awaria otwiera jeden
GitHub Issue przypisany do `kamil-b-dev`. Kolejne niepowodzenia nie dodają komentarzy;
powrót wszystkich kontroli do normy dodaje informację o odzyskaniu i zamyka zgłoszenie.
Monitor nie wysyła konfiguracji użytkowników ani nie uruchamia optymalizacji.
Raport nie zawiera treści odpowiedzi ani dowolnych komunikatów sieciowych.

Po scaleniu workflowu do `master` uruchom go ręcznie w Actions i potwierdź sukces.
Adres można zmienić przez zmienną repozytorium `PRODUCTION_URL` (sam origin HTTPS).
Powiadomienia o przypisanych Issues i nieudanych Actions muszą być włączone na koncie
GitHub; kanał email zależy od osobistych ustawień powiadomień.

To monitoring podstawowy. GitHub może opóźniać lub pomijać przebiegi harmonogramu;
po 60 dniach braku aktywności w publicznym repozytorium może go wyłączyć.
Przy długiej przerwie w rozwoju sprawdzaj aktywność workflowu albo przenieś kontrolę
do niezależnej usługi uptime. Endpoint Railway służy kontroli wdrożenia, nie stałemu monitoringowi.

Źródła: [harmonogram GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule),
[healthcheck Railway](https://docs.railway.com/deployments/healthchecks).

## Ustawienia Railway do ręcznego sprawdzenia

Na prośbę właściciela w tej pracy nie zmieniano ustawień panelu Railway.
Poniższe wartości pochodzą z istniejącej instrukcji `DEPLOYMENT.md`; nie są
potwierdzeniem bieżącej konfiguracji konta.

| Ustawienie | Wartość do sprawdzenia |
| --- | --- |
| Źródło wdrożeń | `kamil-b-dev/Broken_Ranks_Tool`, gałąź `master` |
| Wait for CI / check suites | włączone; wdrożenie po zakończeniu kontroli |
| Healthcheck | `/actuator/health/readiness` |
| Restart | `On Failure`, co najmniej domyślne 10 prób |
| Repliki | 1; limity żądań są lokalne dla procesu |
| Pamięć / CPU | 4 GB / 1 vCPU |
| Alert zużycia compute | 10 USD |
| Twardy limit compute | 15 USD; osiągnięcie limitu wyłącza obciążenia |
| Powiadomienia o wdrożeniu i awarii | włączone dla właściciela |
| Środowiska PR | wyłączone, jeśli nie są potrzebne |
| Wolumen i baza użytkowników | brak; SQLite w obrazie jest tylko do odczytu |

Zweryfikuj również `JAVA_TOOL_OPTIONS` względem `DEPLOYMENT.md`, ponieważ zmienna
w panelu może nadpisywać ustawienie obrazu. Zapisz datę i wynik ręcznej kontroli
w opisie wydania, bez kopiowania sekretów.

Źródła: [restarty](https://docs.railway.com/deployments/restart-policy),
[koszty i limity](https://docs.railway.com/pricing/cost-control),
[gotowość produkcyjna](https://docs.railway.com/overview/production-readiness-checklist).

## Nowe stabilne wydanie

1. Zmiany standardowo przechodzą PR do `dev`, a następnie PR z `dev` do `master`.
   Poprawkę przygotowaną z aktualnego `master` można wydać osobnym PR produkcyjnym;
   potem zsynchronizuj `dev` z `master`, zachowując trwające prace.
2. Przed scaleniem sprawdź testy backendu i frontendu, integrację, kontrakty,
   CodeQL oraz audyty backendu, obu zestawów npm i obrazu. Nie pomijaj nieudanych kontroli.
3. Po wdrożeniu sprawdź monitoring, uruchomienie kreatora, obliczenie statystyk,
   zapis buildu oraz import jego kopii. Potwierdź w Railway SHA wdrożonego commita.
4. Oznacz dokładnie ten commit tagiem, np. `v1.0.0`, i utwórz GitHub Release.
   W opisie zapisz SHA, datę, zmiany, znane ograniczenia i poprzedni stabilny tag.
   Nie taguj niezacommitowanego katalogu roboczego ani nie przesuwaj istniejącego tagu.
5. Zachowaj plik kopii przykładowej biblioteki z poprzedniej wersji do kontroli importu
   przed kolejnym wydaniem. Nie publikuj prywatnych konfiguracji użytkowników.

Ograniczenia do podania użytkownikom: lokalne zapisy nie synchronizują się pomiędzy
urządzeniami i domenami; biblioteka mieści 10 buildów; zakres jej kopii opisano poniżej.
Ograniczenia algorytmów i aktualność katalogu oceniaj dla konkretnego wydania.

## Cofnięcie wadliwego wdrożenia

1. W Railway otwórz Deployments i wybierz poprzednie **udane** wdrożenie zgodne
   z zapisanym tagiem i SHA. Użyj Rollback, jeśli obraz jest jeszcze zachowany.
   Cofnięcie może przywrócić również historyczne zmienne; porównaj je z bieżącymi.
2. Jeżeli minął czas przechowywania obrazu, skorzystaj z Redeploy poprzedniego
   wdrożenia lub przygotuj PR cofający wadliwą zmianę. Nie rób force-pusha na `master`.
3. Po zakończeniu uruchom **Production monitoring**, następnie sprawdź kreator,
   kalkulator i zapis lokalny. W razie problemu z importem zachowaj oryginalny plik
   kopii i dane przeglądarki; nie naprawiaj ich przez kasowanie magazynu.
4. Powiąż zgłoszenie awarii z poprawką i potwierdzonym SHA przywróconej wersji.

Cofnięcie serwera nie cofa danych w przeglądarkach użytkowników. Przy zmianie formatu
zapisu starszy frontend musi umieć go odczytać albo istnieje osobny plan odzyskania.
Nie przeprowadzaj próbnego wyłączenia działającej produkcji tylko w celu sprawdzenia procedury.

Railway przechowuje stare obrazy przez okres zależny od planu; tag Git sam w sobie
nie gwarantuje odtworzenia identycznego obrazu z przyszłymi wersjami zależności.
Źródło: [cofanie wdrożeń](https://railway.com/guides/roll-back-bad-deploy).

## Odzyskanie biblioteki użytkownika

1. W Buildach lokalnych pobierz całą bibliotekę; sprawdź, czy plik JSON został zapisany.
2. Na drugim urządzeniu lub w nowym profilu przeglądarki otwórz aplikację i wczytaj kopię.
3. Sprawdź podgląd konfliktów, zatwierdź import i otwórz przywrócony build w kreatorze.
4. Porównaj przedmioty, gwiazdki, kamienie, blokady i plecak. Statystyki są przeliczane
   według bieżącego katalogu i reguł; różnica po aktualizacji nie musi oznaczać utraty danych.

Test `e2e/mobile-library-recovery.spec.js` wykonuje eksport, import w osobnym pustym
kontekście przeglądarki, porównanie zapisanych rekordów, przeładowanie i otwarcie buildu
na desktopie i telefonie. API jest w tym teście kontrolowane przez fixture; test
sprawdza odzyskiwanie lokalnego magazynu, nie dostępność produkcyjnego API.

Kopia biblioteki obejmuje zapisane buildy i ich plecaki, ale **nie obejmuje roboczego
szkicu ani lokalnego postępu planera**. Szkic zapisz najpierw jako build. Projekt
ścieżki eksportuj osobno; nie traktuj eksportu projektu jako kopii wszystkich lokalnych
znaczników postępu i ustawień. Szczegóły: [kopia biblioteki](kopia-biblioteki.md).

## Stan sprawdzenia 2026-11-13

- Publiczny readiness odpowiedział HTTP 200.
- `master` na SHA `b8414d080c576d4d9ffaa5942fcac775da613b4a` miał zakończone sukcesem
  [Quality checks](https://github.com/kamil-b-dev/Broken_Ranks_Tool/actions/runs/42723449847).
- Aktywny ruleset wymaga testów, audytów i CodeQL, aktualności gałęzi oraz blokuje
  usunięcie i force-push. Nie ma wyjątków pozwalających ominąć reguły.
- Włączono i odczytem potwierdzono prywatne zgłaszanie podatności.
- Ustawienia Railway i próbny rollback nie zostały zweryfikowane w panelu.
- Potwierdzenie wdrożonego SHA i publikacji tagu zapisz w GitHub Release po wykonaniu
  kontroli opisanych wyżej. Sama obecność tej instrukcji nie potwierdza publikacji.
