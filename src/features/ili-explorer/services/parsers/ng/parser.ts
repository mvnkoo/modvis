import { CstParser, IToken } from 'chevrotain';
import { allTokens } from './tokens';
import { registerTopLevelRules } from './parser/topLevel';
import { registerTopicRules } from './parser/topic';
import { registerClassRules } from './parser/class';
import { registerAttributeRules } from './parser/attribute';
import { registerDomainRules } from './parser/domain';
import { registerConstraintRules } from './parser/constraints';
import { registerUnitsRules } from './parser/units';
import { registerAdvancedRules } from './parser/advanced';

// Public-facing builder type for use by registerXxxRules helpers.
// Chevrotain's RULE/OPTION/SUBRULE/CONSUME/OR/MANY/LA are protected on CstParser,
// which TypeScript blocks in module-external register functions.
// The builder shape exposes them — same instance, looser type.
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

  // Phase 1+ — advanced rules (skips and structured)
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
