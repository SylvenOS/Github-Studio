import { cards } from './cards';
import { COMMON_PARAMS, type ParamDoc } from './core/params';
import { themes } from './themes';

const schema = (p: ParamDoc) => {
  const options = p.name === 'theme' ? ['auto', ...Object.keys(themes)] : p.options;
  switch (p.type) {
    case 'number':
      return { type: 'integer', minimum: p.min, maximum: p.max, default: p.default };
    case 'boolean':
      return { type: 'boolean', default: p.default };
    case 'enum':
      return { type: 'string', enum: options, default: p.default };
    default:
      return { type: 'string', default: p.default };
  }
};

const parameter = (p: ParamDoc, required = false) => ({
  name: p.name,
  in: 'query',
  required,
  description: p.description,
  schema: schema(p)
});

/** OpenAPI 3 description generated from the card registry, so it can never drift from the code. */
export function buildOpenApi(origin: string, version: string) {
  const common = COMMON_PARAMS.map((p) => parameter(p, p.name === 'username'));
  const paths: Record<string, unknown> = {};

  for (const card of cards) {
    paths[`/api/${card.id}`] = {
      get: {
        operationId: card.id,
        summary: card.title,
        description: card.description,
        parameters: [...common, ...card.params.map((p) => parameter(p, p.name === 'repo'))],
        responses: {
          '200': {
            description: 'SVG image (default), JSON with `format=json`' + (card.toText ? ', or plain text with `format=text`' : ''),
            content: {
              'image/svg+xml': { schema: { type: 'string' } },
              'application/json': { schema: { type: 'object' } },
              ...(card.toText ? { 'text/plain': { schema: { type: 'string' } } } : {})
            }
          }
        }
      }
    };
  }

  paths['/api/profile'] = {
    get: {
      summary: 'Aggregated profile JSON',
      parameters: [parameter(COMMON_PARAMS[0], true), { name: 'plugins', in: 'query', description: 'Comma-separated plugin ids, or `none`', schema: { type: 'string' } }],
      responses: { '200': { description: 'GitHub data, metrics, grade, trophies and plugin data' } }
    }
  };
  paths['/api/cards'] = { get: { summary: 'Card and parameter metadata', responses: { '200': { description: 'OK' } } } };
  paths['/api/themes'] = { get: { summary: 'Theme palettes', responses: { '200': { description: 'OK' } } } };
  paths['/api/rate-limit'] = { get: { summary: 'GitHub API quota per configured token', responses: { '200': { description: 'OK' } } } };
  paths['/api/health'] = { get: { summary: 'Health check', responses: { '200': { description: 'OK' } } } };

  return {
    openapi: '3.0.3',
    info: { title: 'GitPulse API', version, description: 'Customisable GitHub stats cards as SVG, JSON and text.' },
    servers: [{ url: origin }],
    paths
  };
}
