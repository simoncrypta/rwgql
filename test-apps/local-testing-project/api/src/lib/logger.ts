import { formatLog } from "@rwgql/log-formatter";
export const logger = {
  info: (record: Record<string, unknown>) =>
    console.info(formatLog({ level: 30, time: Date.now(), ...record })),
  error: (error: unknown) =>
    console.error(
      formatLog({
        level: 50,
        err:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : { message: String(error) },
      }),
    ),
};
