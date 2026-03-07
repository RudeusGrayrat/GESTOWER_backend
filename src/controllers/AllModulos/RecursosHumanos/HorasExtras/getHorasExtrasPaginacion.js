const HorasExtras = require("../../../../models/RecursosHumanos/HorasExtras");

const getHorasExtras = async (req, res) => {

    try {

        const { page = 0, limit = 10 } = req.query;

        const [data, total] = await Promise.all([

            HorasExtras.find()
                .populate("colaborador", "name lastname documentNumber")
                .populate("creadoPor", "name lastname")
                .populate("aprobadoPor", "name lastname")
                .skip(page * limit)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 }),
            HorasExtras.countDocuments()

        ]);

        return res.status(200).json({
            data,
            total,
        });

    } catch (error) {

        return res.status(500).json({ message: error.message, type: "Error" });

    }
};

module.exports = getHorasExtras;