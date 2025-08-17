const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const db = require("./models");
const multer = require("multer");
// const routes = require("./routes/index");

dotenv.config();

const app = express();

const upload = multer();
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

// machine route
const machineRoute = require("./Routes/MachineRoutes.js");
app.use("/api/machine/", machineRoute);

// operation bulletin route
const operationBulletinRoute = require("./Routes/OperationBulletinRoutes.js");
app.use("/api/operationBulleting", operationBulletinRoute);

// lalyout routes
const layoutRoutes = require("./Routes/LayoutRoute.js");
app.use("/api/layout", layoutRoutes);

// workstation routes
const workstationRoutes = require("./Routes/Workstation.js");
app.use("/api/workstations", workstationRoutes);

// media routes
const mediaRoutes = require("./Routes/HandleMediaRoute.js");
app.use("/api/media", mediaRoutes);

// error handler
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log error details
  console.error({
    message: err.message,
    statusCode,
    stack: !isProduction ? err.stack : undefined,
    errors: err.errors,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Response structure
  const response = {
    success: false,
    message: err.message || 'Internal server error',
    ...(!isProduction && { stack: err.stack }) // Only include stack in development
  };

  // Add validation errors if they exist
  if (err.errors) {
    response.errors = err.errors;
    if (!err.message) {
      response.message = 'Validation failed';
    }
  }

  // Special handling for certain status codes
  switch (statusCode) {
    case 401:
      response.message = response.message || 'Unauthorized';
      break;
    case 403:
      response.message = response.message || 'Forbidden';
      break;
    case 404:
      response.message = response.message || 'Not found';
      break;
    case 422:
      response.message = response.message || 'Validation failed';
      break;
  }

  return res.status(statusCode).json(response);
});

db.sequelize.sync().then(() => {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
