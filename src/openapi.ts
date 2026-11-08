import { cards } from './cards';
import { COMMON_PARAMS, type ParamDoc } from './core/params';
import { PRESETS } from './readme/presets';
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
  const blockSchema = { type: 'object', description: 'One of: card, row, heading, text, badges, divider, html, details. See README for each shape.', properties: { type: { type: 'string', enum: ['card', 'row', 'heading', 'text', 'badges', 'divider', 'html', 'details'] } }, required: ['type'] };
  const specSchema = {
    type: 'object',
    required: ['username', 'blocks'],
    properties: {
      username: { type: 'string' },
      theme: { type: 'string', default: 'default' },
      dark: { type: 'string', description: 'Theme shown in GitHub dark mode (emits <picture>)' },
      align: { type: 'string', enum: ['left', 'center', 'right'], default: 'center' },
      params: { type: 'object', additionalProperties: { type: 'string' }, description: 'Query parameters applied to every card' },
      footer: { type: 'boolean', default: false },
      blocks: { type: 'array', maxItems: 60, items: blockSchema }
    }
  };
  paths['/api/readme'] = {
    get: {
      summary: 'Generate a full profile README (Markdown)',
      description: 'Use a ready-made preset, or pass a complete custom layout in `spec` (base64url-encoded JSON). `format=md` (default) returns Markdown, `html` a sandboxed preview, `json` both plus the normalised spec.',
      parameters: [
        { name: 'username', in: 'query', required: false, schema: { type: 'string' } },
        { name: 'preset', in: 'query', schema: { type: 'string', enum: PRESETS.map((p) => p.id), default: 'classic' } },
        { name: 'spec', in: 'query', description: 'base64url JSON of a README spec (overrides preset)', schema: { type: 'string' } },
        { name: 'theme', in: 'query', schema: { type: 'string' } },
        { name: 'dark', in: 'query', description: 'Theme for GitHub dark mode', schema: { type: 'string' } },
        { name: 'align', in: 'query', schema: { type: 'string', enum: ['left', 'center', 'right'] } },
        { name: 'footer', in: 'query', schema: { type: 'boolean' } },
        { name: 'base', in: 'query', description: 'Origin the generated image URLs should point at', schema: { type: 'string' } },
        { name: 'format', in: 'query', schema: { type: 'string', enum: ['md', 'html', 'json'], default: 'md' } },
        { name: 'download', in: 'query', description: 'Send as an attachment named README.md', schema: { type: 'boolean' } }
      ],
      responses: { '200': { description: 'Markdown, HTML or JSON', content: { 'text/markdown': { schema: { type: 'string' } }, 'application/json': { schema: { type: 'object' } } } } }
    },
    post: {
      summary: 'Generate a README from a JSON spec',
      requestBody: { required: true, content: { 'application/json': { schema: specSchema } } },
      parameters: [{ name: 'format', in: 'query', schema: { type: 'string', enum: ['md', 'html', 'json'], default: 'json' } }],
      responses: { '200': { description: '{ spec, markdown, html } (or Markdown/HTML per format)' } }
    }
  };
  paths['/api/presets'] = { get: { summary: 'README presets with ready-to-edit blocks', parameters: [{ name: 'username', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } } };
  paths['/api/cards'] = { get: { summary: 'Card and parameter metadata', responses: { '200': { description: 'OK' } } } };
  paths['/api/themes'] = { get: { summary: 'Theme palettes', responses: { '200': { description: 'OK' } } } };
  paths['/api/rate-limit'] = { get: { summary: 'GitHub API quota per configured token', responses: { '200': { description: 'OK' } } } };
  paths['/api/health'] = { get: { summary: 'Health check', responses: { '200': { description: 'OK' } } } };

  return {
    openapi: '3.0.3',
    info: { title: 'ProfileFoundry API', version, description: 'Customisable GitHub stats cards as SVG, JSON and text.', contact: { name: 'SylvenOS', url: 'https://sylvenos.com' }, license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' } },
    servers: [{ url: origin }],
    paths
  };
}
