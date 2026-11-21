const POLL_MS = 3000;

const TERMINAL_STATUSES = new Set(["DELIVERED", "CANCELLED", "EXPIRED"]);

/**
 * Returns the polling interval in ms for a rescue's status, or false to stop polling.
 * Undefined status (not yet loaded) keeps polling.
 */
export function pollInterval(status: string | undefined): number | false {
  if (status === undefined) {
    return POLL_MS;
  }
  if (TERMINAL_STATUSES.has(status)) {
    return false;
  }
  return POLL_MS;
}
