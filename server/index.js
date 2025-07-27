const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const db = require("./models");
// const routes = require("./routes/index");

dotenv.config();

const app = express();

// Middlewares
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// const csurf = require("csurf");
// Enable CSRF protection using cookies
// app.use(
//   csurf({
//     cookie: {
//       httpOnly: true,
//       sameSite: "strict", // adjust based on frontend/backend split
//       secure: process.env.NODE_ENV === "development",
//     },
//   })
// );

//! Routes
// expose CSRF token to fronted
app.get("/api/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// users routes
const userRoutes = require("./Routes/UserRoutes.js");
app.use("/api/user/", userRoutes);

// factory routes
const factoryRoutes = require("./Routes/FactoryRoutes.js");
app.use("/api/factories/", factoryRoutes);

// department routes
const departmentRoutes = require("./Routes/DepartmentRoutes.js");
app.use("/api/departments/", departmentRoutes);

// customer routes
const customerRoutes = require("./Routes/CustomerRoutes.js");
app.use("/api/customers/", customerRoutes);

// customer types route
const customerTypesRoute = require("./Routes/CustomerTypesRoutes.js");
app.use("/api/customerTypes/", customerTypesRoute);

// season route
const seasonRoutes = require("./Routes/SeasonRoutes.js");
app.use("/api/seasons/", seasonRoutes);

// style route
const styleRoute = require("./Routes/StylesRoutes.js");
app.use("/api/styles/", styleRoute);

// operation bulletin route
const operationBulletinRoute = require("./Routes/OperationBulletinRoutes.js");
app.use("/api/operationBulleting", operationBulletinRoute);

// lalyout routes
const layoutRoutes = require("./Routes/LayoutRoute.js");
app.use("/api/layout", layoutRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.status || 500;

  // Log full error in development
  if (process.env.NODE_ENV === "development") {
    console.error("Error:", {
      message: err.message,
      stack: err.stack,
      errors: err.errors,
    });
  }

  // Handle validation errors differently
  if (statusCode === 422 && err.errors) {
    return res.status(422).json({
      success: false,
      message: "Validation errors",
      errors: err.errors,
    });
  }

  // Handle general errors
  return res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

db.sequelize.sync().then(() => {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
