const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const http = require("http");
const socketIo = require("socket.io");
const dotenv = require("dotenv");
dotenv.config();

const routes = require("./routes/index");
const verifyToken = require("./controllers/auth/midellware"); // Corrige si se escribe middleware

const { FRONTEND_URL, FRONTEND2_URL } = process.env;
const allowedOrigins = [
  FRONTEND_URL,
  FRONTEND2_URL,
  "http://localhost:5173",
];

const app = express();

// 1. Middlewares Base
app.use(fileUpload());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());

// 2. Control de CORS Limpio (Sin interferir con la autenticación)
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// 3. Rutas de la API
// NOTA: Si quieres proteger TODA la API desde aquí, descomenta la siguiente línea:
// app.use("/api", verifyToken, routes);
// Si manejas la protección de rutas dentro de '/routes/index.js', déjalo así:
app.use("/api", routes);

// 4. Servidor HTTP y Socket.IO
const httpServer = http.createServer(app);

const io = socketIo(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Compartir la instancia de IO con los controladores de Express
app.set("io", io);

// 5. Arquitectura de Salas de Socket.IO (Soporte ERP + ManifesTower)
io.on("connection", (socket) => {
  console.log(`🔌 Cliente conectado al WebSocket: ${socket.id}`);

  socket.on("register_session", (data) => {
    const { userId, userType, submodules, roles } = data; // 👈 Agregamos roles externos
    if (!userId) return;

    // 1. Canal Individual único (Funciona para ambos sistemas)
    socket.join(userId.toString());

    // 2. Canales para personal del ERP Interno
    if (userType === "Employee") {
      // socket.join("ERP_GLOBAL");

      if (Array.isArray(submodules)) {
        submodules.forEach((sub) => {
          const roomName = `SUBMODULE_${sub.toUpperCase()}`;
          socket.join(roomName);
          console.log(`👥 Empleado ${userId} unido a la sala: ${roomName}`);
        });
      }
    }

    // 3. Canales para Usuarios Externos de ManifesTower (Por Roles)
    else if (userType === "UserExternal") {
      if (Array.isArray(roles)) {
        roles.forEach((role) => {
          const roomName = `ROLE_${role.toUpperCase()}`; // Ej: ROLE_TRANSPORTISTA
          socket.join(roomName);
          console.log(`🚛 Usuario Externo ${userId} unido a la sala de Rol: ${roomName}`);
        });
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
  });
});


// Exportación del ecosistema integrado
module.exports = { app, httpServer };