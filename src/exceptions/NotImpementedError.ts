export class NotImplementedError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'NotImplementedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
