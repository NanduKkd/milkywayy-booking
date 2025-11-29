export const actionWrapper = (action) => {
  return async (...args) => {
    try {
      const result = await action(...args);
      return { success: true, message: null, data: result };
    } catch (error) {
      console.error("Server Action Error:", error);
      return {
        success: false,
        message: error.message || "An unexpected error occurred",
        data: null,
      };
    }
  };
};
