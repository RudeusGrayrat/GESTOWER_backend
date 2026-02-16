const jwt = require("jsonwebtoken");
const Employee = require("../../models/Employees/Employee");
const { JWT_SECRET, MASTER_TOKEN } = process.env;
const publicRoutes = ["/api/login", "/api/recepcionBoleta"];

const tokenVerify = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token =
    req.cookies?.token ||
    (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

  if (publicRoutes.some((route) => req.path.startsWith(route))) {
    return next();
  }
  if (!token) {
    return res.status(401).json({ message: "No hay token" });
  }
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    try {
      decoded = jwt.verify(token, MASTER_TOKEN);
      if (decoded.role !== "superadmin") {
        return res.status(403).json({ message: "Token inválido" });
      }
    } catch (err) {
      return res.status(403).json({ message: "Token no válido o expirado" });
    }
  }

  if (decoded.role === "superadmin") {
    req.user = { role: "superadmin" };
    return next();
  }
  try {
    const userFound = await Employee.findOne({ email: decoded.email });
    if (!userFound) {
      return res.status(401).json({ message: "No se encuentra este usuario" });
    }
    req.user = userFound.toObject();
    delete req.user.password;
    next();
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error interno en la verificación del usuario" });
  }
};

module.exports = tokenVerify;
