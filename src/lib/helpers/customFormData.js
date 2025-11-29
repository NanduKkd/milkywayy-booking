export const makeCustomFormData = (data) => {
  const files = [];
  const out = compiler(data, files);
  const fd = new FormData();
  fd.append("json", JSON.stringify(out));
  for (const file of files) {
    fd.append("file", file);
  }
  return fd;
};

const compiler = (data, files = []) => {
  let out;
  if (Array.isArray(data)) {
    out = [];
    for (const i of data) {
      out.push(compiler(i, files));
    }
    return out;
  } else if (data instanceof File) {
    out = "%%" + files.length + "%%";
    files.push(data);
    return out;
  } else if (data && typeof data === "object") {
    out = {};
    for (const ii in data) {
      out[ii] = compiler(data[ii], files);
    }
    return out;
  } else {
    return data;
  }
};
