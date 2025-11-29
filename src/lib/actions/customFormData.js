"use server";
import path from "path";
import fs from "fs/promises";

export const breakCustomFormData = async (fd) => {
  const files = fd.getAll("file");
  const savedFiles = [];
  for (const file of files) {
    const filename =
      Date.now() + "-" + (100000 * Math.random()).toFixed() + "-" + file.name;
    await fs.writeFile(
      path.join(process.env.FILE_UPLOAD_PATH, filename),
      Buffer.from(await file.arrayBuffer()),
    );
    savedFiles.push(filename);
  }
  return parser(JSON.parse(fd.get("json")), savedFiles);
};

const parser = (obj, files) => {
  if (Array.isArray(obj)) {
    const out = [];
    for (const i of obj) {
      out.push(parser(i, files));
    }
    return out;
  } else if (obj && typeof obj === "object") {
    const out = {};
    for (const i in obj) {
      out[i] = parser(obj[i], files);
    }
    return out;
  } else if (typeof obj === "string") {
    const res = /^\%\%(\d+)\%\%$/.exec(obj);
    if (res) return files[Number(res[1])];
    return obj;
  }
  return obj;
};
