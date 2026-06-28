export const hideSensitiveFields = (model, fieldNames) => {
  model.prototype.toJSON = function toJSON() {
    const values = { ...this.get() };

    for (const fieldName of fieldNames) {
      delete values[fieldName];
    }

    return values;
  };
};
