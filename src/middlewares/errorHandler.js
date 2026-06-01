function errorHandler(err, req, res, next) {
  console.error(" [ERROR LOG]:", err.stack || err.message); // err.stack daje pełną ścieżkę błędu w konsoli

  const errorResponse = {
    error: err.message || "Nieznany błąd serwera",
    code: err.code || "INTERNAL_SERVER_ERROR",
    details: err.details || "Brak dodatkowych szczegółów",
  };

  if (err.code === "P2002") {
    errorResponse.error = "Naruszenie unikalności danych w bazie.";
    errorResponse.code = "DB_UNIQUE_CONSTRAINT";
    errorResponse.details = `Pole: ${err.meta?.target || "nieznane"}`;
    return res.status(409).json(errorResponse);
  }

  if (err.code === "P2025") {
    errorResponse.error = "Żądany rekord nie istnieje w bazie danych.";
    errorResponse.code = "DB_RECORD_NOT_FOUND";
    return res.status(404).json(errorResponse);
  }

  if (err.code === "DOMAIN_OVERSELL" || err.message.includes("OVERSELL")) {
    errorResponse.code = "DOMAIN_OVERSELL";
    return res.status(409).json(errorResponse);
  }

  if (err.code === "CART_EMPTY" || err.message.includes("Koszyk jest pusty")) {
    errorResponse.code = "CART_EMPTY";
    return res.status(400).json(errorResponse);
  }

  if (err.code === "PRICE_MISMATCH") {
    errorResponse.code = "PRICE_MISMATCH";
    return res.status(409).json(errorResponse);
  }

  const statusCode = err.status || 500;
  res.status(statusCode).json(errorResponse);
}

module.exports = errorHandler;
