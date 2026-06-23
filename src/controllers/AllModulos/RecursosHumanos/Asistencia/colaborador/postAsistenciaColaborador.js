const AsistenciaColaborador = require("../../../../../models/RecursosHumanos/AsistenciaColaborador");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);

const postAsistenciaGestower = async (req, res) => {
  const {
    colaborador,
    fecha,
    ingreso,
    ingresoSede,
    salida,
    salidaSede,
    inicioAlmuerzo,
    almuerzoSede,
    finAlmuerzo,
    finAlmuerzoSede,
    estado = "FALTA", // Valor por defecto del body o "FALTA"
    observaciones,
  } = req.body;

  try {
    console.log("Datos recibidos para POST:", req.body);

    // 1. Validaciones iniciales obligatorias
    if (!colaborador || !fecha) {
      return res.status(400).json({ message: "El colaborador y la fecha son obligatorios." });
    }

    const fechaValida = dayjs(fecha, "DD/MM/YYYY", true); // Asegúrate de usar el formato correcto de tu app
    if (!fechaValida.isValid()) {
      return res.status(400).json({ message: "El formato de fecha es inválido. Use DD/MM/YYYY." });
    }

    // 2. Evitar duplicados para el mismo día
    const existeAsistencia = await AsistenciaColaborador.findOne({ colaborador, fecha });
    if (existeAsistencia) {
      return res.status(400).json({ message: "Ya existe un registro de asistencia para este colaborador en la fecha indicada." });
    }

    // 3. Inicializar el objeto que guardaremos
    let nuevaAsistenciaData = {
      colaborador,
      fecha,
      estado,
      observaciones
    };

    // 4. Flujo según el Estado de la Asistencia
    const estadosAdministrativos = ["PERMISO", "VACACIONES", "FALTA"];

    if (estadosAdministrativos.includes(estado)) {
      // Si es permiso, vacaciones o falta, ignoramos horas y guardamos limpio
      // (Opcional: puedes guardar sedes si aplica, si no, se queda solo con lo básico)
    } else {
      // Flujo Normal: PRESENTE o TARDANZA (Requiere procesar tiempos)
      let minTarde = 0;
      let minExtras = 0;
      let estadoCalculado = estado;

      // --- Cálculo de Ingreso / Tardanza ---
      if (ingreso) {
        const horaLimite = dayjs("08:00 AM", "hh:mm A");
        const horaIngreso = dayjs(ingreso, "hh:mm A");

        if (horaIngreso.isAfter(horaLimite)) {
          estadoCalculado = "TARDANZA";
          minTarde = horaIngreso.diff(horaLimite, "minute");
        } else {
          estadoCalculado = "PRESENTE";
        }
      }

      // --- Cálculo de Salida / Horas Extra ---
      if (salida) {
        const diaSemana = fechaValida.day(); // 0 = Domingo, 6 = Sábado
        // Sábados sale a la 1:00 PM, L-V a las 05:30 PM
        const horaSalidaNormal = diaSemana === 6
          ? dayjs("01:00 PM", "hh:mm A")
          : dayjs("05:30 PM", "hh:mm A");

        const horaLimiteTolerancia = horaSalidaNormal.add(5, "minute");
        const horaSalida = dayjs(salida, "hh:mm A");

        if (horaSalida.isAfter(horaLimiteTolerancia)) {
          minExtras = horaSalida.diff(horaSalidaNormal, "minute");
        }
      }

      // Inyectar datos calculados y recibidos al payload de guardado
      nuevaAsistenciaData = {
        ...nuevaAsistenciaData,
        estado: estadoCalculado,
        ingreso,
        ingresoSede,
        salida,
        salidaSede,
        inicioAlmuerzo,
        almuerzoSede,
        finAlmuerzo,
        finAlmuerzoSede,
        minTarde,
        minExtras
      };
    }

    // 5. Guardar en la Base de Datos de manera limpia
    const nuevaAsistencia = new AsistenciaColaborador(nuevaAsistenciaData);
    await nuevaAsistencia.save();

    return res.status(201).json({
      message: "Asistencia registrada correctamente",
      data: nuevaAsistencia
    });

  } catch (error) {
    console.error("Error en postAsistenciaGestower:", error);
    return res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

module.exports = postAsistenciaGestower;