/** What a Server Action returns: a typed result, never a thrown API error or a token. */
export type ActionResult<T, Code extends string = string> =
  { ok: true; data: T } | { ok: false; error: ActionError<Code> };

export type ActionError<Code extends string = string> = {
  code: Code;
  /** A message for people. Never the backend's raw text. */
  message: string;
  /** Messages by form field name, from `validation_error`. */
  fields: Record<string, string>;
};

export function failure<Code extends string>(
  code: Code,
  message: string,
  fields: Record<string, string> = {},
): { ok: false; error: ActionError<Code> } {
  return { ok: false, error: { code, message, fields } };
}
