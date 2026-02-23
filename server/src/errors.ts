export class StorageUnavailableError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}

export function toHttpError(err: unknown, fallbackError: string) {
  if (err instanceof StorageUnavailableError) {
    return { status: 503, error: 'storage_unavailable' };
  }
  if (err instanceof Error && err.message === 'passphrase_required') {
    return { status: 400, error: 'passphrase_required' };
  }
  return { status: 500, error: fallbackError };
}
