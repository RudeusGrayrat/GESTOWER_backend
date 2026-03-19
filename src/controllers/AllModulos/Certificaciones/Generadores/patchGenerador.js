const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");

const patchGenerador = async (req, res) => {
    try {
        const { generadorId } = req.params;
        const {
            razonSocial,
            ruc,
            correoElectronico,
            telefono,
            representanteLegal,
            dniRepresentante,
            plantas,
            responsablesTecnicos,
            estado
        } = req.body;
        if (!generadorId) {
            return res.status(400).json({
                message: "El ID del generador es requerido para actualizar",
                type: "Error"
            });
        }
        const findGenerador = await Generador.findById(generadorId);
        if (!findGenerador) {
            return res.status(404).json({
                message: "Generador no encontrado",
                type: "Error"
            });
        }
        if (razonSocial) findGenerador.razonSocial = razonSocial;
        if (ruc) findGenerador.ruc = ruc;
        if (correoElectronico) findGenerador.correoElectronico = correoElectronico;
        if (telefono) findGenerador.telefono = telefono;
        if (representanteLegal) findGenerador.representanteLegal = representanteLegal;
        if (dniRepresentante) findGenerador.dniRepresentante = dniRepresentante;
        if (plantas) findGenerador.plantas = plantas;
        if (responsablesTecnicos) findGenerador.responsablesTecnicos = responsablesTecnicos;
        if (estado) findGenerador.estado = estado;

        const updatedGenerador = await findGenerador.save();

        return res.status(200).json({
            message: "Generador actualizado exitosamente",
            data: updatedGenerador,
            type: "Correcto"
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Error al actualizar el generador",
            type: "Error"
        });
    }
};

module.exports = patchGenerador;