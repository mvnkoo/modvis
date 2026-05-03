import { getDirectRelations } from './layout/getDirectRelations';
/**
 * Thin facade over the layout module. Kept as a static class so existing
 * call sites (`IliLayoutService.getDirectRelations(...)`) and tests don't
 * need to change. New code should prefer importing `getDirectRelations`
 * directly from `./layout/getDirectRelations`.
 */
export class IliLayoutService {
  static getDirectRelations = getDirectRelations;
}
