import { onRequest as __api___route___ts_onRequest } from "C:\\Users\\wilia\\OneDrive\\Documentos\\VOLTQ\\DRA ANA MORONG\\Controle de Estoque\\Controle de Estoque\\app\\functions\\api\\[[route]].ts"

export const routes = [
    {
      routePath: "/api/:route*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___route___ts_onRequest],
    },
  ]