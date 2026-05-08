# Projekt Bazy Danych - System Zamówień

## Uruchomienie (Kryterium wspólne)

1. Skopiuj plik env: `cp .env.example .env` i uzupełnij zmienne (`DATABASE_URL`, `MONGO_URI`).
2. Zainstaluj zależności: `npm install`
3. Uruchom migracje bazy: `npx prisma migrate dev`
4. Zasil bazę danymi (seedy): `npm run seed` (wymaga dodania skryptu w package.json: `"seed": "node src/db/seeds/seed.js"`)
5. Uruchom serwer: `npm start`

## Przepływ danych (PG / Mongo)

- **PostgreSQL** odpowiada za twarde dane transakcyjne: katalog produktów, stany magazynowe oraz sfinalizowane zamówienia.
- **MongoDB** działa jako baza dokumentowa i log: przechowuje tymczasowe koszyki (`cart_drafts`) oraz strumień zdarzeń analitycznych (`event_logs`). Finalizacja zamówienia to zapis do PG i usunięcie draftu z Mongo.

## Polityka domenowa (Kryterium S4)

**Zasady dla otwartych koszyków:** Jeśli użytkownik ma w koszyku pozycję, która zostanie usunięta z menu przez administratora, podczas próby finalizacji zamówienia (checkout) system przeprowadza walidację dostępności relacyjnej. Koszyk zostanie odrzucony z błędem 409 (Conflict), zmuszając klienta do odświeżenia koszyka. Ceny historyczne w liniach zamówień (`priceSnapshot`) nie ulegają zmianie niezależnie od modyfikacji w menu.

## Zagrożenia bezpieczeństwa i mitygacja

- **Brak walidacji wejścia:** Należy wdrożyć bibliotekę Zod, aby zapobiec wstrzykiwaniu NoSQL Injection w ciele żądania dla operacji na koszyku.
- **SQL Injection:** Użyto Prisma ORM, a wszystkie natywne zapytania SQL korzystają z bezpiecznej struktury `Tagged Template Literals` ($queryRaw), co automatycznie parametryzuje zapytania.
- **Wyciek danych stack trace:** Został powstrzymany przez globalny middleware błędu, który mapuje błędy techniczne na kody domenowe, nie ujawniając wnętrza bazy (zrealizowane w `index.js`).
