import { IliBaseNode, SearchOption } from './types/IliBaseTypes';
import { IliClassNode } from './types/IliModelTypes';

const VALID_NODE_TYPES = ['CLASS', 'STRUCTURE', 'TOPIC', 'ENUMERATION'] as const;
const CATEGORY_ORDER = ['Classes', 'Topics', 'Structures', 'Enumerations', 'Attributes'] as const;

function categoryFor(nodeType: string): string {
  switch (nodeType) {
    case 'CLASS':
      return 'Classes';
    case 'STRUCTURE':
      return 'Structures';
    case 'TOPIC':
      return 'Topics';
    default:
      return 'Enumerations';
  }
}

export function generateSearchOptions(nodes: IliBaseNode[]): SearchOption[] {
  const options: SearchOption[] = [];

  nodes.forEach(node => {
    if (node.type === 'MODEL') return;
    if (!VALID_NODE_TYPES.includes(node.type as typeof VALID_NODE_TYPES[number])) return;

    options.push({
      id: node.id,
      label: node.name,
      type: node.type,
      description: `${node.type} ${node.isAbstract ? '(Abstract)' : ''}`,
      category: categoryFor(node.type),
    });

    if (node.type === 'CLASS') {
      const classNode = node as IliClassNode;
      classNode.attributes?.forEach(attr => {
        options.push({
          id: `${node.id}.${attr.name}`,
          label: `${attr.name} (${node.name})`,
          type: 'ATTRIBUTE',
          description: `${attr.type}${attr.mandatory ? ', Mandatory' : ''}`,
          category: 'Attributes',
        });
      });
    }
  });

  return options.sort((a, b) => {
    const categoryDiff =
      CATEGORY_ORDER.indexOf(a.category as typeof CATEGORY_ORDER[number]) -
      CATEGORY_ORDER.indexOf(b.category as typeof CATEGORY_ORDER[number]);
    if (categoryDiff !== 0) return categoryDiff;
    return a.label.localeCompare(b.label);
  });
}
