export const cores = {
  fundo: '#F1F5F9',
  superficie: '#FFFFFF',
  borda: '#E2E8F0',
  texto: '#0F172A',
  textoSuave: '#64748B',
  primaria: '#0E7490',
  primariaEscura: '#155E75',
  primariaClara: '#CFFAFE',
  perigo: '#DC2626',
  perigoClaro: '#FEE2E2',
  alerta: '#B45309',
  alertaClaro: '#FEF3C7',
  sucesso: '#15803D',
  sucessoClaro: '#DCFCE7',
  neutroClaro: '#E2E8F0',
};

export const espaco = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const raio = { sm: 8, md: 12, lg: 16, pilula: 999 };

export const fonte = { pequena: 12, corpo: 15, media: 17, titulo: 22, destaque: 28 };

export const STATUS = {
  aberto: { rotulo: 'Aberto', cor: cores.primaria, fundo: cores.primariaClara },
  em_andamento: { rotulo: 'Em andamento', cor: cores.alerta, fundo: cores.alertaClaro },
  concluido: { rotulo: 'Concluído', cor: cores.sucesso, fundo: cores.sucessoClaro },
  cancelado: { rotulo: 'Cancelado', cor: cores.textoSuave, fundo: cores.neutroClaro },
};

export const TIPOS = {
  instalacao: { rotulo: 'Instalação', icone: 'construct-outline' },
  manutencao: { rotulo: 'Manutenção', icone: 'settings-outline' },
  limpeza: { rotulo: 'Limpeza', icone: 'water-outline' },
  reparo: { rotulo: 'Reparo', icone: 'hammer-outline' },
};

export const PRIORIDADES = {
  baixa: { rotulo: 'Baixa', cor: cores.sucesso },
  media: { rotulo: 'Média', cor: cores.alerta },
  alta: { rotulo: 'Alta', cor: cores.perigo },
};
