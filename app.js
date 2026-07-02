import "dotenv/config";
import express from "express";
import connectDB from "./config/db.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import apiRoutes from "./routes/apiRoutes.js";
import passport from "passport";
import cors from "cors";
import './config/passport.js';
import session from "express-session";
import * as ErrorHandler from "./middleware/errorHandler.js";
import { userContext } from "./middleware/userAuth.js";
import { preventCache, setLocals } from "./middleware/commonMiddleware.js";
const app = express();

connectDB();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.use("/api", apiRoutes);

app.use(preventCache);

//user session
const userSession = session({
  name: "user.id",
  secret: process.env.SESSION_SECRET || "user-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24
  }
});

//admin session
const adminSession = session({
  name: "admin.sid",
  secret: process.env.ADMIN_SECRET || "admin-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 12
  }
})

app.use(passport.initialize());

app.get("/", (req, res) => {
  res.redirect("/user");
});

//user session,passport,routes
app.use("/user", userSession, passport.session(), userContext, setLocals, userRoutes);
//admin session ,passport,routes
app.use("/admin", adminSession, passport.session(), setLocals, adminRoutes)

app.use(setLocals);

app.set("view engine", "ejs");
app.set("views", "./views");

// Error Handling Middleware
app.use(ErrorHandler.notFound);
app.use(ErrorHandler.globalErrorHandler);

//PORT

app.listen(3000, () => {
  console.log(`Server running on http://localhost:${3000}`);
});


