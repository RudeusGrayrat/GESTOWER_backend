const crypto = require("crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Solicitud = require("../../../../models/ManifesTower/SolicitudGenerador");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const Vinculacion = require("../../../../models/ManifesTower/Vinculacion");
const Ubigeo = require("../../../../models/AllModulos/Certificacion/Ubigeo");
const NotificationService = require("../../../Herramientas/Notification/CreateNotification");
const snapshotFirma = require("../../../../utils/manifiestoFirmaSnapshot");

const hashToken = (value) => crypto.createHash("sha256").update(value).digest("hex");
const texto = (value, max = 200) => typeof value === "string" ? value.trim().slice(0, max) : "";
const emailValido = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
// Mismo coste que las contraseñas provisionales, también cuando el RUC no existe.
const passwordFicticio = "$2b$12$tjN7w5hrJOLROvhJci793OOsWgZA9TZG3auALsIrikb67gV/adS36";

const autenticarTransportista = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
        const payload = token && jwt.verify(token, process.env.JWT_SECRET);
        if (!payload || payload.role !== "EXTERNAL" || payload.activeRole !== "TRANSPORTISTA") return res.status(401).json({ message: "Inicia sesión como transportista." });
        const usuario = await UserExternal.findById(payload._id);
        if (!usuario || usuario.estado !== "ACTIVO" || !usuario.roles.includes("TRANSPORTISTA") || !usuario.transportistaId) return res.status(403).json({ message: "La cuenta de transportista no está habilitada." });
        req.usuarioTransportista = usuario;
        next();
    } catch (_) { return res.status(401).json({ message: "La sesión no es válida o ha expirado." }); }
};
const autenticarGenerador = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
        const payload = token && jwt.verify(token, process.env.JWT_SECRET);
        if (!payload || payload.role !== "EXTERNAL" || payload.activeRole !== "GENERADOR") return res.status(401).json({ message: "Inicia sesión como generador." });
        const usuario = await UserExternal.findById(payload._id);
        if (!usuario || usuario.estado !== "ACTIVO" || !usuario.roles.includes("GENERADOR") || !usuario.generadorId) return res.status(403).json({ message: "La cuenta de generador no está habilitada." });
        req.usuarioGenerador = usuario;
        next();
    } catch (_) { return res.status(401).json({ message: "La sesión no es válida o ha expirado." }); }
};
const miGenerador = async (req, res) => {
    try {
        const perfil = await Generador.findById(req.usuarioGenerador.generadorId).populate("plantas.ubigeoId", "codigo distrito provincia departamento");
        if (!perfil) return res.status(404).json({ message: "Generador no encontrado." });
        return res.json(perfil);
    } catch (_) { return res.status(500).json({ message: "No se pudo cargar el perfil." }); }
};

const permisoGeneradores = (permiso) => (req, res, next) => {
    const autorizado = req.user?._id && (req.user.modules || []).some((m) =>
        m.submodule?.name?.toUpperCase() === "GENERADORES" && (m.submodule.permissions || []).includes(permiso));
    if (!autorizado) return res.status(403).json({ message: `Se requiere el permiso ${permiso} del submódulo GENERADORES.` });
    next();
};

const notificarRevision = async (req, solicitud, detalle) => {
    try {
        await NotificationService.send(req.app.get("io"), {
            type: "SUBMODULE", title: "Solicitud de generador pendiente",
            message: `${solicitud.razonSocial} (RUC ${solicitud.ruc}): ${detalle}`,
            creator: { id: solicitud.creadoPor, model: "UserExternal" },
            scope: { moduleName: "CERTIFICACIONES", submoduleName: "GENERADORES" },
            entity: { id: solicitud._id, model: "SolicitudGenerador" },
        });
        return false;
    } catch (error) { console.error("No se pudo notificar la solicitud:", error.message); return true; }
};

