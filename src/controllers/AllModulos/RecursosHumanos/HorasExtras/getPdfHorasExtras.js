const path = require("path");
const convertDocx = require("../../../../utils/convertDocx");
const convertToPdf = require("../../../../utils/convertToPdf");
const HorasExtras = require("../../../../models/RecursosHumanos/HorasExtras");

const generarPdfHE = async (req, res) => {
    try {
        const { id } = req.params;
        const rootPath = process.cwd();
        const templatePath = path.join(rootPath, "templates", "PLANTILLA_HORAS_EXTRAS.docx");
        if (!id) return res.status(400).json({ message: "El ID es obligatorio", type: "Advertencia" });
        const findHorasExtras = await HorasExtras.findById(id).populate("solicitante").populate("colaboradores.colaborador").populate("aprobadoPor").populate("rechazadoPor").populate("enviadoPor");
        if (!findHorasExtras) return res.status(404).json({ message: "Registro no encontrado", type: "Error" });
        const listColaboradores = findHorasExtras.colaboradores.map((colab) => {
            const colaboradorData = colab.colaborador || {};
            const nombre = colaboradorData.name && colaboradorData.lastname ? `${colaboradorData.lastname}, ${colaboradorData.name}` : "";
            return {
                nombre: nombre,
                cargo: colaboradorData?.charge || "",
                hora_inicio: colab?.horaInicio || "",
                hora_fin: colab?.horaFin || "",
                total_horas: `${colab?.horas || 0}h ${colab?.minutos || 0}m`,
            };
        });
        const check = (value) => value ? "X" : "";
        // 1. Lógica de negocio para el Logo
        const bSolicitante = findHorasExtras.solicitante?.business || "";
        // DEFINIMOS bUpper AQUÍ:
        const bUpper = bSolicitante.toUpperCase();

        let logoEmpresa = "/TOWER_LOGO.png"; // Default
        if (bUpper.includes("CORPEMSE")) {
            logoEmpresa = "/CORPEMSE_LOGO.png";
        } else if (bUpper.includes("LURIN")) {
            logoEmpresa = "/INVERSIONES_LURIN_LOGO.png";
        } else if (bUpper.includes("ECOLOGY")) {
            logoEmpresa = "/ECOLOGY_LOGO.png";
        } else if (bUpper.includes("LABORATORIO")) {
            logoEmpresa = "/LADIAMB_LOGO.png";
        }
        const pathLogo = path.join(rootPath, "templates", "images", logoEmpresa); const data = {
            logo_empresa: pathLogo,
            nombre_colaborador: findHorasExtras.solicitante ? `${findHorasExtras.solicitante.lastname}, ${findHorasExtras.solicitante.name}` : "",
            area_colaborador: findHorasExtras.solicitante?.area ? findHorasExtras.solicitante?.area : "",
            fecha_solicitud: findHorasExtras.fecha || "",
            retribucion_pago: check(findHorasExtras.retribucion === "PAGO"),
            retribucion_compensacion: check(findHorasExtras.retribucion === "COMPENSACION"),
            foma_compensacion: findHorasExtras.formaCompensacion || "",
            sustento_requerimiento: findHorasExtras.motivo || "",
            colaboradores: listColaboradores,
            // firma_solicitante: "",
            // firma_jefe_inmediato: "",
            // fecha_recepcion_rrhh: "",
        };
        // PASO 1: Llenar la plantilla
        const wordBuffer = await convertDocx(data, templatePath);

        // PASO 2: Convertir a PDF (Sin APIs externas, solo tu SO)
        const pdfBuffer = await convertToPdf(wordBuffer);

        // PASO 3: Enviar
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename=reporte.pdf',
        });
        res.send(pdfBuffer);

    } catch (error) {
        console.error("Error en generarPdfHE:", error);
        res.status(500).json({ message: error.message, type: "Error" });
    }
};

module.exports = generarPdfHE;