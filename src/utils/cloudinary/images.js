const cloudinary = require("./config.js");

// utils/cloudinary/images.js
const uploadImage = (fileBuffer, fileName) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "home/TOWER/IMAGES", public_id: fileName },
      (error, result) => {
        if (error) reject(error);
        else resolve(result); // Cloudinary devuelve el objeto completo con secure_url
      }
    );
    uploadStream.end(fileBuffer);
  });
};

const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw error;
  }
};
const extractPublicId = (url) => {
  const parts = url.split("/");
  const versionIndex = parts.findIndex((p) => /^v\d+$/.test(p));
  const publicIdParts = parts.slice(versionIndex + 1);
  const lastPart = publicIdParts.join("/");
  const dotIndex = lastPart.lastIndexOf(".");
  return lastPart.substring(0, dotIndex);
};

module.exports = { uploadImage, deleteImage, extractPublicId };
