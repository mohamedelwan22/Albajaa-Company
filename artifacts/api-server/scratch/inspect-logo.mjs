import fs from "fs";
import path from "path";

const logoPath = "E:\\My Projects\\travelling\\artifacts\\albaja\\public\\ticket-logo.png";
if (fs.existsSync(logoPath)) {
  const buf = fs.readFileSync(logoPath);
  console.log("File size in bytes:", buf.length);
  console.log("Header bytes (hex):", buf.slice(0, 10).toString("hex"));
  console.log("Is PNG:", buf.slice(0, 8).toString("hex") === "89504e470d0a1a0a");
  console.log("Is SVG:", buf.slice(0, 100).toString("utf-8").includes("<svg"));
} else {
  console.log("File does not exist!");
}
