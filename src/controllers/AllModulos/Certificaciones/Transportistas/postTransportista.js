const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const Ubigeo = require("../../../../models/AllModulos/Certificacion/Ubigeo");
const { uploadImage, deleteImage, extractPublicId } = require("../../../../utils/cloudinary/images");

const cleanBase64 = (str) => str?.includes(",") ? str.split(",")[1] : str;

const postTransportista = async (req, res) => {
    const uploadedPublicIds = [];
    try {
        const {
            razonSocial, ruc, registroEors, autorizacionMunicipal, documentoRuta,
            direccion, ubigeoId, correoElectronico, telefono,
            responsableTecnico, representanteLegal, responsables,
            contingencias, generadores, conductores, estado
        } = req.body;

        if (!razonSocial || !ruc || !registroEors || !direccion || !ubigeoId || !correoElectronico || !telefono) {
            return res.status(400).json({ message: "Faltan datos requeridos", type: "Error" });
        }

        const findTransportista = await Transportista.findOne({ ruc });
        if (findTransportista) {
            return res.status(400).json({ message: "El transportista con este RUC ya existe", type: "Error" });
        }

        const findUbigeo = await Ubigeo.findById(ubigeoId);
        if (!findUbigeo) {
            return res.status(404).json({ message: "Ubigeo no encontrado", type: "Error" });
        }

        // ── Subir firmas de responsables ──
        const responsablesConFirma = await Promise.all(
            (responsables || []).map(async (responsable) => {
                if (!responsable.firmaResponsable) return responsable;

                const fileBuffer = Buffer.from(cleanBase64(responsable.firmaResponsable), "base64");
                const fileName = `firma_responsable_transportista_${responsable.dni}`;
                const result = await uploadImage(fileBuffer, fileName);

                uploadedPublicIds.push(extractPublicId(result.secure_url));
                return { ...responsable, firmaResponsable: result.secure_url };
            })
        );

        const newTransportista = new Transportista({
            razonSocial, ruc, registroEors, autorizacionMunicipal, documentoRuta,
            direccion, ubigeoId, correoElectronico, telefono,
            responsableTecnico: responsableTecnico || {},
            representanteLegal: representanteLegal || {},
            responsables: responsablesConFirma,
            contingencias: contingencias || {},
            generadores: generadores || [],
            conductores: conductores || [],
            estado: estado || "ACTIVO",
        });

        await newTransportista.save();
        return res.status(201).json({ message: "Transportista creado exitosamente", data: newTransportista, type: "Correcto" });

    } catch (error) {
        if (uploadedPublicIds.length > 0) {
            await Promise.allSettled(uploadedPublicIds.map((id) => deleteImage(id)));
        }
        return res.status(500).json({ message: error.message || "Error al crear el transportista", type: "Error" });
    }
};

module.exports = postTransportista;