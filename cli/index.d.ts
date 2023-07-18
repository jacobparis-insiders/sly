/**
 * These are imported by the JSDoc in the transformers
 */

export type Meta = {
  name: string
  source: string
  description?: string
  license: string
}

export type Transformer = (
  input: string,
  meta: Meta
) => Promise<string> | string
