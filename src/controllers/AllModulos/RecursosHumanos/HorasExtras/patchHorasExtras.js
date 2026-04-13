const dayjs = require("dayjs");
const HorasExtras = require("../../../../models/RecursosHumanos/HorasExtras");
const AsistenciaColaborador = require("../../../../models/RecursosHumanos/AsistenciaColaborador");

const patchHorasExtras = async (req, res) => {

    const {
        _id,
        solicitante,
        fecha,
        retribucion,
        formaCompensacion,
        motivo,
        colaboradores,
        estado,
        modificadoPor,
        aprobadoPor,
        rechazadoPor,
        enviadoPor
    } = req.body;

    try {
        if (!estado) return res.status(400).json({ message: "El estado es obligatorio", type: "Advertencia" });
        if (!_id) return res.status(400).json({ message: "El ID es obligatorio", type: "Advertencia" });
        if (estado === "APROBADO") {
            return res.status(400).json({ message: "Las horas extras ya aprobadas no se pueden modificar", type: "Advertencia" });
        }
        const horasExtras = await HorasExtras.findById(_id);

        if (!horasExtras) {
            return res.status(404).json({ message: "Registro no encontrado", type: "Error" });
        }
        //buscar con la fecha la asistenciaId y actualizarlo
        let totalColaboradores = 0
        let colaboradoresSinAsistencia = [];
        if (fecha && colaboradores) {
            totalColaboradores = colaboradores.length;
            const fechaToString = dayjs(fecha, "YYYY-MM-DD").format("DD/MM/YYYY");
            for (let i = colaboradores.length - 1; i >= 0; i--) {
                const colaborador = colaboradores[i];
                const asistencia = await AsistenciaColaborador.findOne({ colaborador: colaborador.colaborador, fecha: fechaToString });
                console.log("Asistencia encontrada:", asistencia);
                if (asistencia) {
                    colaborador.asistenciaId = asistencia._id;
                } else {
                    colaboradores.splice(i, 1);
                    colaboradoresSinAsistencia.push(colaborador);
                }
            }
        }
        if (fecha != horasExtras.fecha) horasExtras.fecha = fecha;
        if (solicitante) horasExtras.solicitante = solicitante;
        if (retribucion) horasExtras.retribucion = retribucion;
        if (formaCompensacion) horasExtras.formaCompensacion = formaCompensacion;
        if (motivo) horasExtras.motivo = motivo;
        if (colaboradores) horasExtras.colaboradores = colaboradores;
        if (estado) horasExtras.estado = estado;
        if (aprobadoPor) horasExtras.aprobadoPor = aprobadoPor;
        if (modificadoPor) horasExtras.modificadoPor = modificadoPor;
        if (rechazadoPor) horasExtras.rechazadoPor = rechazadoPor;
        if (enviadoPor) horasExtras.enviadoPor = enviadoPor;

        if (totalColaboradores > 0 && colaboradoresSinAsistencia?.length === totalColaboradores) {
            return res.status(400).json({
                message: "Ninguno de los colaboradores tuvo asistencia, no se pueden actualizar las horas extras",
                type: "Advertencia"
            });
        }

        await horasExtras.save();

        if (totalColaboradores > 0 && colaboradoresSinAsistencia?.length > 0) {
            return res.status(200).json({
                message: "Horas extras actualizadas, pero algunos colaboradores no tuvieron asistencia y fueron eliminados del registro",
                horasExtras,
                colaboradoresSinAsistencia,
                type: "Advertencia"
            });
        }

        // Este cubre tanto: colaboradores sin problemas, como cuando no se enviaron colaboradores
        return res.status(200).json({
            message: "Horas extras actualizadas correctamente",
            horasExtras,
            type: "Correcto"
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message, type: "Error" });
    }
};

module.exports = patchHorasExtras;