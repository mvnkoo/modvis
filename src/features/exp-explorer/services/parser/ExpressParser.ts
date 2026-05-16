import type {
  ExpressParseResult,
  ExpressParseError,
  ExpressParseWarning,
} from '../types/ExpressBaseTypes';
import { normalizeExpress } from './normalize';
import { extractSchemaName } from './parseSchema';
import { parseEntities } from './parseEntity';
import { parseTypes } from './parseType';
import { buildAttributeRelations } from './buildRelations';
import { detectTypePairs } from './detectTypePairs';

/**
 * High-level Parser-Facade für EXPRESS-Schemas (ISO 10303-11).
 * Spiegelt die Form von IliParser im ili-explorer: input string → result.
 */
export class ExpressParser {
  parseContent(content: string | null | undefined): ExpressParseResult {
    const errors: ExpressParseError[] = [];
    const warnings: ExpressParseWarning[] = [];

    if (!content || !content.trim()) {
      return { nodes: [], relations: [], errors, warnings };
    }

    const normalized = normalizeExpress(content);
    const schemaName = extractSchemaName(normalized);

    const typeNodes = parseTypes(normalized);
    const { nodes: entityNodes, relations: subtypeRels } = parseEntities(normalized);
    const allNodes = [...entityNodes, ...typeNodes];

    const attrRels = buildAttributeRelations(allNodes);
    const pairRels = detectTypePairs(allNodes);

    if (entityNodes.length === 0 && typeNodes.length === 0) {
      warnings.push({
        message:
          'No ENTITY / TYPE definitions found — is this really an EXPRESS schema?',
      });
    }

    return {
      schemaName,
      nodes: allNodes,
      relations: [...subtypeRels, ...attrRels, ...pairRels],
      errors,
      warnings,
    };
  }
}
