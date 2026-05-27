/**
 * Extracts a human-readable error message from a non-OK API response.
 * Handles both FastAPI's string detail and array-of-validation-error formats.
 */
export async function extractApiError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail))
      return body.detail.map((e: { msg: string }) => e.msg).join('; ');
  } catch { /* ignore parse errors */ }
  return `Unexpected error (HTTP ${res.status})`;
}
