const Business = require("../../../../models/Business");
const escapeRegExp = require("../../../../utils/regex/regex");

const getBusinessPaginacion = async (req, res) => {
    try {
        const { page = 0, limit = 10, search = "" } = req.query;
        const query = {};
        if (search) {
            const safeSearch = escapeRegExp(search);
            const regex = new RegExp(safeSearch, "i");
            query.$or = [
                { razonSocial: regex },
                { domicilioFiscal: regex },
                { ruc: regex },
                { "representative.name": regex },
                { "representative.documentType": regex },
                { "representative.documentNumber": regex },
            ];
        }
        const [data, total] = await Promise.all([
            Business.find(query)
                .skip(page * limit)
                .limit(parseInt(limit)),
            Business.countDocuments(query)
        ]);
        return res.status(200).json({
            data,
            total,
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};

module.exports = getBusinessPaginacion;