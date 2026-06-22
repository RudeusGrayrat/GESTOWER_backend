const Employee = require("../../models/Employees/Employee");
const { hashPassword } = require("../../utils/bcrypt");
const { deleteImage } = require("../../utils/cloudinary/images");
const NotificationService = require("../Herramientas/Notification/CreateNotification");

const updateEmployeePartial = async (req, res) => {
  const {
    _id,
    name,
    lastname,
    typeDocument,
    documentNumber,
    type,
    state,
    dateOfBirth,
    dateStart,
    genre,
    civilStatus,
    phone,
    telephone,
    email,
    location,
    charge,
    area,
    sueldo,
    user,
    password,
    modules,
    phoneCode,
    phoneNumber,
    business,
    sede,
    photo,
    funcion,
    regimenPension,
    codigoSpp,
    asistenciaAutomatica,
    actualizadoPor,
  } = req.body;
  const io = req.app.get("io");

  try {
    if (!_id) {
      return res.status(400).json({ message: "El ID es obligatorio" });
    }

    const userFound = await Employee.findById(_id);
    if (!userFound) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    let camposCambiados = [];

    if (name) {
      camposCambiados.push("Nombres");
      userFound.name = name
    };
    if (lastname) {
      camposCambiados.push("Apellidos");
      userFound.lastname = lastname;
    }
    if (typeDocument) {
      camposCambiados.push("Tipo de Documento");
      userFound.typeDocument = typeDocument;
    }
    if (documentNumber) {
      camposCambiados.push("Número de Documento");
      userFound.documentNumber = documentNumber;
    }
    if (type) {
      camposCambiados.push("Tipo");
      userFound.type = type;
    }
    if (state) {
      camposCambiados.push("Estado");
      userFound.state = state;
    }
    if (dateOfBirth) {
      camposCambiados.push("Fecha de Nacimiento");
      userFound.dateOfBirth = dateOfBirth;
    }
    if (dateStart) {
      camposCambiados.push("Fecha de Inicio");
      userFound.dateStart = dateStart;
    }
    if (genre) {
      camposCambiados.push("Género");
      userFound.genre = genre;
    }
    if (civilStatus) {
      camposCambiados.push("Estado Civil");
      userFound.civilStatus = civilStatus;
    }
    if (phone) {
      camposCambiados.push("Teléfono");
      userFound.phone = phone;
    }
    if (telephone) {
      camposCambiados.push("Teléfono Secundario");
      userFound.telephone = telephone;
    }
    if (email) {
      camposCambiados.push("Correo Electrónico");
      userFound.email = email;
    }
    if (location) {
      camposCambiados.push("Ubicación");
      userFound.location = location;
    }
    if (charge) {
      camposCambiados.push("Cargo");
      userFound.charge = charge;
    }
    if (area) {
      camposCambiados.push("Área");
      userFound.area = area;
    }
    if (sueldo) {
      camposCambiados.push("Sueldo");
      userFound.sueldo = sueldo;
    }
    if (user) {
      camposCambiados.push("Usuario");
      userFound.user = user;
    }
    if (modules) {
      camposCambiados.push("Módulos");
      userFound.modules = modules;
    }
    if (phoneCode) {
      camposCambiados.push("Código de Teléfono");
      userFound.phoneCode = phoneCode;
    }
    if (phoneNumber) {
      camposCambiados.push("Número de Teléfono");
      userFound.phoneNumber = phoneNumber;
    }
    if (business) {
      camposCambiados.push("Empresa");
      userFound.business = business;
    }
    if (sede) {
      camposCambiados.push("Sede");
      userFound.sede = sede;
    }
    if (regimenPension) {
      camposCambiados.push("Régimen de Pensión");
      userFound.regimenPension = regimenPension;
    }
    if (codigoSpp) {
      camposCambiados.push("Código SPP");
      userFound.codigoSpp = codigoSpp;
    }
    if (asistenciaAutomatica) {
      camposCambiados.push("Asistencia Automática");
      userFound.asistenciaAutomatica = asistenciaAutomatica;
    }
    if (photo) {
      camposCambiados.push("Foto");
      userFound.photo = photo;
    }
    if (funcion) {
      camposCambiados.push("Función");
      userFound.funcion = funcion;
    }

    if (password) {
      camposCambiados.push("Contraseña");
      userFound.password = await hashPassword(password);
    }

    await userFound.save();
    const stringCampos = camposCambiados.length > 0
      ? `Campos modificados: ${camposCambiados.join(", ")}.`
      : "Actualización general de credenciales.";
    const findActualizador = actualizadoPor ? await Employee.findById(actualizadoPor) : null;
    await NotificationService.send(io, {
      type: "SUBMODULE",
      title: `Perfil actualizado: ${userFound.name} ${userFound.lastname}`,
      message: `El perfil de ${userFound.name} ${userFound.lastname} fue actualizado por ${findActualizador ? findActualizador.name + " " + findActualizador.lastname : "un administrador"}. ${stringCampos}`,
      creator: {
        id: actualizadoPor || actualizadoPor?._id,
        model: "Employee"
      },
      scope: {
        submoduleName: "COLABORADORES",
        moduleName: "RECURSOS HUMANOS"
      },
      entity: {
        id: userFound._id,
        model: "Employee"
      }
    });
    const roomName = `SUBMODULE_COLABORADORES`;
    const clientsInRoom = io.sockets.adapter.rooms.get(roomName);
    console.log(`🔍 Clientes en la sala ${roomName}:`, clientsInRoom ? [...clientsInRoom] : 0);
    return res.status(200).json({
      message: "Usuario actualizado correctamente",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({ message: error.message });
  }
};

module.exports = updateEmployeePartial;
