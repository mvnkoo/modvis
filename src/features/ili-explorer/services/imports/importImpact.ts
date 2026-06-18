import type { Node, Edge } from '@xyflow/react';

export interface ImportImpactRow {
  /** Lokaler Klassenname, der auf das Import-Modell zugreift */
  localClassName: string;
  /** Vollqualifizierte ID der lokalen Klasse */
  localClassId: string;
  /** Name der referenzierten Klasse aus dem Import-Modell */
  importedClassName: string;
  /** Beziehungstyp */
  via: 'EXTENDS' | 'REFERENCES' | 'CONTAINS' | 'ASSOCIATION';
  /** Bei ASSOCIATION: Name der Assoziation */
  associationName?: string;
}

export interface UnresolvedRef {
  /** Erwartete vollqualifizierte ID (z.B. "ModelA.Topic.Foo") */
  qualified: string;
  /** Letzte Komponente (z.B. "Foo") */
  className: string;
}

export interface ImportImpact {
  modelName: string;
  /** Wie viele eigene Klassen erweitern eine Klasse aus diesem Import? */
  extendsCount: number;
  /** Wie viele eigene Klassen referenzieren? */
  referencesCount: number;
  /** Wie viele eigene Klassen enthalten (CONTAINS, BAG OF, LIST OF)? */
  containsCount: number;
  /** Wie viele Associations binden an dieses Import-Modell? */
  associationsCount: number;
  /** Wie viele importierte Klassen wurden in deiner Datei tatsächlich verwendet? */
  usedImportedClasses: number;
  /** Ungelöste Referenzen, die auf dieses Modell zeigen (Smoking-Gun bei falschem Upload) */
  unresolved: UnresolvedRef[];
  /** Detail-Zeilen für Drilldown */
  rows: ImportImpactRow[];
}

interface NodeMeta {
  id: string;
  label: string;
  sourceModel?: string;
  isFromImport: boolean;
  isExternal: boolean;
  externalSource?: string;
  type: string;
  association?: { name?: string; sourceClass?: string; targetClass?: string };
}

function toMeta(n: Node): NodeMeta {
  const d = n.data as Record<string, unknown> | undefined;
  return {
    id: n.id,
    label: typeof d?.label === 'string' ? (d.label as string) : n.id,
    sourceModel: d?.sourceModel as string | undefined,
    isFromImport: d?.isFromImport === true,
    isExternal: d?.isExternal === true,
    externalSource: d?.externalSource as string | undefined,
    type: n.type ?? '',
    association: d?.association as NodeMeta['association'],
  };
}

/**
 * Pro Import-Modell: zähle die Touchpoints zur primären Datei.
 *
 * - `extendsCount` etc.: Anzahl _lokaler_ (= isFromImport === false) Klassen,
 *   die via EXTENDS/REFERENCES/CONTAINS auf eine Klasse mit sourceModel === imp
 *   zeigen.
 * - `unresolved`: Klassen mit isExternal === true, deren externalSource auf
 *   imp deutet — diese sollten durch das Laden des Imports verschwinden;
 *   tun sie es nicht, ist der Upload inhaltlich falsch oder der Import-Name
 *   stimmt nicht.
 */
