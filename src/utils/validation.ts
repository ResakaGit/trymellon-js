import { createCredentialError } from '../errors';

export function validateCredentialStructure(
  credential: unknown,
  operation: 'create' | 'get' = 'create'
): asserts credential is PublicKeyCredential {
  if (
    !credential ||
    typeof credential !== 'object' ||
    !('id' in credential) ||
    !('rawId' in credential) ||
    !('response' in credential)
  ) {
    throw createCredentialError(operation);
  }
}
