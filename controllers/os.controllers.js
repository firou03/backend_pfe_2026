 const os = require("os");
module.exports.getOsInfo = (req, res) => {
try {
const osInformations = osService.getOsInfo();
if (!osInformations) {
throw new Error("No OS information found");
}

res.status(200).json({
message: "OS Information retrieved successfully",
data: osInformations,
});

} catch (error) {
res.status(500).json({ error: error.message });
}
};