const crear = async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
        const ruc = typeof req.body.ruc === "string" ? req.body.ruc.trim() : "", razonSocial = texto(req.body.razonSocial);
        const correoElectronico = texto(req.body.correoElectronico).toLowerCase(), telefono = texto(req.body.telefono, 30);
        if (!/^\d{11}$/.test(ruc) || !razonSocial || !emailValido(correoElectronico) || !telefono) return res.status(400).json({ message: "Completa razón social, RUC de 11 dígitos, correo y teléfono válidos." });
        if (await Generador.exists({ ruc }) || await UserExternal.exists({ ruc })) return res.status(409).json({ message: "El RUC ya tiene una empresa o cuenta registrada. Solicita su vinculación o contacta a Tower." });
        const token = crypto.randomBytes(32).toString("base64url");
        const solicitud = await Solicitud.create({ ruc, razonSocial, correoElectronico, telefono, transportistaId: req.usuarioTransportista.transportistaId, creadoPor: req.usuarioTransportista._id, invitacionHash: hashToken(token), invitacionExpira: new Date(Date.now() + 72 * 60 * 60 * 1000) });
        const notificacionPendiente = await notificarRevision(req, solicitud, "se inició una ficha provisional; falta que el generador complete sus datos.");
        return res.status(201).json({ message: "Solicitud provisional creada. Comparte el enlace con el generador.", token, expira: solicitud.invitacionExpira, notificacionPendiente });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "Ya existe una solicitud para este RUC. Contacta a Tower para revisarla." });
        console.error("Error al crear solicitud:", error); return res.status(500).json({ message: "No se pudo crear la solicitud." });
    }
};

const buscarInvitacion = async (token) => {
    if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    return Solicitud.findOne({ invitacionHash: hashToken(token), invitacionExpira: { $gt: new Date() }, estado: "PENDIENTE_DATOS" }).populate("transportistaId", "razonSocial ruc");
};
const listarPropias = async (req, res) => {
    try {
        const data = await Solicitud.find({ transportistaId: req.usuarioTransportista.transportistaId, estado: { $in: ["PENDIENTE_DATOS", "PENDIENTE_VERIFICACION"] } }).select("razonSocial ruc estado invitacionExpira createdAt").sort({ createdAt: -1 }).lean();
        return res.json({ data });
    } catch (_) { return res.status(500).json({ message: "No se pudieron consultar las solicitudes." }); }
};
const renovar = async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
        const token = crypto.randomBytes(32).toString("base64url");
        const solicitud = await Solicitud.findOneAndUpdate({ _id: req.params.id, transportistaId: req.usuarioTransportista.transportistaId, estado: "PENDIENTE_DATOS" }, { $set: { invitacionHash: hashToken(token), invitacionExpira: new Date(Date.now() + 72 * 60 * 60 * 1000) } }, { new: true });
        if (!solicitud) return res.status(404).json({ message: "La solicitud no existe o el generador ya completó sus datos." });
        return res.json({ token, expira: solicitud.invitacionExpira, message: "Se generó un nuevo enlace. El enlace anterior dejó de funcionar." });
    } catch (_) { return res.status(400).json({ message: "No se pudo renovar la invitación." }); }
};
const consultarInvitacion = async (req, res) => {
    try {
        res.set("Cache-Control", "no-store");
        const solicitud = await buscarInvitacion(req.body.token);
        if (!solicitud) return res.status(404).json({ message: "El enlace no es válido, ya fue utilizado o ha vencido." });
        return res.json({ razonSocial: solicitud.razonSocial, ruc: solicitud.ruc, correoElectronico: solicitud.correoElectronico, telefono: solicitud.telefono, transportista: solicitud.transportistaId });
    } catch (error) { return res.status(500).json({ message: "No se pudo consultar la invitación." }); }
};

