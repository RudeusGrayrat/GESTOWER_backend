// controllers/ManifesTower/dashboardStats.js
const mongoose = require("mongoose");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");
const Vinculacion = require("../../../../models/ManifesTower/Vinculacion");

const dashboardStats = async (req, res) => {
    try {
        const { usuarioId, rolActivo } = req.query; // enviados desde el frontend
        if (!usuarioId) return res.status(400).json({ message: "usuarioId requerido" });

        let matchCond = {};
        // Filtrar manifiestos según el rol del usuario
        if (rolActivo === "GENERADOR") {
            // Buscar el generador asociado al usuario
            const user = await UserExternal.findById(usuarioId);
            if (user?.generadorId) {
                matchCond.generadorId = user.generadorId;
            } else {
                // Si no tiene generador, devolver datos vacíos
                return res.json({ data: {} });
            }
        } else if (rolActivo === "TRANSPORTISTA") {
            const user = await UserExternal.findById(usuarioId);
            if (user?.transportistaId) {
                matchCond.transportistaId = user.transportistaId;
            } else {
                return res.json({ data: {} });
            }
        }

        // 1. Total y estados
        const statsEstado = await Manifiesto.aggregate([
            { $match: matchCond },
            { $group: { _id: "$estado", count: { $sum: 1 } } }
        ]);
        const total = statsEstado.reduce((acc, cur) => acc + cur.count, 0);

        // 2. Evolución mensual (últimos 6 meses)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const mensual = await Manifiesto.aggregate([
            { $match: { ...matchCond, createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        // Formatear para el front (ej: "Ene", "Feb", ...)
        const meses = mensual.map(item => ({
            mes: new Date(item._id.year, item._id.month - 1).toLocaleString('es', { month: 'short' }),
            cantidad: item.count
        }));

        // 3. Últimos 5 manifiestos
        const ultimos = await Manifiesto.find(matchCond)
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("generadorId", "razonSocial")
            .populate("transportistaId", "razonSocial")
            .lean();

        // 4. Número de generadores/transportistas vinculados (según rol)
        let generadoresCount = 0, transportistasCount = 0;
        if (rolActivo === "GENERADOR") {
            // Contar transportistas vinculados a este generador
            const user = await UserExternal.findById(usuarioId);
            if (user?.generadorId) {
                const vinculos = await Vinculacion.find({
                    generadorId: user.generadorId,
                    status: "ACEPTADA"
                });
                transportistasCount = vinculos.length;
            }
        } else if (rolActivo === "TRANSPORTISTA") {
            const user = await UserExternal.findById(usuarioId);
            if (user?.transportistaId) {
                const vinculos = await Vinculacion.find({
                    transportistaId: user.transportistaId,
                    status: "ACEPTADA"
                });
                generadoresCount = vinculos.length;
            }
        }

        // 5. Actividad reciente (puedes usar notificaciones o logs)
        // Por simplicidad, puedes generar mensajes de los últimos cambios de estado
        // o usar el sistema de notificaciones ya existente.
        // Aquí se puede omitir o construir con los últimos eventos de los manifiestos.

        res.json({
            success: true,
            data: {
                totalManifiestos: total,
                estados: statsEstado.reduce((acc, cur) => { acc[cur._id] = cur.count; return acc; }, {}),
                mensual: meses,
                generadores: generadoresCount,
                transportistas: transportistasCount,
                ultimos: ultimos.map(m => ({
                    id: m._id,
                    numero: m.numeroManifiesto,
                    generador: m.generadorId?.razonSocial || "N/A",
                    estado: m.estado,
                    fecha: m.createdAt,
                }))
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = dashboardStats;