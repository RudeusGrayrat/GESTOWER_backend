const Permisos = require("../../../../models/RecursosHumanos/Permisos");

const getPermisos = async (req, res) => {
    try {
        const { page = 0, limit = 10 } = req.query;

        const [data, total] = await Promise.all([
            Permisos.find()
                .populate("colaborador")
                .populate("creadoPor")
                .populate("aprobadoPor")
                .skip(page * limit)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 }),

            Permisos.countDocuments()
        ]);

        return res.status(200).json({
            data,
            total
        });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = getPermisos;