export const logger = {
  info: (msg: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({
      level: "info",
      timestamp: new Date().toISOString(),
      message: msg,
      ...data,
    }));
  },
  error: (msg: string, data?: Record<string, unknown>) => {
    console.error(JSON.stringify({
      level: "error",
      timestamp: new Date().toISOString(),
      message: msg,
      ...data,
    }));
  },
};