const completar = async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
        const solicitud = await buscarInvitacion(req.body.token);
        if (!solicitud) return res.status(404).json({ message: "El enlace no es válido, ya fue utilizado o ha vencido." });
        const { password, aceptaVinculacion, responsable = {}, planta = {} } = req.body;
        const representanteLegal = texto(req.body.representanteLegal), dniRepresentante = texto(req.body.dniRepresentante, 20);
        const correoElectronico = texto(req.body.correoElectronico).toLowerCase(), telefono = texto(req.body.telefono, 30);
        if (!emailValido(correoElectronico) || !telefono || !representanteLegal || !dniRepresentante || typeof password !== "string" || password.length < 12 || Buffer.byteLength(password, "utf8") > 72 || aceptaVinculacion !== true) return res.status(400).json({ message: "Completa tus datos, acepta la vinculación y usa una contraseña de al menos 12 caracteres y máximo 72 bytes." });
        const responsableLimpio = { nombreResponsable: texto(responsable.nombreResponsable), dniResponsable: texto(responsable.dniResponsable, 20), cargoResponsable: texto(responsable.cargoResponsable), correoResponsable: texto(responsable.correoResponsable), telefonoResponsable: texto(responsable.telefonoResponsable, 30) };
        const plantaLimpia = { denominacion: texto(planta.denominacion), tipoPlanta: texto(planta.tipoPlanta), direccion: texto(planta.direccion, 300), actividadEconomica: texto(planta.actividadEconomica), ubigeoId: planta.ubigeoId };
        if (!responsableLimpio.nombreResponsable || !responsableLimpio.dniResponsable || !responsableLimpio.cargoResponsable || !plantaLimpia.denominacion || !plantaLimpia.tipoPlanta || !plantaLimpia.direccion || !plantaLimpia.actividadEconomica || !mongoose.isValidObjectId(plantaLimpia.ubigeoId) || typeof responsable.firmaResponsable !== "string" || !responsable.firmaResponsable.startsWith("data:image/")) return res.status(400).json({ message: "Completa la planta y el responsable, incluida su imagen de firma." });
        if (!await Ubigeo.exists({ _id: plantaLimpia.ubigeoId })) return res.status(400).json({ message: "Selecciona un ubigeo existente." });
        responsableLimpio.firmaResponsable = await snapshotFirma(responsable.firmaResponsable);
        const passwordHash = await bcrypt.hash(password, 12);
        const codigoVerificacion = crypto.randomBytes(8).toString("hex").toUpperCase();
        const actualizada = await Solicitud.findOneAndUpdate({ _id: solicitud._id, invitacionHash: hashToken(req.body.token), invitacionExpira: { $gt: new Date() }, estado: "PENDIENTE_DATOS" }, {
            $set: { estado: "PENDIENTE_VERIFICACION", correoElectronico, telefono, datosCompletados: { representanteLegal, dniRepresentante, responsablesTecnicos: [responsableLimpio], plantas: [plantaLimpia], aceptoVinculacion: true, fechaAceptacion: new Date() }, passwordHash, codigoVerificacionHash: hashToken(codigoVerificacion) },
            $unset: { invitacionHash: 1, invitacionExpira: 1 }
        }, { new: true });
        if (!actualizada) return res.status(409).json({ message: "La invitación ya fue utilizada o venció." });
        const notificacionPendiente = await notificarRevision(req, actualizada, "completó sus datos y requiere verificación independiente antes de activar la cuenta.");
        return res.json({ message: "Datos recibidos. Tower verificará la solicitud antes de activar la cuenta y vinculación.", codigoVerificacion, notificacionPendiente });
    } catch (error) { console.error("Error al completar solicitud:", error.message); return res.status(400).json({ message: "No se pudo completar la solicitud. Revisa los datos y la firma." }); }
};

