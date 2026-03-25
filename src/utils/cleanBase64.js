const cleanBase64 = (base64String) => {
    if (!base64String) return null;
    return base64String.includes(",")
        ? base64String.split(",")[1]
        : base64String;
};

module.exports = cleanBase64;