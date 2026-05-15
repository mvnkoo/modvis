import { CstParser, IToken } from 'chevrotain';
import { allTokens } from './tokens';
import { registerTopLevelRules } from './grammar/topLevel';
import { registerTopicRules } from './grammar/topic';
import { registerClassRules } from './grammar/class';
import { registerAttributeRules } from './grammar/attribute';
import { registerDomainRules } from './grammar/domain';
import { registerConstraintRules } from './grammar/constraints';
import { registerUnitsRules } from './grammar/units';
import { registerAdvancedRules } from './grammar/advanced';

export type IliCstParserBuilder = IliCstParser & {
  RULE: (...args: any[]) => any;
  OPTION: (...args: any[]) => any;
  OPTION2: (...args: any[]) => any;
  OPTION3: (...args: any[]) => any;
  OPTION4: (...args: any[]) => any;
  OPTION5: (...args: any[]) => any;
  OPTION6: (...args: any[]) => any;
  MANY: (...args: any[]) => any;
  MANY2: (...args: any[]) => any;
  MANY3: (...args: any[]) => any;
  AT_LEAST_ONE: (...args: any[]) => any;
  CONSUME: (...args: any[]) => any;
  CONSUME2: (...args: any[]) => any;
  CONSUME3: (...args: any[]) => any;
  CONSUME4: (...args: any[]) => any;
  CONSUME5: (...args: any[]) => any;
  CONSUME6: (...args: any[]) => any;
  SUBRULE: (...args: any[]) => any;
  SUBRULE2: (...args: any[]) => any;
  SUBRULE3: (...args: any[]) => any;
  SUBRULE4: (...args: any[]) => any;
  SUBRULE5: (...args: any[]) => any;
  SUBRULE6: (...args: any[]) => any;
  SUBRULE7: (...args: any[]) => any;
  OR: (...args: any[]) => any;
  OR2: (...args: any[]) => any;
  OR3: (...args: any[]) => any;
  LA: (n: number) => IToken;
};

export class IliCstParser extends CstParser {
  iliFile!: any;
  interlisVersionDecl!: any;
  modelDef!: any;
  modelHeaderBits!: any;
  languageTag!: any;
  versionClause!: any;
  atClause!: any;
  translationClause!: any;
  importsClause!: any;
  qualifiedName!: any;
  identifierLike!: any;

  topicDef!: any;
  constraintsOfBlock!: any;
  dependsOnDecl!: any;
  topicOidDecl!: any;
  basketOidDecl!: any;

  classDef!: any;
  structureDef!: any;
  associationDef!: any;
  roleDef!: any;
  roleProp!: any;
  restrictionClause!: any;
  classModifier!: any;
  extendsClause!: any;
  oidClause!: any;
  noOidClause!: any;

  attributeDef!: any;
  attributeProperties!: any;
  attributeProp!: any;
  attributeType!: any;
  referenceType!: any;
  oidDomainType!: any;
  collectionType!: any;
  textType!: any;
  mtextType!: any;
  numericType!: any;
  numericRange!: any;
  refsysSuffix!: any;
  signedNumber!: any;
  unitRef!: any;
  geometryType!: any;
  cardinality!: any;
  cardinalityValue!: any;

  domainSection!: any;
  domainDef!: any;
  domainProperties!: any;
  domainProp!: any;
  domainConstraintsClause!: any;
  formatType!: any;
  allOfClause!: any;
  enumerationDef!: any;
  enumValueList!: any;
  enumValue!: any;

  constraintClause!: any;
  geometryBodyToken!: any;

  unitSection!: any;
  unitDef!: any;
  skipStatement!: any;

  skipBodyToken!: any;
  parenContents!: any;
  functionDef!: any;
  functionArg!: any;
  viewDef!: any;
  formationDef!: any;
  renamedViewableRef!: any;
  graphicSkipDef!: any;
  refsystemBasketSkipDef!: any;
  signBasketSkipDef!: any;
  parameterSkipDef!: any;

  constructor() {
    super(allTokens, {
      recoveryEnabled: true,
      maxLookahead: 4,
    });

    const b = this as unknown as IliCstParserBuilder;
    registerTopLevelRules(b);
    registerTopicRules(b);
    registerClassRules(b);
    registerAttributeRules(b);
    registerDomainRules(b);
    registerConstraintRules(b);
    registerUnitsRules(b);
    registerAdvancedRules(b);

    this.performSelfAnalysis();
  }
}

export const cstParserInstance = new IliCstParser();

export interface ParseOutcome {
  cst: ReturnType<IliCstParser['iliFile']>;
  errors: ReturnType<IliCstParser['errors']['valueOf']>;
  tokens: IToken[];
}
