function parse(json) {
  const items = Array.isArray(json) ? json : [json];
  if (items.length === 0) return '';

  const headers = Object.keys(items[0]);
  const csvRows = [
    headers.join(','),
    ...items.map(row =>
      headers.map(field => JSON.stringify(row[field] ?? '')).join(',')
    )
  ];

  return csvRows.join('\n');
}

function transformXmlToJson(parsedXml) {
  const ns = parsedXml['NFSe'];
  const inf = ns?.infNFSe?.[0] || {};

  const emit = inf.emit?.[0] || {};
  const valores = inf.valores?.[0] || {};
  const dps = inf.DPS?.[0]?.infDPS?.[0] || {};
  const serv = dps.serv?.[0] || {};
  const valoresDPS = dps.valores?.[0] || {};
  const prest = dps.prest?.[0] || {};
  const toma = dps.toma?.[0] || {};

  return {
    NumeroNFSe: inf.nNFSe?.[0] || '',
    DataEmissao: dps.dhEmi?.[0] || '',
    CNPJEmitente: emit.CNPJ?.[0] || '',
    NomeEmitente: emit.xNome?.[0] || '',
    CNPJPrestador: prest.CNPJ?.[0] || '',
    CNPJTomador: toma.CNPJ?.[0] || '',
    NomeTomador: toma.xNome?.[0] || '',
    DescricaoServico: serv.cServ?.[0]?.xDescServ?.[0] || '',
    ValorServico: valoresDPS.vServPrest?.[0]?.vServ?.[0] || '',
    ValorLiquido: valores.vLiq?.[0] || '',
    MunicipioPrestacao: inf.xLocPrestacao?.[0] || '',
    MunicipioIncidencia: inf.xLocIncid?.[0] || '',
    EmailEmitente: emit.email?.[0] || '',
    EmailPrestador: prest.email?.[0] || ''
  };
}

module.exports = {
    parse,
    transformXmlToJson
};