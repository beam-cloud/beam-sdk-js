class ClientNotInitializedError extends Error {
  constructor(message: string) {
    super("Slai client has not been initialized, yet: " + message);
    this.name = "ClientNotInitializedError";
  }
}

class BeamClientError extends Error {
  constructor(message: string) {
    super("Slai client errored: " + message);
    this.name = "SlaiClientError";
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export { ClientNotInitializedError, ValidationError, BeamClientError };