export function computeImportImpact(
  importNames: string[],
  allNodes: Node[],
  allEdges: Edge[],
): Map<string, ImportImpact> {
  const out = new Map<string, ImportImpact>();
  if (importNames.length === 0) return out;

  const metas = allNodes.map(toMeta);
  const metaById = new Map(metas.map(m => [m.id, m]));

  for (const imp of importNames) {
    out.set(imp, {
      modelName: imp,
      extendsCount: 0,
      referencesCount: 0,
      containsCount: 0,
      associationsCount: 0,
      usedImportedClasses: 0,
      unresolved: [],
      rows: [],
    });
  }

  // Pro Import: welche kanonischen IDs zählen zu diesem Modell?
  const idsByImport = new Map<string, Set<string>>();
  for (const imp of importNames) idsByImport.set(imp, new Set());
  for (const m of metas) {
    if (m.isFromImport && m.sourceModel && idsByImport.has(m.sourceModel)) {
      idsByImport.get(m.sourceModel)!.add(m.id);
    }
  }

  // Touchpoints aus relations / edges sammeln. Edges tragen relationType im data.
  const usedPerImport = new Map<string, Set<string>>();
  for (const imp of importNames) usedPerImport.set(imp, new Set());

  for (const e of allEdges) {
    const rel = (e.data as { relationType?: string } | undefined)?.relationType;
    if (!rel) continue;
    const src = metaById.get(e.source);
    const tgt = metaById.get(e.target);
    if (!src || !tgt) continue;
    if (src.isFromImport) continue; // nur "von lokal nach Import" zählen
    if (!tgt.isFromImport || !tgt.sourceModel) continue;
    const impact = out.get(tgt.sourceModel);
    if (!impact) continue;

    if (rel === 'EXTENDS') impact.extendsCount += 1;
    else if (rel === 'REFERENCES') impact.referencesCount += 1;
    else if (rel === 'CONTAINS') impact.containsCount += 1;
    else if (rel === 'ASSOCIATES') impact.associationsCount += 1;
    else continue;

    impact.rows.push({
      localClassName: src.label,
      localClassId: src.id,
      importedClassName: tgt.label,
      via: rel === 'ASSOCIATES' ? 'ASSOCIATION' : (rel as 'EXTENDS' | 'REFERENCES' | 'CONTAINS'),
    });
    usedPerImport.get(tgt.sourceModel)!.add(tgt.id);
  }

  // ASSOCIATION-Nodes durchsehen — Assoc-Verlinkungen sind nicht immer als
  // 'ASSOCIATES'-Edge erfasst, sondern stecken im node.data.association.
  for (const m of metas) {
    if (m.type !== 'associationNode' || !m.association) continue;
    const src = m.association.sourceClass ? metaById.get(m.association.sourceClass) : undefined;
    const tgt = m.association.targetClass ? metaById.get(m.association.targetClass) : undefined;
    // Wenn eine Seite lokal ist, andere aus Import → zählen.
    const sides = [src, tgt].filter(Boolean) as NodeMeta[];
    const localSide = sides.find(s => !s.isFromImport);
    const importedSide = sides.find(s => s.isFromImport && s.sourceModel);
    if (!localSide || !importedSide || !importedSide.sourceModel) continue;
    const impact = out.get(importedSide.sourceModel);
    if (!impact) continue;
    // Doppelte Zählung vermeiden — wir erhöhen associationsCount nur, wenn
    // die ASSOCIATES-Edge oben nicht schon mitgezählt hat. Da wir die
    // ASSOCIATES-Edge ggf. gar nicht haben, ist die Heuristik: ein lokaler
    // Assoc-Endpoint pro Assoc-Node = +1.
    impact.associationsCount += 1;
    impact.rows.push({
      localClassName: localSide.label,
      localClassId: localSide.id,
      importedClassName: importedSide.label,
      via: 'ASSOCIATION',
      associationName: m.association.name ?? m.label,
    });
    usedPerImport.get(importedSide.sourceModel)!.add(importedSide.id);
  }

  // Ungelöste Referenzen: External-Platzhalter, die thematisch zu einem Import
  // gehören (externalSource startet mit dem Modellnamen, oder die qualifizierte
  // ID enthält ihn).
  for (const m of metas) {
    if (!m.isExternal) continue;
    for (const imp of importNames) {
      const src = m.externalSource ?? '';
      if (src === imp || src.startsWith(`${imp}.`) || m.id.startsWith(`${imp}.`)) {
        out.get(imp)!.unresolved.push({
          qualified: m.id,
          className: m.label,
        });
        break;
      }
    }
  }

  // usedImportedClasses berechnen
  for (const imp of importNames) {
    out.get(imp)!.usedImportedClasses = usedPerImport.get(imp)!.size;
  }

  return out;
}
