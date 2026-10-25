import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, aoExpirarSessao, definirToken } from '../services/api';
import { apagarToken, lerToken, salvarToken } from '../services/armazenamento';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [iniciando, setIniciando] = useState(true);

  const sair = useCallback(async () => {
    definirToken(null);
    setUsuario(null);
    await apagarToken().catch(() => {});
  }, []);

  useEffect(() => {
    aoExpirarSessao(() => {
      sair();
    });

    (async () => {
      try {
        const token = await lerToken();
        if (token) {
          definirToken(token);
          setUsuario(await api.eu());
        }
      } catch (erro) {
        if (erro.status === 401) await sair();
        else definirToken(null);
      } finally {
        setIniciando(false);
      }
    })();
  }, [sair]);

  const iniciarSessao = useCallback(async ({ token, usuario: dadosUsuario }) => {
    definirToken(token);
    await salvarToken(token);
    setUsuario(dadosUsuario);
  }, []);

  const entrar = useCallback(async (email, senha) => iniciarSessao(await api.login(email, senha)), [iniciarSessao]);
  const cadastrar = useCallback(async (dados) => iniciarSessao(await api.cadastrar(dados)), [iniciarSessao]);

  const valor = useMemo(() => ({ usuario, iniciando, entrar, cadastrar, sair }), [usuario, iniciando, entrar, cadastrar, sair]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
