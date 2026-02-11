export const errorHandler = (err, req, res, next) => {
  console.error("ERROR:", err);

  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";

  // basic response shape
  const payload = {
    message: isProd ? "Internal server error" : err.message || "Error",
  };

  if (!isProd) {
    payload.stack = err.stack;
    if (err.name) payload.name = err.name;
    if (err.errors) payload.errors = err.errors;
  }

  res.status(status).json(payload);
};
