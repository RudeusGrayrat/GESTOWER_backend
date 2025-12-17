const Business = require("../../models/Business");
const Employee = require("../../models/Employees/Employee");
const Widget = require("../../models/Herramientas/Widgets/Widget");
const WidgetPreference = require("../../models/Herramientas/Widgets/WidgetPreference");
const { hashPassword } = require("../../utils/bcrypt");

const registerEmployee = async (req, res) => {
  try {
    const {
      name,
      lastname,
      documentType,
      documentNumber,
      state,
      type,
      dateOfBirth,
      genre,
      civilStatus,
      funcion,
      phone,
      telephone,
      email,
      location,
      address,
      charge,
      sueldo,
      user,
      password,
      photo,
      modules,
      business,
      sede,
      dateStart,
      regimenPension,
      codigoSpp,
      asistenciaAutomatica,
    } = req.body;

    const hashedPassword = await hashPassword(password);
    const findEmployee = await Employee.findOne({ documentNumber });
    if (findEmployee) {
      return res.status(400).json({ message: "El Colaborador ya existe" });
    }
    if (!hashedPassword) {
      return res
        .status(500)
        .json({ message: "Error al hashear la contraseña" });
    }
    const findBusiness = await Business.findOne({ razonSocial: business });

    if (!findBusiness) {
      return res.status(404).json({ message: "Empresa no encontrada" });
    }

    const newEmployee = new Employee({
      name,
      lastname,
      documentType,
      documentNumber,
      type,
      state,
      dateOfBirth,
      genre,
      civilStatus,
      phone,
      telephone,
      email,
      location,
      address,
      charge,
      sueldo,
      user,
      password: hashedPassword,
      photo,
      modules,
      business,
      funcion,
      sede,
      dateStart,
      regimenPension,
      codigoSpp,
      asistenciaAutomatica,
    });

    await newEmployee.save();

    const widget = await Widget.findOne({
      key: "NOVEDADES_LINK",
    });
    if (!widget) {
      return res.status(404).json({ message: "Widget no encontrado" });
    }

    const prefs = new WidgetPreference({
      colaborador: newEmployee._id,
      widgets: [
        {
          widget: widget._id,
          orden: 0,
        },
      ],
    });

    await prefs.save();
    res.status(201).json({
      message: "Colaborador registrado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = registerEmployee;
