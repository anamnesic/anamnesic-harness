import * as path from 'path';

/**
 * Resolve e valida um caminho de arquivo para garantir que ele esteja dentro do diretório raiz permitido.
 * Previne falhas de segurança como Path Traversal.
 *
 * @param root O diretório raiz absoluto permitido.
 * @param relativePath O caminho relativo fornecido pelo usuário/agente.
 * @returns O caminho absoluto resolvido e seguro.
 * @throws Error se o caminho resolvido estiver fora do diretório raiz.
 */
export function safePath(root: string, relativePath: string): string {
  // 1. Resolve o caminho absoluto combinando o root e o caminho relativo
  const resolvedPath = path.resolve(root, relativePath);

  // 2. Normaliza ambos os caminhos para garantir comparação correta
  const normalizedRoot = path.normalize(root);
  const normalizedResolved = path.normalize(resolvedPath);

  // 3. Verifica se o caminho resolvido começa com o diretório raiz
  // Adicionamos path.sep ao final do root para evitar falsos positivos
  // Ex: root = /var/www/app, resolved = /var/www/app-secret
  if (!normalizedResolved.startsWith(normalizedRoot + path.sep) && normalizedResolved !== normalizedRoot) {
    throw new Error(`Acesso negado: O caminho '${relativePath}' resolve para fora do diretório de workspace permitido.`);
  }

  return resolvedPath;
}
