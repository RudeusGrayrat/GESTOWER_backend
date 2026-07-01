const Widget = require("../../../models/Herramientas/Widgets/Widget");

const getAllWidgets = async (req, res) => {
  try {
    const widgets = await Widget.find();
    // if (!widgets) {
    //   return res.status(404).json({ message: "No se encontraron widgets" });
    // }
    return res.status(200).json(widgets);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = getAllWidgets;
