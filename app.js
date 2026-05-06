var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const cors = require("cors");
const http = require("http"); //1
const app = express();
require("dotenv").config(); //3

const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:8081", "http://localhost:8082", "http://localhost:19006"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

const transportRequestRoutes = require("./routes/transportRequest.routes"); //transport request routes
app.use("/api/transport-requests", transportRequestRoutes); //transport request routes

const authRoutes = require("./routes/auth.routes");

app.use("/api/auth", authRoutes);
const chatRoutes = require("./routes/chatRoutes");
app.use("/api/chat", chatRoutes);
const reviewRoutes = require("./routes/reviewRoutes");
app.use("/api/reviews", reviewRoutes);
const paymentRoutes = require("./routes/paymentRoutes");
app.use("/api/payments", paymentRoutes);

const adminRoutes = require("./routes/admin.routes");
app.use("/api/admin", adminRoutes);

const { connectToMongoDB } = require("./config/db");
var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users.routes");

app.use(logger("dev"));

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/index", indexRouter);
app.use("/users", usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.send("Server error");
});

//2
const server = http.createServer(app);
server.listen(process.env.PORT, () => {
  connectToMongoDB();
  console.log("Server is running on http://localhost:" + process.env.PORT);
});
