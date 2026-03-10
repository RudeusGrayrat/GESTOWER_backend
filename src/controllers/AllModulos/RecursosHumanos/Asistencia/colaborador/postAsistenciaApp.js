const Employee = require("../../../../../models/Employees/Employee");
const AsistenciaColaborador = require("../../../../../models/RecursosHumanos/AsistenciaColaborador");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);

const postAsistenciaApp = async (req, res) => {
    const {
        dni,
        fecha,
        ingreso,
        ingresoSede,
    } = req.body;

    try {
        // Buscar colaborador por DNI
        const colaborador = await Employee.findOne({ documentNumber: dni });
        if (!colaborador) {
            return res.status(404).json({
                message: "Colaborador no encontrado con el DNI proporcionado"
            });
        }

        const nombreCompleto = `${colaborador.name} ${colaborador.lastname}`;
        // Buscar asistencia del colaborador en la fecha específica
        const asistencia = await AsistenciaColaborador.findOne({
            colaborador: colaborador._id,
            fecha: fecha,
        });

        if (asistencia) {
            return res.status(404).json({
                message: `${nombreCompleto} ya marcó su ingreso de ${fecha}`,
            });
        }

        if (!ingreso) {
            return res.status(400).json({
                message: "El ingreso es obligatorio para registrar la asistencia"
            });
        }
        if (ingresoSede === undefined) {
            return res.status(400).json({
                message: "La sede de ingreso es obligatoria para registrar la asistencia"
            });
        }
        if (ingreso === null || ingreso.trim() === "") {
            return res.status(400).json({
                message: "El ingreso no puede estar vacío"
            });
        }
        // Procesar ingreso
        if (ingreso) {
            let minTarde = 0;
            let estado;
            const horaLimite = dayjs("08:00 AM", "hh:mm A");
            const horaIngreso = dayjs(ingreso, "hh:mm A");

            if (horaIngreso.isAfter(horaLimite)) {
                estado = "TARDANZA";
                minTarde = horaIngreso.diff(horaLimite, "minute");
            } else {
                estado = "PRESENTE";
            }

            asistencia.ingreso = ingreso;
            asistencia.minTarde = minTarde;
            asistencia.estado = estado;
            if (ingresoSede) asistencia.ingresoSede = ingresoSede;
        }

        await asistencia.save();

        return res.status(200).json({
            message: `Asistencia de ${nombreCompleto} registrada correctamente`,
            colaborador: {
                nombre: colaborador.name,
                apellido: colaborador.lastname,
                dni: colaborador.documentNumber
            }
        });

    } catch (error) {
        console.error("Error al registrar asistencia:", error);
        return res.status(500).json({
            message: error.message || "Error inesperado en el servidor.",
            error: error.message
        });
    }
};

module.exports = postAsistenciaApp;