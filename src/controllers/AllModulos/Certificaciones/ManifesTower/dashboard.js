// controllers/ManifesTower/dashboardStats.js
const mongoose = require("mongoose");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");
const Vinculacion = require("../../../../models/ManifesTower/Vinculacion");

const dashboardStats = async (req, res) => {
    try {
        const { usuarioId, rolActivo } = req.query;
        if (!usuarioId) return res.status(400).json({ message: "usuarioId requerido" });

        let matchCond = {};
        if (rolActivo === "GENERADOR") {
            const user = await UserExternal.findById(usuarioId);
            if (user?.generadorId) {
                matchCond.generadorId = user.generadorId;
            } else {
                return res.json({ success: true, data: {} });
            }
        } else if (rolActivo === "TRANSPORTISTA") {
            const user = await UserExternal.findById(usuarioId);
            if (user?.transportistaId) {
                matchCond.transportistaId = user.transportistaId;
            } else {
                return res.json({ success: true, data: {} });
            }
        }

        // ------------------------------
        // 1. ESTADOS ACTUALES (Totales)
        // ------------------------------
        const statsEstado = await Manifiesto.aggregate([
            { $match: matchCond },
            { $group: { _id: "$estado", count: { $sum: 1 } } }
        ]);
        const total = statsEstado.reduce((acc, cur) => acc + cur.count, 0);

        // ------------------------------
        // 2. HISTORIAL DIARIO POR ESTADO (ÚLTIMOS 6 DÍAS)
        // ------------------------------
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sixDaysAgo = new Date(today);
        sixDaysAgo.setDate(sixDaysAgo.getDate() - 5); // 6 días incluyendo hoy

        const historialRaw = await Manifiesto.aggregate([
            {
                $match: {
                    ...matchCond,
                    createdAt: { $gte: sixDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        estado: "$estado",
                        dia: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.dia": 1 } }
        ]);

        // Inicializar estructura de historiales
        const estadosPosibles = ["APROBADO", "OBSERVADO", "RECHAZADO", "EN REVISION", "ENVIADO", "PENDIENTE", "BORRADOR"];
        const historiales = {};
        const fechas = [];

        // Generar lista de fechas de los últimos 6 días
        for (let i = 0; i < 6; i++) {
            const d = new Date(sixDaysAgo);
            d.setDate(d.getDate() + i);
            fechas.push(d.toISOString().split('T')[0]);
        }

        // Inicializar arreglos vacíos para cada estado
        estadosPosibles.forEach(est => {
            historiales[est] = new Array(6).fill(0);
        });

        // Llenar con datos reales
        historialRaw.forEach(item => {
            const estado = item._id.estado;
            const dia = item._id.dia;
            const idx = fechas.indexOf(dia);
            if (idx !== -1 && historiales[estado] !== undefined) {
                historiales[estado][idx] = item.count;
            }
        });

        // Calcular historial total (suma de todos los estados por día)
        const historialTotal = fechas.map((_, idx) => {
            let sum = 0;
            estadosPosibles.forEach(est => {
                sum += historiales[est]?.[idx] || 0;
            });
            return sum;
        });

        // ------------------------------
        // 3. TENDENCIAS (Variación vs día anterior)
        // ------------------------------
        const tendencias = {};
        estadosPosibles.forEach(est => {
            const data = historiales[est];
            if (data && data.length >= 2) {
                const hoy = data[data.length - 1];
                const ayer = data[data.length - 2];
                const diff = hoy - ayer;
                if (diff > 0) tendencias[est] = `+${diff} desde ayer`;
                else if (diff < 0) tendencias[est] = `${diff} desde ayer`;
                else tendencias[est] = "Sin cambios";
            } else {
                tendencias[est] = "Sin datos suficientes";
            }
        });

        // Tendencia especial para el total general
        if (historialTotal.length >= 2) {
            const diffTotal = historialTotal[historialTotal.length - 1] - historialTotal[historialTotal.length - 2];
            if (diffTotal > 0) tendencias.TOTAL = `+${diffTotal} desde ayer`;
            else if (diffTotal < 0) tendencias.TOTAL = `${diffTotal} desde ayer`;
            else tendencias.TOTAL = "Sin cambios";
        } else {
            tendencias.TOTAL = "Sin datos";
        }

        // ------------------------------
        // 4. EVOLUCIÓN MENSUAL (últimos 6 meses)
        // ------------------------------
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

        const meses = mensual.map(item => ({
            mes: new Date(item._id.year, item._id.month - 1).toLocaleString('es', { month: 'short' }),
            cantidad: item.count
        }));

        // ------------------------------
        // 5. ÚLTIMOS 5 MANIFIESTOS
        // ------------------------------
        const ultimos = await Manifiesto.find(matchCond)
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("generadorId", "razonSocial")
            .populate("transportistaId", "razonSocial")
            .lean();

        // ------------------------------
        // 6. VINCULACIONES (contadores)
        // ------------------------------
        let generadoresCount = 0, transportistasCount = 0;
        if (rolActivo === "GENERADOR") {
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

        // ------------------------------
        // RESPUESTA FINAL
        // ------------------------------
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
                })),
                // 🔥 NUEVOS CAMPOS PARA TENDENCIAS E HISTORIALES
                tendencias: tendencias,
                historiales: historiales,
                historialTotal: historialTotal,
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = dashboardStats;