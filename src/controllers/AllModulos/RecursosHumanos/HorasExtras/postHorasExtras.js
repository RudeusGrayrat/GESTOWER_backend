const dayjs = require("dayjs");
const AsistenciaColaborador = require("../../../../models/RecursosHumanos/AsistenciaColaborador");
const HorasExtras = require("../../../../models/RecursosHumanos/HorasExtras");

const postHorasExtras = async (req, res) => {
    try {
        const {
            solicitante,
            fecha,
            retribucion,
            formaCompensacion,
            motivo,
            estado,
            colaboradores,
            creadoPor,
        } = req.body;

        if (!solicitante)
            return res.status(400).json({
                message: "El solicitante es obligatorio",
                type: "Advertencia"
            });
        if (!fecha)
            return res.status(400).json({ message: "La fecha es obligatoria", type: "Advertencia" });
        if (!colaboradores || !Array.isArray(colaboradores) || colaboradores.length === 0) {
            return res.status(400).json({ message: "Colaboradores debe ser un arreglo", type: "Advertencia" });
        }
        const fechaToString = dayjs(fecha, "YYYY-MM-DD").format("DD/MM/YYYY");
        let colaboradoresSinAsistencia = [];
        for (let i = colaboradores.length - 1; i >= 0; i--) {
            const colaborador = colaboradores[i];
            const asistencia = await AsistenciaColaborador.findOne({ colaborador: colaborador.colaborador, fecha: fechaToString });
            if (asistencia) {
                colaborador.asistenciaId = asistencia._id;
            } else {
                colaboradores.splice(i, 1);
                colaboradoresSinAsistencia.push(colaborador);
            }
        }
        const newHorasExtras = new HorasExtras({
            solicitante,
            fecha,
            retribucion,
            formaCompensacion,
            motivo,
            colaboradores,
            creadoPor,
            estado
        });
        if (colaboradoresSinAsistencia.length === colaboradores.length) {
            return res.status(400).json({ message: "Ninguno de los colaboradores tuvo asistencia, no se pueden registrar las horas extras", type: "Advertencia" });
        }
        await newHorasExtras.save();

        if (colaboradoresSinAsistencia.length > 0) {
            return res.status(201).json({
                message: "Horas extras registradas, pero algunos colaboradores no tuvieron asistencia y fueron eliminados del registro",
                horasExtras: newHorasExtras,
                colaboradoresSinAsistencia,
                type: "Advertencia"
            });
        }
        if (colaboradoresSinAsistencia.length === 0) {
            return res.status(201).json({
                message: "Horas extras registradas correctamente",
                horasExtras: newHorasExtras,
                type: "Correcto"
            });
        }

    } catch (error) {
        return res.status(500).json({ message: error.message, type: "Error" });
    }
};

module.exports = postHorasExtras;