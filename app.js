import "dotenv/config";
import express from "express";
import connectDB from "./config/db.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import apiRoutes from "./routes/apiRoutes.js";
import cors from "cors";
import passport from "passport";
import './config/passport.js';
import * as ErrorHandler from "./middleware/errorHandler.js";
import { userContext } from "./middleware/userAuth.js";
import { preventCache } from "./middleware/commonMiddleware.js";
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import morgan from 'morgan';
import { apiLimiter } from './middleware/rateLimiter.js';
const app = express();

connectDB();
const splitOrigins = (val, fallback = "") =>
  (val || fallback).split(",").map(u => u.trim()).filter(Boolean);

const getDomainVariants = (urlStr) => {
  if (!urlStr) return [];
  try {
    const url = new URL(urlStr);
    const origin = url.origin;
    const hostname = url.hostname;
    if (hostname.startsWith("www.")) {
      const nonWwwHost = hostname.slice(4);
      return [origin, `${url.protocol}//${nonWwwHost}${url.port ? ':' + url.port : ''}`];
    } else if (hostname !== "localhost" && !hostname.match(/^127\./)) {
      return [origin, `${url.protocol}//www.${hostname}${url.port ? ':' + url.port : ''}`];
    }
    return [origin];
  } catch (e) {
    return [urlStr];
  }
};

const rawOrigins = [
  ...splitOrigins(process.env.FRONTEND_URL, "http://localhost:5173"),
  ...splitOrigins(process.env.VENDOR_URL || process.env.ADMIN_URL, "http://localhost:5174"),
  ...splitOrigins(process.env.SUPERADMIN_URL, "http://localhost:5175"),
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:3000",
  "https://esparehub.shop",
  "https://www.esparehub.shop",
  "https://backendapi.esparehub.shop",
  "https://vendor.esparehub.shop",
  "https://admin.esparehub.shop",
  "https://superadmin.esparehub.shop",
  "https://mhsparehub.shop",
  "https://www.mhsparehub.shop",
  "https://vendor.mhsparehub.shop",
  "https://superadmin.mhsparehub.shop"
];

const allowedOriginsSet = new Set(rawOrigins.flatMap(getDomainVariants));

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOriginsSet.has(origin)) return true;
  try {
    const hostname = new URL(origin).hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    if (hostname.endsWith(".esparehub.shop") || hostname === "esparehub.shop") return true;
    if (hostname.endsWith(".mhsparehub.shop") || hostname === "mhsparehub.shop") return true;
  } catch (e) {
    // Ignore URL parse error
  }
  return false;
};

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true); // Allow non-browser requests
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true); // Allow all in development
    }
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    console.error("CORS Blocked Origin:", origin);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(morgan('combined'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(mongoSanitize());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "Welcome to MH-Spare API" });
});

app.use("/api", apiLimiter, apiRoutes);

app.use(preventCache);

app.use(passport.initialize());

//user routes
app.use("/user", userContext, userRoutes);
//admin routes
app.use("/admin", adminRoutes);
// Error Handling Middleware
app.use(ErrorHandler.notFound);
app.use(ErrorHandler.globalErrorHandler);

//PORT

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

