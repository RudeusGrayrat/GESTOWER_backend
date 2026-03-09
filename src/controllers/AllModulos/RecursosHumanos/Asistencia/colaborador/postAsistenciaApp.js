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
        inicioAlmuerzo,
        almuerzoSede,
        salida,
        salidaSede,
        observaciones,
    } = req.body;

    try {
        // Buscar colaborador por DNI
        const colaborador = await Employee.findOne({ documentNumber: dni });
        if (!colaborador) {
            return res.status(404).json({
                message: "Colaborador no encontrado con el DNI proporcionado"
            });
        }

        // Buscar asistencia del colaborador en la fecha específica
        const asistencia = await AsistenciaColaborador.findOne({
            colaborador: colaborador._id,
            fecha: fecha,
        });

        if (asistencia) {
            return res.status(404).json({
                message: "No se encontró registro de asistencia para este colaborador en la fecha indicada"
            });
        }

        const nombreCompleto = `${colaborador.name} ${colaborador.lastname}`;

        // Validaciones específicas para la app (no permitir modificar ciertos campos si ya existen)
        if (inicioAlmuerzo && asistencia.inicioAlmuerzo) {
            return res.status(400).json({
                message: `No se puede modificar el Inicio de Almuerzo de ${nombreCompleto} porque ya fue registrado`
            });
        }

        if (salida && asistencia.salida) {
            return res.status(400).json({
                message: `No se puede modificar la Salida de ${nombreCompleto} porque ya fue registrada`
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

        // Procesar salida
        if (salida) {
            let horasExtras = 0;
            const fechaValida = dayjs(fecha, "DD/MM/YYYY", true);
            if (!fechaValida.isValid()) {
                return res.status(400).json({ message: "Fecha inválida" });
            }

            const diaSemana = fechaValida.day();
            const horaLimiteSalida = diaSemana === 6
                ? dayjs("01:30 PM", "hh:mm A")
                : dayjs("06:00 PM", "hh:mm A");

            const horaSalida = dayjs(salida, "hh:mm A");
            if (horaSalida.isAfter(horaLimiteSalida)) {
                horasExtras = horaSalida.diff(horaLimiteSalida, "minute") + 30;
            }

            asistencia.salida = salida;
            asistencia.minExtras = horasExtras;
            if (salidaSede) asistencia.salidaSede = salidaSede;
        }

        // Actualizar otros campos si se proporcionan
        if (inicioAlmuerzo) {
            asistencia.inicioAlmuerzo = inicioAlmuerzo;
            if (almuerzoSede) asistencia.almuerzoSede = almuerzoSede;
        }

        if (observaciones) asistencia.observaciones = observaciones;

        await asistencia.save();

        return res.status(200).json({
            message: `Asistencia de ${nombreCompleto} actualizada correctamente`,
            colaborador: {
                nombre: colaborador.name,
                apellido: colaborador.lastname,
                dni: colaborador.documentNumber
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: "Error al actualizar asistencia desde la app",
            error: error.message
        });
    }
};

module.exports = postAsistenciaApp;