# Planowanie, zapisy i udostępnianie buildów

## Kreator

- **Podgląd wymiany przedmiotu** w edytorze slotu przelicza obecny zestaw i jego
  odłączoną kopię z zamiennikiem. Nie zakłada zamiennika. Nowy przedmiot ma 1★,
  a jego wbudowane drify poziom 1. Zachowanie dotychczasowych kamieni wymaga
  poprawnego osadzenia; można je wyłączyć przed porównaniem.
- **Profesja do sprawdzenia wymagań** ostrzega o poziomie i ograniczeniu profesji.
  Automatyczny wybór korzysta z jednoznacznej profesji broni. Ostrzeżenia nie
  blokują planowania przyszłego wyposażenia.
- **Własny synergetyk** jest dostępny dla obu pierścieni i naszyjnika. Przyjmuje
  nazwę oraz rzeczywiste całkowite wartości atrybutów, pancerza i odporności
  od 0 do 50000. Nie ma kamieni ani zwiększania statystyk gwiazdkami. Zastosowanie
  formularza zastępuje konfigurację wybranego slotu; montaż formularza jej nie zmienia.

## Biblioteka

Każda karta ma rozwijaną sekcję **Opis, wersje i narzędzia**:

- notatkę do 2000 znaków i do 10 oznaczeń po 32 znaki;
- do 10 poprzednich wersji wyposażenia, postaci, blokad, plecaka i statystyk;
- przywracanie wersji, które zachowuje również zastępowany stan w historii;
- przeliczenie zapisanego buildu według obecnego kalkulatora;
- listę braków i ulepszeń względem aktywnego ekwipunku oraz całego plecaka;
- wygenerowanie linku do podglądu i pobranie tekstowej karty PNG.

Jedna sztuka może pokryć tylko jedno wymaganie. Większy rozmiar lub poziom kamienia
nie jest traktowany jak możliwość jego obniżenia. Wbudowane drify pozostają przy
przedmiocie, a ich ulepszenia są osobnymi pozycjami. Statystyki synergetyka wymagające
zmiany są oznaczone jako konfiguracja ręczna.

**Przelicz wybrane buildy** aktualizuje statystyki zaznaczonych zapisów kolejno,
bez wczytywania ich do kreatora. Zmiana zapisu w innej karcie podczas żądania
blokuje nadpisanie nowszych danych. Błędy zapisu pozostawiają poprzednią bibliotekę.

Historia i opisy należą do kopii całej biblioteki. Sam plik buildu przechowuje
konfigurację ekwipunku. Nowy format v4 zawiera jawne statystyki synergetyków;
czytniki v1–v3 i ich zamrożone eksportery pozostają dostępne. Szkic v4 migruje
starsze dane przez odczyt, bez zastępowania wcześniejszych kluczy magazynu.

## Link i PNG

Udostępnienie przelicza wybrany zapis, a jego wyposażenie i statystyki umieszcza
w fragmencie adresu. Plecak i blokady nie są udostępniane. Serwer nie zapisuje
linku ani jego dokumentu; funkcja nie wymaga kont ani nowej bazy danych.

Odbiorca widzi odłączony podgląd i zapisane statystyki. Może przeliczyć je ponownie
lub jawnie wybrać **Skopiuj do kreatora**. Otwarcie linku i przeliczanie podglądu
nie zastępują jego roboczego zestawu. PNG powstaje lokalnie w przeglądarce.

## Ścieżka rozwoju

**Początek ścieżki** pozwala wybrać domyślny poziom 1, aktualny kreator z plecakiem,
zapisany build albo plik. Punktem początkowym jest dokładny snapshot, z jego poziomem
i konkretnymi posiadanymi sztukami. Ten poziom nie może przekraczać poziomu celu.

**Obowiązkowe przedmioty pośrednie** przyjmują do 24 wyborów slotu, poziomu i przedmiotu.
Filtr krótkich etapów ich nie usuwa. Obowiązują wymagania noszenia, rezerwacje res,
jedna rzecz w slocie na danym poziomie oraz epik poprzedzający legendę. Dokładny cel
pozostaje końcem ścieżki. Te opcje należą do osobnego planera, a nie trybu od zera.

Posiadane kamienie są dopasowywane jako osobne sztuki, z możliwością przenoszenia
i monotonicznego ulepszania. Niewykorzystane większe kamienie pozostają w puli;
nie są obniżane do mniejszych wymagań. Posiadane przedmioty nie trafiają ponownie
na listę zakupów. Cel wymagający obniżenia gwiazdek tego samego założonego
przedmiotu wymaga poprawienia konfiguracji celu.

Projekt v3 zapisuje początek i etapy obowiązkowe. Projekty v1/v2 nadal są odczytywane.
Tożsamość lokalnego postępu uwzględnia nowe wejście, więc stare odhaczenia nie są
przenoszone na inną ścieżkę.

## Doradca i archiwum

**Wykluczenia Doradcy** pomijają wskazane zamienniki przedmiotów przed wyborem
frontu pojemności. Wykluczenie typu kupowanego drifa nie blokuje przenoszenia
ani ulepszania posiadanej sztuki. Własne synergetyki są zachowywane w wyniku.
Zmiana wykluczeń unieważnia bieżący raport; zapis ustawień zachowuje wykluczenia.

**Archiwum analiz** zapisuje do 10 kompletnych wyników z wariantami, buildem
wejściowym i konfiguracją analizy, do 4 MB łącznie. Odtworzenie pokazuje historyczny
raport bez nowego wyszukiwania i bez zastosowania wariantu do bieżącego ekwipunku.
Analizy można pobierać do JSON i usuwać. Uszkodzonego archiwum nie nadpisuje się:
odzyskiwanie najpierw zachowuje i sprawdza dokładną kopię oryginalnych danych.
