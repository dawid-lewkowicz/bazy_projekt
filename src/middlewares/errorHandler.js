// src/middlewares/errorHandler.js

function errorHandler(err, req, res, next) {
  console.error("Wykryto błąd:", err.message);

  const errorResponse = {
    error: err.message || "Nieznany błąd serwera",
    code: err.code || "INTERNAL_SERVER_ERROR",
    details: err.details || "Brak dodatkowych szczegółów",
  };

  if (err.code === "P2002") {
    errorResponse.error = "Naruszenie unikalności danych.";
    errorResponse.code = "DB_UNIQUE_CONSTRAINT";
    errorResponse.details = `Pole: ${err.meta?.target}`;
    return res.status(409).json(errorResponse);
  }

  if (err.message.includes("OVERSELL")) {
    errorResponse.code = "DOMAIN_OVERSELL";
    return res.status(409).json(errorResponse);
  }

  if (err.message.includes("Koszyk jest pusty")) {
    errorResponse.code = "CART_EMPTY";
    return res.status(400).json(errorResponse);
  }

  res.status(500).json(errorResponse);
}

module.exports = errorHandler;