const recuperarCodigo = async (req, res) => {
    res.set("Cache-Control", "no-store");
    const ruc = typeof req.body.ruc === "string" ? req.body.ruc.trim() : "";
    const password = req.body.password;
    const mensaje = "No se pudo recuperar el código. Revisa tus datos o intenta nuevamente más tarde.";
    if (!/^\d{11}$/.test(ruc) || typeof password !== "string" || !password || Buffer.byteLength(password, "utf8") > 72) return res.status(400).json({ message: mensaje });
    try {
        const ahora = new Date();
        const finVentana = new Date(ahora.getTime() + 15 * 60 * 1000);
        const nuevaVentana = { $or: [{ $eq: [{ $ifNull: ["$recuperacionLimiteHasta", null] }, null] }, { $lte: ["$recuperacionLimiteHasta", ahora] }] };
        // Reserva un intento de forma atómica y persistente; no depende de la memoria del servidor.
        const solicitud = await Solicitud.findOneAndUpdate({ ruc, estado: "PENDIENTE_VERIFICACION", $or: [{ recuperacionLimiteHasta: { $exists: false } }, { recuperacionLimiteHasta: { $lte: ahora } }, { recuperacionIntentos: { $lt: 5 } }] }, [{ $set: {
            recuperacionIntentos: { $cond: [nuevaVentana, 1, { $add: [{ $ifNull: ["$recuperacionIntentos", 0] }, 1] }] },
            recuperacionLimiteHasta: { $cond: [nuevaVentana, finVentana, "$recuperacionLimiteHasta"] },
        } }], { new: true }).select("+passwordHash");
        const coincide = await bcrypt.compare(password, solicitud?.passwordHash || passwordFicticio);
        if (!solicitud || !coincide || !solicitud.passwordHash) return res.status(401).json({ message: mensaje });
        const codigoVerificacion = crypto.randomBytes(8).toString("hex").toUpperCase();
        const actualizada = await Solicitud.findOneAndUpdate({ _id: solicitud._id, estado: "PENDIENTE_VERIFICACION", passwordHash: solicitud.passwordHash }, {
            $set: { codigoVerificacionHash: hashToken(codigoVerificacion), fechaRecuperacionCodigo: ahora },
            $inc: { recuperacionesCodigo: 1 },
        }, { new: true });
        if (!actualizada) return res.status(401).json({ message: mensaje });
        return res.json({ codigoVerificacion, message: "Se generó un código nuevo; el anterior dejó de ser válido. Tower debe verificar tu identidad antes de activar la cuenta." });
    } catch (error) { console.error("Error al recuperar código:", error.message); return res.status(500).json({ message: "No se pudo recuperar el código. Intenta más tarde." }); }
};

const listar = async (req, res) => {
    try {
        const solicitudes = await Solicitud.find({ estado: { $in: ["PENDIENTE_DATOS", "PENDIENTE_VERIFICACION"] } }).select("+datosCompletados").populate("transportistaId", "razonSocial ruc").sort({ createdAt: -1 }).lean();
        res.set("Cache-Control", "no-store"); return res.json({ data: solicitudes });
    } catch (error) { return res.status(500).json({ message: "No se pudieron cargar las solicitudes." }); }
};

