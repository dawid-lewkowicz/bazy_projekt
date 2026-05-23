# 🍔 System Obsługi Zamówień (Burger API)

Projekt zaliczeniowy z przedmiotu Bazy Danych. Jest to w pełni funkcjonalne API backendowe (REST) dla restauracji, obsługujące przeglądanie menu, zarządzanie tymczasowymi koszykami, logowanie zdarzeń oraz finalizację transakcji (checkout) z użyciem dwóch różnych silników bazodanowych.

## 🛠️ Technologie

- **Node.js + Express.js** – główny serwer aplikacji.
- **PostgreSQL + Prisma ORM** – twarda relacyjna baza danych (magazyn, menu, zamówienia, płatności).
- **MongoDB Atlas (Mongoose/Native Driver)** – elastyczna baza dokumentowa w chmurze (logi analityczne, tymczasowe koszyki klientów).
- **Swagger** – interaktywna dokumentacja API.
- **Jest + Supertest** – środowisko testów integracyjnych E2E.

---

## 🚀 Uruchamianie projektu

Aby odpalić projekt lokalnie, wykonaj poniższe kroki:

1. **Instalacja zależności:**
   ```bash
   npm install
   npx prisma migrate dev   # Aktualizuje strukturę bazy relacyjnej
   npm run seed             # (Opcjonalnie) Wrzuca przykładowe burgery do bazy
   npm start
   npm test
   ```
