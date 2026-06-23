const Employee = require("../../../models/Employees/Employee");
const Notification = require("../../../models/Herramientas/Notification/Notificacion");
const UserExternal = require("../../../models/ManifesTower/UserExternal");

const getMyNotifications = async (req, res) => {
  try {
    const { _id, typeUser, search, date } = req.query;
    console.log(`🔍 Buscando notificaciones para usuario ${_id} de tipo ${typeUser} con search="${search}" y date="${date}"`);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!_id || !typeUser) {
      return res.status(400).json({ ok: false, message: "Faltan parámetros de identificación." });
    }

    let roleFilter = {};

    if (typeUser === "Employee") {
      const empleado = await Employee.findById(_id).select("modules");
      if (!empleado) return res.status(404).json({ ok: false, message: "Empleado no encontrado." });

      const susSubmodulos = (empleado.modules || [])
        .filter(m => m.submodule && m.submodule.name)
        .map(m => m.submodule.name.toUpperCase());

      roleFilter = {
        $or: [
          { type: "GLOBAL" },
          { type: "SUBMODULE", "submodule.name": { $in: susSubmodulos } },
          { type: "INDIVIDUAL", receiver: _id, receiverModel: "Employee" }
        ]
      };
    } else if (typeUser === "UserExternal") {
      const externo = await UserExternal.findById(_id).select("roles estado");
      console.log(`Usuario externo encontrado: ${externo ? "Sí" : "No"}`);
      console.log(`Roles del usuario externo: ${externo ? JSON.stringify(externo.roles) : "N/A"}`);
      console.log("el externo es: ", externo);
      if (!externo) return res.status(404).json({ ok: false, message: "Usuario externo no encontrado." });

      roleFilter = { type: "INDIVIDUAL", receiver: _id, receiverModel: "UserExternal" };
    } else {
      return res.status(400).json({ ok: false, message: "El typeUser provisto no es válido." });
    }

    let conditions = [roleFilter];

    if (search && search.trim() !== "") {
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
      conditions.push({
        $or: [
          { title: { $regex: sanitizedSearch, $options: "i" } },
          { message: { $regex: sanitizedSearch, $options: "i" } }
        ]
      });
    }

    if (date && date.trim() !== "") {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      conditions.push({ createdAt: { $gte: startOfDay, $lte: endOfDay } });
    }

    const filter = { $and: conditions };

    // 🔥 NUEVO: Filtro específico para contar ABSOLUTAMENTE todas las no leídas en la BD
    const unreadFilter = {
      $and: [
        roleFilter, // Solo las que le corresponden a su rol
        {
          $or: [
            { type: "INDIVIDUAL", isReadIndividual: false },
            { type: { $in: ["GLOBAL", "SUBMODULE"] }, "readBy.userId": { $ne: _id } }
          ]
        }
      ]
    };

    // Ejecutamos las 3 consultas en paralelo para no perder rendimiento
    const [notificaciones, totalNotificaciones, totalUnread] = await Promise.all([
      Notification.find(filter)
        .populate({ path: "creator", select: "name lastname", options: { strictPopulate: false } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments(unreadFilter) // El contador mágico real global
    ]);

    const totalPages = Math.ceil(totalNotificaciones / limit);

    return res.status(200).json({
      ok: true,
      notificaciones,
      totalUnread, // 👈 Enviado al Front
      pagination: {
        totalItems: totalNotificaciones,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages
      }
    });

  } catch (error) {
    console.error("Error crítico en getMyNotifications:", error);
    return res.status(500).json({ ok: false, message: "Error interno del servidor." });
  }
};

module.exports = getMyNotifications;