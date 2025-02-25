import { getReasonPhrase } from 'http-status-codes';

export interface ErrorDetails {
  status?: number;
  title?: string;
  source?: {
    pointer?: string;
    header?: string;
    parameter?: string;
  };
}

export class CardstackError extends Error {
  detail: string;
  status: number;
  title?: string;
  source?: ErrorDetails['source'];
  isCardstackError: true = true;
  additionalErrors: (CardstackError | Error)[] | null = null;

  // If this error originated from a row in the search index that has stored
  // `compilerErrors`, this propagates forward the card URLs that were
  // dependencies of the failed compile.
  deps?: string[];

  constructor(detail: string, { status, title, source }: ErrorDetails = {}) {
    super(detail);
    this.detail = detail;
    this.status = status || 500;
    this.title = title || getReasonPhrase(this.status);
    this.source = source;
  }
  toJSON() {
    return {
      title: this.title,
      detail: this.detail,
      code: this.status,
      source: this.source,
    };
  }

  static fromSerializableError(err: any): any {
    if (!err || typeof err !== 'object' || !isCardstackError(err)) {
      return err;
    }
    let result = new this(err.detail, { status: err.status, title: err.title, source: err.source });
    if (err.additionalErrors) {
      result.additionalErrors = err.additionalErrors.map((inner) => this.fromSerializableError(inner));
    }
    return result;
  }
}

export class NotFound extends CardstackError {
  status = 404;
  title = 'Not Found';
}
export class BadRequest extends CardstackError {
  status = 400;
  title = 'Bad Request';
}

export class Conflict extends CardstackError {
  status = 409;
  title = 'Conflict';
}
export class UnprocessableEntity extends CardstackError {
  status = 422;
  title = 'Unprocessable Entity';
}

export function augmentBadRequest(error: any) {
  error.status = 400;
  error.isCardstackError = true;

  return error;
}

export function printCompilerError(err: any) {
  if (isAcceptableError(err)) {
    return String(err);
  }

  return `${err.message}\n\n${err.stack}`;
}

export function isCardstackError(err: any): err is CardstackError {
  return err != null && typeof err === 'object' && err.isCardstackError;
}

function isAcceptableError(err: any) {
  return err.isCardstackError || err.code === 'BABEL_PARSE_ERROR';
}

export function serializableError(err: any): any {
  if (!err || typeof err !== 'object' || !isCardstackError(err)) {
    // rely on the best-effort serialization that we'll get from, for example,
    // "pg" as it puts this object into jsonb
    return err;
  }

  let result = Object.assign({}, err);
  result.additionalErrors = result.additionalErrors?.map((inner) => serializableError(inner)) ?? null;
  return result;
}

// This is a very special type of error that is used as a signal for us that
// there is unfinished async work when loading card field values.
export class NotReady extends Error {
  isNotReadyError: true = true;
  constructor(
    readonly schemaInstance: any,
    readonly fieldName: string,
    readonly computeVia: string,
    readonly cacheFieldName: string,
    readonly cardName: string
  ) {
    super(`The field ${cardName}.${fieldName} is not ready`);
  }
}

export function isNotReadyError(err: any): err is NotReady {
  return (
    err != null &&
    typeof err === 'object' &&
    err.isNotReadyError &&
    'fieldName' in err &&
    'computeVia' in err &&
    'cacheFieldName' in err
  );
}
