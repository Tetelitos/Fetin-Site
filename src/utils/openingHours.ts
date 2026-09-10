export const HORARIO_ABERTURA_PADRAO = "11:30";
export const HORARIO_FECHAMENTO_PADRAO = "18:00";

const converterEmMinutos = (horario: string, fallback: string) => {
  const resultado = /^(\d{1,2}):(\d{2})$/.exec(horario.trim());
  if (!resultado) return converterEmMinutos(fallback, "00:00");

  const horas = Number(resultado[1]);
  const minutos = Number(resultado[2]);

  if (horas > 23 || minutos > 59) {
    return converterEmMinutos(fallback, "00:00");
  }

  return horas * 60 + minutos;
};

export const obterStatusFuncionamento = (
  agora: Date,
  horarioAbertura = HORARIO_ABERTURA_PADRAO,
  horarioFechamento = HORARIO_FECHAMENTO_PADRAO
) => {
  const abertura = converterEmMinutos(
    horarioAbertura,
    HORARIO_ABERTURA_PADRAO
  );
  const fechamento = converterEmMinutos(
    horarioFechamento,
    HORARIO_FECHAMENTO_PADRAO
  );
  const horarioAtual = agora.getHours() * 60 + agora.getMinutes();
  const aberto =
    abertura === fechamento ||
    (abertura < fechamento
      ? horarioAtual >= abertura && horarioAtual < fechamento
      : horarioAtual >= abertura || horarioAtual < fechamento);

  return {
    aberto,
    horarioAbertura,
    horarioFechamento,
  };
};
