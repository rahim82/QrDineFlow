import crypto from "node:crypto";
import http from "node:http";
import bcrypt from "bcryptjs";
import cookie from "cookie";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import QRCode from "qrcode";
import { Server as SocketIOServer } from "socket.io";
import { connectToDatabase } from "../db.js";
import { deleteImageFromCloudinary, hasCloudinaryConfig, uploadImageToCloudinary } from "../cloudinary.js";
import {
  createOrderWithPayment,
  getAdminDashboardData,
  getAnalyticsSummary,
  getManagerDashboardDataByRestaurantId,
  getMenuByRestaurantSlug,
  getRestaurantBySlug,
  getTableByRestaurantAndNumber
} from "../data.js";
import { env, validateEnv } from "../env.js";
import { createBillPdf } from "../pdf.js";
import { toMenuItemView } from "../pricing.js";
import { slugify } from "../slugify.js";
import { adminCreateManagerSchema, loginSchema, managerRegisterSchema } from "../validations/auth.js";
import { menuItemSchema } from "../validations/menu.js";
import { orderSchema } from "../validations/order.js";
import { restaurantCreateSchema, restaurantUpdateSchema } from "../validations/restaurant.js";
import { MenuItem } from "../models/MenuItem.js";
import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { Restaurant } from "../models/Restaurant.js";
import { ServedOrder } from "../models/ServedOrder.js";
import { Table } from "../models/Table.js";
import { User } from "../models/User.js";

validateEnv();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true
  }
});
const upload = multer({ storage: multer.memoryStorage() });
const sessionMaxAgeMs = 1000 * 60 * 60 * 24 * 7;
const oauthStateMaxAgeMs = 1000 * 60 * 10;

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = origin.toLowerCase();
  const exactOrigins = [env.appUrl, env.backendUrl, "http://localhost:3000", "http://localhost:3001"]
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  if (exactOrigins.includes(normalizedOrigin)) {
    return true;
  }

  return normalizedOrigin.endsWith(".vercel.app");
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

io.on("connection", (socket) => {
  socket.on("join:restaurant", (restaurantId) => {
    if (restaurantId) {
      socket.join(`restaurant:${restaurantId}`);
    }
  });

  socket.on("join:table", (payload) => {
    if (!payload?.restaurantId || !payload?.tableNumber) {
      return;
    }
    socket.join(`table:${payload.restaurantId}:${payload.tableNumber}`);
  });
});

function getCookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge
  };
}

function createSessionPayload(user) {
  return {
    id: String(user._id),
    role: user.role,
    restaurantId: user.restaurantId ? String(user.restaurantId) : undefined,
    name: user.name,
    email: user.email
  };
}

function signSession(user) {
  return jwt.sign(createSessionPayload(user), env.jwtSecret, { expiresIn: "7d" });
}

function getSession(req) {
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.qr_session;
  if (!token) {
    return null;
  }
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    return null;
  }
}

function setSessionCookie(res, user) {
  res.cookie("qr_session", signSession(user), getCookieOptions(sessionMaxAgeMs));
}

