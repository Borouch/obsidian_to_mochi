export class ModelNotFoundError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'ModelNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function throwIfNotFound<T>(object: T | null, objectName = 'Object is null'): T {
  if (!object) {
    throw new Error(`${objectName} isnull`);
  }
  return object;
}
