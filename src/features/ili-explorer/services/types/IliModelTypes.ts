import { IliBaseNode, IliAttribute } from './IliBaseTypes';

export interface IliModelNode extends IliBaseNode {
  type: 'MODEL';
  version: string;
  language?: string;
  uri: string;
  topics: string[]; // References to topic IDs
}

export interface IliTopicNode extends IliBaseNode {
  type: 'TOPIC';
  modelId: string;
  dependencies?: string[];
  basketOid?: string;
  oid?: string;
}

export interface IliClassNode extends IliBaseNode {
  type: 'CLASS';
  topicId: string;
  attributes: IliAttribute[];
  inheritedAttributes?: { className: string; attributes: IliAttribute[] }[];
  superTypes?: string[];
  constraints?: string[];
  oid?: string;
  isAbstract: boolean;
  isFinal?: boolean;
  comment?: string;
}

export interface IliStructureNode extends IliBaseNode {
  type: 'STRUCTURE';
  topicId: string;
  attributes: IliAttribute[];
  superTypes?: string[];
}

export interface IliEnumNode extends IliBaseNode {
  type: 'ENUMERATION';
  enumValues: string[];
  comment?: string;
} 