function clearSessionCookie(res) {
  res.clearCookie("qr_session", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
}

function getGoogleState(req) {
  const cookies = cookie.parse(req.headers.cookie || "");
  return cookies.google_oauth_state || "";
}

function setGoogleState(res, state) {
  res.cookie("google_oauth_state", state, getCookieOptions(oauthStateMaxAgeMs));
}

function clearGoogleState(res) {
  res.clearCookie("google_oauth_state", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
}

function sendSessionUser(res, user) {
  setSessionCookie(res, user);
  res.json({
    user: {
      id: String(user._id),
      role: user.role,
      name: user.name,
      email: user.email
    }
  });
}

function requireRole(role) {
  return (req, res, next) => {
    const session = getSession(req);
    if (!session || session.role !== role) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.session = session;
    next();
  };
}

function requireManagerOrAdmin(req, res, next) {
  const session = getSession(req);
  if (!session || (session.role !== "manager" && session.role !== "admin")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.session = session;
  next();
}

function canAccessRestaurant(session, restaurantId) {
  return session.role === "admin" || String(session.restaurantId || "") === String(restaurantId || "");
}

function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

async function exchangeCodeForProfile(code) {
  const redirectUri = `${env.appUrl}/api/auth/google/callback`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) {
    throw new Error("Google token exchange failed");
  }

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`
    }
  });
  const profile = await profileResponse.json();
  if (!profileResponse.ok || !profile.email) {
    throw new Error("Google profile fetch failed");
  }
  return profile;
}

async function createStarterWorkspace(profile) {
  const displayName = profile.name?.trim() || profile.email.split("@")[0];
  const baseRestaurantName = `${displayName.split(" ")[0]}'s Restaurant`;
  const baseSlug = slugify(baseRestaurantName);
  const duplicateCount = await Restaurant.countDocuments({ slug: new RegExp(`^${baseSlug}`) });
  const slug = duplicateCount ? `${baseSlug}-${duplicateCount + 1}` : baseSlug;

  const restaurant = await Restaurant.create({
    name: baseRestaurantName,
    slug,
    tagline: "Set up your tables and menu to start taking QR orders.",
    gstRate: 0
  });

  const user = await User.create({
    name: displayName,
    email: profile.email,
    role: "manager",
    restaurantId: restaurant._id
  });

  restaurant.managerIds = [user._id];
  await restaurant.save();
  return user;
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/auth/google", (_req, res) => {
  if (!env.googleClientId || !env.googleClientSecret) {
    res.status(500).json({ error: "Google login is not configured" });
    return;
  }
  const state = crypto.randomBytes(24).toString("hex");
  const redirectUri = `${env.appUrl}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    state
  });
  setGoogleState(res, state);
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

app.get("/api/auth/google/callback", asyncRoute(async (req, res) => {
  if (!env.googleClientId || !env.googleClientSecret) {
    res.redirect(`${env.appUrl}/login?error=google_not_configured`);
    return;
  }

  const { code, state, error } = req.query;
  const storedState = getGoogleState(req);

  if (error) {
    res.redirect(`${env.appUrl}/login?error=${encodeURIComponent(String(error))}`);
    return;
  }

  if (!code || !state || !storedState || String(state) !== storedState) {
    res.redirect(`${env.appUrl}/login?error=google_state_invalid`);
    return;
  }

  const profile = await exchangeCodeForProfile(String(code));
  await connectToDatabase();

  let user = await User.findOne({ email: profile.email });
  if (!user) {
    user = await createStarterWorkspace(profile);
  }

  clearGoogleState(res);
  setSessionCookie(res, user);
  res.redirect(`${env.appUrl}${user.role === "admin" ? "/admin/dashboard" : "/manager/dashboard"}`);
}));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  await connectToDatabase();
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid login payload" });
    return;
  }

  const user = await User.findOne({ email: result.data.email }).lean();
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (!user.passwordHash) {
    res.status(401).json({ error: "Use Google login for this account" });
    return;
  }

  const isValid = await bcrypt.compare(result.data.password, user.passwordHash);
  if (!isValid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  sendSessionUser(res, user);
}));

app.post("/api/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.post("/api/auth/register-manager", asyncRoute(async (req, res) => {
  await connectToDatabase();
  const parsed = managerRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existingUser = await User.findOne({ email: parsed.data.email }).lean();
  if (existingUser) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const baseSlug = slugify(parsed.data.restaurantName);
  const duplicateCount = await Restaurant.countDocuments({ slug: new RegExp(`^${baseSlug}`) });
  const slug = duplicateCount ? `${baseSlug}-${duplicateCount + 1}` : baseSlug;

  const restaurant = await Restaurant.create({
    name: parsed.data.restaurantName,
    slug,
    tagline: parsed.data.tagline,
    gstRate: 0
  });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await User.create({
    name: parsed.data.managerName,
    email: parsed.data.email,
    passwordHash,
    role: "manager",
    restaurantId: restaurant._id
  });

  restaurant.managerIds = [user._id];
  await restaurant.save();

  setSessionCookie(res, user);
  res.status(201).json({
    user: {
      id: String(user._id),
      role: "manager",
      name: user.name,
      email: user.email
    },
    restaurant: {
      id: String(restaurant._id),
      slug: restaurant.slug,
      name: restaurant.name
    }
  });
}));

app.get("/api/admin/dashboard", requireRole("admin"), asyncRoute(async (_req, res) => {
  const data = await getAdminDashboardData();
  res.json(data);
}));

app.get("/api/manager/dashboard", requireManagerOrAdmin, asyncRoute(async (req, res) => {
  const restaurantId = req.session.role === "admin"
    ? String(req.query.restaurantId || "")
    : String(req.session.restaurantId || "");

  if (!restaurantId) {
    res.status(400).json({ error: "Restaurant not resolved" });
    return;
  }

  if (!canAccessRestaurant(req.session, restaurantId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const data = await getManagerDashboardDataByRestaurantId(restaurantId);
  if (!data) {
    res.status(404).json({ error: "Restaurant data could not be found" });
    return;
  }
  res.json(data);
}));

app.post("/api/admin/managers", requireRole("admin"), asyncRoute(async (req, res) => {
  await connectToDatabase();
  const parsed = adminCreateManagerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const restaurant = await Restaurant.findById(parsed.data.restaurantId);
  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  const existingUser = await User.findOne({ email: parsed.data.email }).lean();
  if (existingUser) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const manager = await User.create({
    name: parsed.data.managerName,
    email: parsed.data.email,
    passwordHash,
    role: "manager",
    restaurantId: restaurant._id
  });

  restaurant.managerIds = [
    ...new Set([...(restaurant.managerIds || []).map((id) => String(id)), String(manager._id)])
  ];
  await restaurant.save();

  res.status(201).json({
    manager: {
      _id: String(manager._id),
      name: manager.name,
      email: manager.email,
      role: manager.role,
      restaurantId: String(restaurant._id)
    }
  });
}));

app.get("/api/restaurants", requireRole("admin"), asyncRoute(async (_req, res) => {
  await connectToDatabase();
  const restaurants = await Restaurant.find({}).sort({ createdAt: -1 }).lean();
  res.json({ restaurants });
}));

app.post("/api/restaurants", requireRole("admin"), asyncRoute(async (req, res) => {
  await connectToDatabase();
  const parsed = restaurantCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const baseSlug = slugify(parsed.data.name);
  const duplicateCount = await Restaurant.countDocuments({ slug: new RegExp(`^${baseSlug}`) });
  const slug = duplicateCount ? `${baseSlug}-${duplicateCount + 1}` : baseSlug;

  const restaurant = await Restaurant.create({
    name: parsed.data.name,
    slug,
    tagline: parsed.data.tagline,
    gstRate: 0
  });

  res.status(201).json({ restaurant });
}));

app.patch("/api/restaurants/:id", requireRole("admin"), asyncRoute(async (req, res) => {
  await connectToDatabase();
  const parsed = restaurantUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = await Restaurant.findById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  if (existing.name !== parsed.data.name) {
    const baseSlug = slugify(parsed.data.name);
    const duplicateCount = await Restaurant.countDocuments({
      _id: { $ne: req.params.id },
      slug: new RegExp(`^${baseSlug}`)
    });
    existing.slug = duplicateCount ? `${baseSlug}-${duplicateCount + 1}` : baseSlug;
  }

  existing.name = parsed.data.name;
  existing.tagline = parsed.data.tagline;
  existing.gstRate = 0;
  await existing.save();

  res.json({ restaurant: existing });
}));

app.delete("/api/restaurants/:id", requireRole("admin"), asyncRoute(async (req, res) => {
  await connectToDatabase();
  const restaurant = await Restaurant.findById(req.params.id).lean();
  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  await Promise.all([
    MenuItem.deleteMany({ restaurantId: req.params.id }),
    Table.deleteMany({ restaurantId: req.params.id }),
    Order.deleteMany({ restaurantId: req.params.id }),
    ServedOrder.deleteMany({ restaurantId: req.params.id }),
    Payment.deleteMany({ restaurantId: req.params.id }),
    User.deleteMany({ restaurantId: req.params.id, role: "manager" }),
    Restaurant.findByIdAndDelete(req.params.id)
  ]);

  res.json({ ok: true });
}));

app.get("/api/menu", asyncRoute(async (req, res) => {
  await connectToDatabase();
  const restaurantId = String(req.query.restaurantId || "");
  const hideUnavailable = req.query.hideUnavailable === "true";
  const query = restaurantId ? { restaurantId } : {};
  const items = await MenuItem.find(query).sort({ category: 1, name: 1 }).lean();
  const mapped = items.map(toMenuItemView);
  res.json({
    items: hideUnavailable ? mapped.filter((item) => item.isAvailable) : mapped
  });
}));

app.post("/api/menu", requireManagerOrAdmin, asyncRoute(async (req, res) => {
  await connectToDatabase();
  const parsed = menuItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  if (!canAccessRestaurant(req.session, parsed.data.restaurantId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const created = await MenuItem.create(parsed.data);
  res.status(201).json({ item: toMenuItemView(created.toObject()) });
}));

app.patch("/api/menu/:id", requireManagerOrAdmin, asyncRoute(async (req, res) => {
  await connectToDatabase();
  const parsed = menuItemSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = await MenuItem.findById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }

  if (!canAccessRestaurant(req.session, existing.restaurantId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const previousImagePublicId = existing.imagePublicId;
  const nextImagePublicId = Object.prototype.hasOwnProperty.call(parsed.data, "imagePublicId")
    ? parsed.data.imagePublicId
    : existing.imagePublicId;
  const shouldDeleteExistingImage = Boolean(
    previousImagePublicId &&
    (nextImagePublicId !== previousImagePublicId || (parsed.data.image && parsed.data.image !== existing.image))
  );

  Object.assign(existing, parsed.data);
  await existing.save();

  if (shouldDeleteExistingImage) {
    await deleteImageFromCloudinary(previousImagePublicId);
  }

  res.json({ item: toMenuItemView(existing.toObject()) });
}));

app.delete("/api/menu/:id", requireManagerOrAdmin, asyncRoute(async (req, res) => {
  await connectToDatabase();
  const deleted = await MenuItem.findById(req.params.id).lean();
  if (!deleted) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }

  if (!canAccessRestaurant(req.session, deleted.restaurantId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await MenuItem.findByIdAndDelete(req.params.id);
  if (deleted.imagePublicId) {
    await deleteImageFromCloudinary(deleted.imagePublicId);
  }
  res.json({ ok: true });
}));

app.get("/api/tables", requireManagerOrAdmin, asyncRoute(async (req, res) => {
  await connectToDatabase();
  const restaurantId = String(req.query.restaurantId || "");
  if (!restaurantId) {
    res.status(400).json({ error: "restaurantId is required" });
    return;
  }

  if (!canAccessRestaurant(req.session, restaurantId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const tables = await Table.find({ restaurantId }).sort({ tableNumber: 1 }).lean();
  res.json({ tables });
}));

app.post("/api/tables", requireManagerOrAdmin, asyncRoute(async (req, res) => {
  await connectToDatabase();
  const restaurant = await Restaurant.findById(req.body.restaurantId).lean();
  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  if (!canAccessRestaurant(req.session, restaurant._id)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const qrCodeUrl = `${env.appUrl}/menu/${restaurant.slug}/${req.body.tableNumber}`;
  const existing = await Table.findOne({
    restaurantId: req.body.restaurantId,
    tableNumber: req.body.tableNumber
  }).lean();
  if (existing) {
    res.status(409).json({ error: "Table already exists" });
    return;
  }

  const table = await Table.create({
    restaurantId: req.body.restaurantId,
    tableNumber: req.body.tableNumber,
    seats: req.body.seats || 4,
    qrCodeUrl
  });

  res.status(201).json({ table });
}));

app.patch("/api/tables/:id", requireManagerOrAdmin, asyncRoute(async (req, res) => {
  await connectToDatabase();
  const table = await Table.findById(req.params.id).lean();
  if (!table) {
    res.status(404).json({ error: "Table not found" });
    return;
  }

  if (!canAccessRestaurant(req.session, table.restaurantId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const restaurant = await Restaurant.findById(table.restaurantId).lean();
  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  const nextTableNumber = Number(req.body.tableNumber ?? table.tableNumber);
  const nextSeats = Number(req.body.seats ?? table.seats);
  const duplicate = await Table.findOne({
    restaurantId: table.restaurantId,
    tableNumber: nextTableNumber,
    _id: { $ne: req.params.id }
  }).lean();
  if (duplicate) {
    res.status(409).json({ error: "Table number already exists" });
    return;
  }

  const updated = await Table.findByIdAndUpdate(
    req.params.id,
    {
      tableNumber: nextTableNumber,
      seats: nextSeats,
      qrCodeUrl: `${env.appUrl}/menu/${restaurant.slug}/${nextTableNumber}`
    },
    { new: true }
  ).lean();

  res.json({ table: updated });
}));

app.delete("/api/tables/:id", requireManagerOrAdmin, asyncRoute(async (req, res) => {
  await connectToDatabase();
  const deleted = await Table.findById(req.params.id).lean();
  if (!deleted) {
    res.status(404).json({ error: "Table not found" });
    return;
  }

  if (!canAccessRestaurant(req.session, deleted.restaurantId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await Table.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

app.get("/api/tables/qr", asyncRoute(async (req, res) => {
  const restaurantSlug = String(req.query.restaurantSlug || "");
  const tableNumber = String(req.query.tableNumber || "");
  if (!restaurantSlug || !tableNumber) {
    res.status(400).json({ error: "restaurantSlug and tableNumber are required" });
    return;
  }

  const qrUrl = `${env.appUrl}/menu/${restaurantSlug}/${tableNumber}`;
  const dataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 300 });
  res.json({ qrUrl, dataUrl });
}));

app.get("/api/public/menu/:slug/:tableNumber", asyncRoute(async (req, res) => {
  const { slug, tableNumber } = req.params;
  const { restaurant, menu } = await getMenuByRestaurantSlug(slug);
  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  const table = await getTableByRestaurantAndNumber(String(restaurant._id), Number(tableNumber));
  if (!table) {
    res.status(404).json({ error: "Table not found" });
    return;
  }

  res.json({ restaurant, table, menu });
}));

app.get("/api/analytics/summary", asyncRoute(async (req, res) => {
  const restaurantId = String(req.query.restaurantId || "");
  const slug = String(req.query.slug || "");
  if (!restaurantId && !slug) {
    res.status(400).json({ error: "restaurantId or slug is required" });
    return;
  }

  let resolvedRestaurantId = restaurantId;
  if (!resolvedRestaurantId && slug) {
    const restaurant = await getRestaurantBySlug(slug);
    resolvedRestaurantId = restaurant?._id ? String(restaurant._id) : "";
  }

  if (!resolvedRestaurantId) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  const summary = await getAnalyticsSummary(resolvedRestaurantId);
  res.json({ summary });
}));

app.get("/api/orders", requireManagerOrAdmin, asyncRoute(async (req, res) => {
  await connectToDatabase();
  const restaurantId = String(req.query.restaurantId || "");
  const status = String(req.query.status || "");
  const query = {};
  if (restaurantId) {
    if (!canAccessRestaurant(req.session, restaurantId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    query.restaurantId = restaurantId;
  }
  if (status) {
    query.status = status;
  }
  const orders = await Order.find(query).sort({ createdAt: -1 }).lean();
  res.json({ orders });
}));

app.post("/api/orders", asyncRoute(async (req, res) => {
  await connectToDatabase();
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const restaurant = await Restaurant.findById(parsed.data.restaurantId).lean();
  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  const result = await createOrderWithPayment({
    ...parsed.data,
    gstRate: 0
  });

  io.to(`restaurant:${parsed.data.restaurantId}`).emit("order:new", {
    orderId: String(result.order._id),
    tableNumber: parsed.data.tableNumber,
    customerName: parsed.data.customerName,
    totalAmount: result.bill.total
  });
  io.to(`table:${parsed.data.restaurantId}:${parsed.data.tableNumber}`).emit("order:status", {
    orderId: String(result.order._id),
    status: result.order.status
  });

  res.status(201).json({
    order: result.order,
    payment: result.payment,
    bill: result.bill
  });
}));

app.patch("/api/orders/:id", requireManagerOrAdmin, asyncRoute(async (req, res) => {
  await connectToDatabase();
  const existingOrder = await Order.findById(req.params.id).lean();
  if (!existingOrder) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (!canAccessRestaurant(req.session, existingOrder.restaurantId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (req.body.status === "served") {
    await ServedOrder.create({
      originalOrderId: existingOrder._id,
      restaurantId: existingOrder.restaurantId,
      tableId: existingOrder.tableId,
      tableNumber: existingOrder.tableNumber,
      customerName: existingOrder.customerName,
      status: "served",
      items: existingOrder.items,
      subtotal: existingOrder.subtotal,
      gstRate: existingOrder.gstRate,
      gstAmount: existingOrder.gstAmount,
      totalAmount: existingOrder.totalAmount,
      splitParticipants: existingOrder.splitParticipants,
      paymentMethod: existingOrder.paymentMethod,
      createdAt: existingOrder.createdAt,
      updatedAt: existingOrder.updatedAt,
      servedAt: new Date()
    });

    await Table.findByIdAndUpdate(existingOrder.tableId, {
      isOccupied: false,
      activeOrderId: null
    });
    await Order.findByIdAndDelete(req.params.id);

    io.to(`restaurant:${String(existingOrder.restaurantId)}`).emit("order:updated", {
      orderId: String(existingOrder._id),
      status: "served",
      tableNumber: existingOrder.tableNumber,
      removed: true
    });
    io.to(`table:${String(existingOrder.restaurantId)}:${existingOrder.tableNumber}`).emit("order:status", {
      orderId: String(existingOrder._id),
      status: "served"
    });

    res.json({
      removed: true,
      freedTableId: String(existingOrder.tableId)
    });
    return;
  }

  const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).lean();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  io.to(`restaurant:${String(order.restaurantId)}`).emit("order:updated", {
    orderId: String(order._id),
    status: order.status,
    tableNumber: order.tableNumber
  });
  io.to(`table:${String(order.restaurantId)}:${order.tableNumber}`).emit("order:status", {
    orderId: String(order._id),
    status: order.status
  });

  res.json({ order });
}));

app.get("/api/orders/:id/bill", asyncRoute(async (req, res) => {
  await connectToDatabase();
  const order = await Order.findById(req.params.id).lean();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const restaurant = await Restaurant.findById(order.restaurantId).lean();
  const pdf = await createBillPdf({
    orderId: String(order._id),
    restaurantName: restaurant?.name || "Restaurant",
    tableNumber: order.tableNumber,
    customerName: order.customerName,
    createdAt: String(order.createdAt),
    lines: order.items,
    subtotal: order.subtotal,
    totalAmount: order.totalAmount
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="bill-${req.params.id}.pdf"`);
  res.status(200).send(pdf);
}));

app.post("/api/uploads/menu-image", requireManagerOrAdmin, upload.single("file"), asyncRoute(async (req, res) => {
  if (!hasCloudinaryConfig()) {
    res.status(500).json({ error: "Cloudinary is not configured" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "Image file is required" });
    return;
  }

  if (!req.file.mimetype.startsWith("image/")) {
    res.status(400).json({ error: "Only image uploads are allowed" });
    return;
  }

  const file = new File([req.file.buffer], req.file.originalname, { type: req.file.mimetype });
  const uploadResult = await uploadImageToCloudinary(file);
  res.status(201).json({
    imageUrl: uploadResult.secureUrl,
    publicId: uploadResult.publicId
  });
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    error: error?.message || "Internal server error"
  });
});

const port = Number(process.env.PORT || 4000);

connectToDatabase()
  .then(() => {
    server.listen(port, "0.0.0.0", () => {
      console.log(`Backend ready on http://0.0.0.0:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1);
  });