const aprobar = async (req, res) => {
    const codigoVerificacion = texto(req.body.codigoVerificacion, 16).toUpperCase();
    if (req.body.verificacionConfirmada !== true || !texto(req.body.detalleVerificacion, 500) || !/^[0-9A-F]{16}$/.test(codigoVerificacion)) return res.status(400).json({ message: "Confirma y describe la verificación independiente e introduce el código del generador." });
    let session;
    let resultado;
    try {
        session = await mongoose.startSession();
        await session.withTransaction(async () => {
            const solicitud = await Solicitud.findOne({ _id: req.params.id, estado: "PENDIENTE_VERIFICACION" }).select("+datosCompletados +passwordHash +codigoVerificacionHash").session(session);
            if (!solicitud || !solicitud.datosCompletados?.aceptoVinculacion || !solicitud.passwordHash) throw new Error("SOLICITUD_NO_DISPONIBLE");
            if (!solicitud.codigoVerificacionHash || solicitud.codigoVerificacionHash !== hashToken(codigoVerificacion)) throw new Error("CODIGO_INVALIDO");
            if (await Generador.exists({ ruc: solicitud.ruc }).session(session) || await UserExternal.exists({ ruc: solicitud.ruc }).session(session)) throw new Error("RUC_EXISTENTE");
            const [generador] = await Generador.create([{ razonSocial: solicitud.razonSocial, ruc: solicitud.ruc, correoElectronico: solicitud.correoElectronico, telefono: solicitud.telefono, representanteLegal: solicitud.datosCompletados.representanteLegal, dniRepresentante: solicitud.datosCompletados.dniRepresentante, plantas: solicitud.datosCompletados.plantas, responsablesTecnicos: solicitud.datosCompletados.responsablesTecnicos, usuarioManifestower: true, estado: "ACTIVO" }], { session });
            const [usuario] = await UserExternal.create([{ ruc: solicitud.ruc, password: solicitud.passwordHash, roles: ["GENERADOR"], generadorId: generador._id, estado: "ACTIVO" }], { session });
            await Vinculacion.create([{ generadorId: generador._id, transportistaId: solicitud.transportistaId, iniciadoPor: "TRANSPORTISTA", status: "ACEPTADA", respondidoPor: usuario._id, fechaRespuesta: solicitud.datosCompletados.fechaAceptacion, tienePermisoLlenado: false }], { session });
            const actualizacion = await Transportista.updateOne({ _id: solicitud.transportistaId }, { $addToSet: { generadores: { generadorId: generador._id, tienePermisoLlenado: false } } }, { session });
            if (actualizacion.matchedCount !== 1) throw new Error("TRANSPORTISTA_NO_DISPONIBLE");
            solicitud.consentimientoVinculacion = { fecha: solicitud.datosCompletados.fechaAceptacion, version: "v1-vinculacion-sin-firma-automatica", origen: "ENLACE" };
            solicitud.estado = "APROBADA"; solicitud.generadorId = generador._id; solicitud.verificadoPor = req.user._id; solicitud.fechaVerificacion = new Date(); solicitud.observacion = texto(req.body.detalleVerificacion, 500); solicitud.passwordHash = undefined; solicitud.codigoVerificacionHash = undefined; solicitud.datosCompletados = undefined;
            await solicitud.save({ session });
            resultado = { generadorId: generador._id, usuarioGeneradorId: usuario._id, transportistaId: solicitud.transportistaId, razonSocial: solicitud.razonSocial };
        });
        let notificacionPendiente = false;
        try {
            const usuarios = await UserExternal.find({ transportistaId: resultado.transportistaId, roles: "TRANSPORTISTA", estado: "ACTIVO" }).select("_id").lean();
            const mensajes = usuarios.map((usuario) => NotificationService.send(req.app.get("io"), { type: "INDIVIDUAL", title: "Generador verificado", message: `${resultado.razonSocial} fue verificado por Tower y aceptó la vinculación.`, creator: { id: req.user._id, model: "Employee" }, scope: { receiverModel: "UserExternal", receiverId: usuario._id }, entity: { id: resultado.generadorId, model: "Generador" } }));
            mensajes.push(NotificationService.send(req.app.get("io"), { type: "INDIVIDUAL", title: "Cuenta de generador activada", message: "Tower verificó tus datos y activó tu cuenta y la vinculación solicitada. El envío y la firma automáticos no están autorizados.", creator: { id: req.user._id, model: "Employee" }, scope: { receiverModel: "UserExternal", receiverId: resultado.usuarioGeneradorId }, entity: { id: resultado.generadorId, model: "Generador" } }));
            const enviados = await Promise.allSettled(mensajes);
            notificacionPendiente = !usuarios.length || enviados.some((envio) => envio.status === "rejected");
        } catch (error) { notificacionPendiente = true; console.error("No se notificó la aprobación:", error.message); }
        return res.json({ message: notificacionPendiente ? "Solicitud aprobada, pero no fue posible notificar a todos los participantes." : "Solicitud aprobada; cuenta y vinculación activadas.", data: resultado, notificacionPendiente });
    } catch (error) {
        if (error.message === "SOLICITUD_NO_DISPONIBLE") return res.status(409).json({ message: "La solicitud ya no está disponible para aprobación." });
        if (error.message === "RUC_EXISTENTE" || error.code === 11000) return res.status(409).json({ message: "El RUC ya tiene una empresa o cuenta; requiere revisión manual." });
        if (error.message === "TRANSPORTISTA_NO_DISPONIBLE") return res.status(409).json({ message: "El transportista ya no está disponible; requiere revisión manual." });
        if (error.message === "CODIGO_INVALIDO") return res.status(400).json({ message: "El código de verificación no coincide." });
        console.error("Error al aprobar solicitud:", error); return res.status(500).json({ message: "No se pudo aprobar la solicitud. La operación requiere transacciones de MongoDB disponibles." });
    } finally { if (session) await session.endSession(); }
};

module.exports = { autenticarTransportista, autenticarGenerador, miGenerador, permisoGeneradores, crear, listarPropias, renovar, consultarInvitacion, completar, recuperarCodigo, listar, aprobar };
