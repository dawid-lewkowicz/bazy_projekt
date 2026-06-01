# System Obsługi Zamówień (Burger API)

Jest to w pełni funkcjonalne API backendowe dla restauracji, obsługujące przeglądanie menu, zarządzanie tymczasowymi koszykami, logowanie zdarzeń oraz finalizację transakcji z użyciem dwóch różnych silników bazodanowych.

## Użyte technologie

- **Node.js + Express.js** – główny serwer aplikacji
- **PostgreSQL + Prisma ORM** – twarda relacyjna baza danych (magazyn, menu, zamówienia, płatności)
- **MongoDB Atlas (Mongoose/Native Driver)** – elastyczna baza dokumentowa w chmurze (logi analityczne, tymczasowe koszyki klientów).
- **Swagger** – interaktywna dokumentacja API
- **Jest + Supertest** – środowisko testów integracyjnych E2E

## Uruchamianie projektu

1. **Instalacja zależności:**

   ```bash
   docker compose up -d
   ```

2. **Działanie projektu**

- Serwer powinien działać na http://localhost:3000/api-docs/
- Dodatkowi możemy wpisać w terminalu npx prisma studio
- Przykładowe body do koszyka
  {
  "sessionId": "dave",
  "items": [
  {
  "variantSku": "BUR-CL-MA",
  "quantity": 1,
  "price": 15.00
  }
  ]
  }

## Analiza Zagrożeń

System został zaprojektowany z myślą o mitygacji następujących krytycznych wektorów ataku oraz awarii infrastruktury:

1. **Manipulacja cenami:** Aplikacja bezwzględnie nie ufa wartościom finansowym przesyłanym w koszyku z aplikacji klienckiej (MongoDB/Frontend). W momencie finalizacji zamówienia, całkowita kwota jest obliczana na serwerze na podstawie autoryzowanych cen wyciągniętych prosto z tabeli `Variant` w PostgreSQL.
2. **Race Conditions (Oversell):** Zabezpieczenie przed jednoczesnym zakupem ostatniego produktu przez wielu klientów. Obniżenie stanu magazynowego odbywa się w izolowanej, atomowej transakcji z twardym warunkiem na poziomie silnika relacyjnego (`where: { stock: { gte: quantity } }`). Zapobiega to ujemnym stanom magazynowym.
3. **Rozproszona Niespójność Danych:** Z racji braku wspólnych transakcji ACID między PostgreSQL a MongoDB, zastosowano **Saga Pattern**. W przypadku, gdy zapis w Postgresie się powiedzie, ale Mongo rzuci błędem sieciowym, serwer wyłapuje wyjątek i odpala **transakcję kompensacyjną** (cofa usunięcie ze stanu magazynowego w PG i blokuje paragon).
4. **SQL Injection:** Pomimo implementacji zaawansowanych, natywnych zapytań SQL dla analityki, wszystkie wejścia do metody `$queryRaw` są parametryzowane pod spodem przez silnik Prisma, co całkowicie neutralizuje ryzyko ataków SQLi.
5. **Wycieki Zasobów:** Zaimplementowano procedurę _Graceful Shutdown_. Przy zamykaniu aplikacji, serwer odcina nasłuchiwanie na nowe żądania HTTP i bezpiecznie zamyka pule połączeń z obiema bazami danych, zapobiegając wiszącym procesom i zablokowanym tabelom.
