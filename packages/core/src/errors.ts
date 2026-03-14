export class LibraryParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LibraryParseError";
  }
}

export class RuleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleValidationError";
  }
}

export class PlaylistResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaylistResolutionError";
  }
}

export class ForwardReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForwardReferenceError";
  }
}

export class DuplicatePlaylistPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicatePlaylistPathError";
  }
}

export class AmbiguousPlaylistReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AmbiguousPlaylistReferenceError";
  }
}

export class XmlWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XmlWriteError";
  }
}
