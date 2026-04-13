const Employee = require("../../../../models/Employees/Employee");
const HorasExtras = require("../../../../models/RecursosHumanos/HorasExtras");
const escapeRegExp = require("../../../../utils/regex/regex");

const getHorasExtras = async (req, res) => {
    try {
        const { page = 0, limit = 10, search = "" } = req.query;
        const query = {};
        if (search) {
            const safeRegex = escapeRegExp(search);
            const regex = new RegExp(safeRegex, "i");
            const colaboradores = await Employee.find({
                $or: [
                    { name: regex },
                    { lastname: regex },
                    { documentNumber: regex },
                    { business: regex },
                    { charge: regex }
                ]
            }).select("_id");
            const colaboradoresIds = colaboradores.map(c => c._id);
            query.$or = [
                { solicitante: { $in: colaboradoresIds } },
                { motivo: regex },
                { fecha: regex },
                { retribucion: regex },
                { formaCompensacion: regex },
                { estado: regex },
                { "colaboradores.colaborador": { $in: colaboradoresIds } },
            ];
        }
        const [data, total] = await Promise.all([
            HorasExtras.find(query)
                .populate("solicitante", "name lastname charge documentNumber")
                .populate("colaboradores.asistenciaId")
                .populate("colaboradores.colaborador", "name lastname charge documentNumber")
                .skip(page * limit)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 }),
            HorasExtras.countDocuments(query)
        ]);

        return res.status(200).json({ data, total });

    } catch (error) {
        return res.status(500).json({ message: error.message, type: "Error" });
    }
};

module.exports = getHorasExtras;