// controllers/rh/asistencia/updateAsistenciaERP.js
const Employee = require("../../../../../models/Employees/Employee");
const AsistenciaColaborador = require("../../../../../models/RecursosHumanos/AsistenciaColaborador");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);

const updateAsistenciaERP = async (req, res) => {
  const {
    colaborador, // ID del colaborador
    fecha,
    ingreso,
    ingresoSede,
    salida,
    salidaSede,
    inicioAlmuerzo,
    almuerzoSede,
    finAlmuerzo,
    finAlmuerzoSede,
    estado,
    observaciones,
  } = req.body;

  try {
    // Buscar la asistencia y popular los datos del colaborador
    const asistencia = await AsistenciaColaborador.findOne({
      colaborador: colaborador,
      fecha: fecha,
    }).populate("colaborador", "name lastname documentNumber charge");

    if (!asistencia) {
      return res.status(404).json({
        message: "No se encontró registro de asistencia para este colaborador en la fecha indicada"
      });
    }

    const datosColaborador = {
      nombre: asistencia.colaborador.name,
      apellido: asistencia.colaborador.lastname,
      dni: asistencia.colaborador.documentNumber,
      cargo: asistencia.colaborador.charge
    };

    // Procesar ingreso
    if (ingreso) {
      let minTarde = 0;
      let nuevoEstado;
      const horaLimite = dayjs("08:00 AM", "hh:mm A");
      const horaIngreso = dayjs(ingreso, "hh:mm A");

      if (horaIngreso.isAfter(horaLimite)) {
        nuevoEstado = "TARDANZA";
        minTarde = horaIngreso.diff(horaLimite, "minute");
      } else {
        nuevoEstado = "PRESENTE";
      }

      asistencia.ingreso = ingreso;
      asistencia.minTarde = minTarde;
      asistencia.estado = nuevoEstado;
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

    // Actualizar otros campos
    if (inicioAlmuerzo) {
      asistencia.inicioAlmuerzo = inicioAlmuerzo;
      if (almuerzoSede) asistencia.almuerzoSede = almuerzoSede;
    }

    if (finAlmuerzo) {
      asistencia.finAlmuerzo = finAlmuerzo;
      if (finAlmuerzoSede) asistencia.finAlmuerzoSede = finAlmuerzoSede;
    }

    if (observaciones) asistencia.observaciones = observaciones;
    if (estado) asistencia.estado = estado;

    await asistencia.save();

    // Preparar respuesta con todos los datos del colaborador
    return res.status(200).json({
      message: `Asistencia de ${datosColaborador.nombre} ${datosColaborador.apellido} actualizada correctamente`,
      colaborador: datosColaborador,
      asistencia: {
        fecha: asistencia.fecha,
        ingreso: asistencia.ingreso,
        ingresoSede: asistencia.ingresoSede,
        salida: asistencia.salida,
        salidaSede: asistencia.salidaSede,
        inicioAlmuerzo: asistencia.inicioAlmuerzo,
        finAlmuerzo: asistencia.finAlmuerzo,
        minTarde: asistencia.minTarde,
        minExtras: asistencia.minExtras,
        estado: asistencia.estado,
        observaciones: asistencia.observaciones
      }
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error al actualizar asistencia desde el ERP",
      error: error.message
    });
  }
};

module.exports = updateAsistenciaERP;