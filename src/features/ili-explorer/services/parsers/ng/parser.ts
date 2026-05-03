import { CstParser, IToken } from 'chevrotain';
import {
  allTokens,
  Model, Topic, Class, End, Equals, Dot, DotDot, Semicolon, Comma,
  Identifier, NumberLiteral, StringLiteral,
  LParen, RParen, LBrace, RBrace, LBracket, RBracket,
  Colon,
  Mandatory, Abstract, Final, Extends,
  Text, Numeric, Boolean, Date, DateTime, MText,
  Star, Minus, Plus, Slash, DashDash,
  ArrowLeft, ArrowRight, ArrowBoth,
  Less, Greater, LessEqual, GreaterEqual,
  Interlis, Version,
  Enumeration,
  Domain, All, Of,
  Association, External,
  Structure, Bag, List,
  Coord, MultiCoord, Polyline, MultiPolyline,
  Surface, MultiSurface, Area, MultiArea,
  With, Without, To, From, As,
  At, Translation, Imports,
  Unit,
  Unique, Existence, Set, Constraint,
  Oid,
  Attribute, Extended, Unqualified,
  CompositionArrow, AggregationArrow,
  Reference, Basket, HashIdentifier,
  Not, And, Or, True, False, Null,
  NotEqual, EqualEqual, ColonEquals, At2,
  Tid, Type, Restriction,
  Depends, On, No, Format, In, Constraints,
  Required,
} from './tokens';

export class IliCstParser extends CstParser {
  constructor() {
    super(allTokens, {
      recoveryEnabled: true,
      maxLookahead: 4,
    });
    this.performSelfAnalysis();
  }

  iliFile = this.RULE('iliFile', () => {
    this.OPTION(() => this.SUBRULE(this.interlisVersionDecl));
    this.MANY(() => this.SUBRULE(this.modelDef));
  });

  interlisVersionDecl = this.RULE('interlisVersionDecl', () => {
    this.CONSUME(Interlis);
    this.CONSUME(NumberLiteral);
    this.CONSUME(Semicolon);
  });

  modelDef = this.RULE('modelDef', () => {
    this.CONSUME(Model);
    this.CONSUME(Identifier, { LABEL: 'modelName' });
    this.SUBRULE(this.modelHeaderBits);
    this.CONSUME(Equals);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.topicDef) },
        { ALT: () => this.SUBRULE(this.domainSection) },
        { ALT: () => this.SUBRULE(this.importsClause) },
        { ALT: () => this.SUBRULE(this.unitSection) },
        { ALT: () => this.SUBRULE(this.classDef) },
        { ALT: () => this.SUBRULE(this.structureDef) },
        { ALT: () => this.SUBRULE(this.enumerationDef) },
        { ALT: () => this.SUBRULE(this.associationDef) },
      ]);
    });
    this.CONSUME(End);
    this.CONSUME2(Identifier, { LABEL: 'modelEndName' });
    this.CONSUME(Dot);
  });

  unitSection = this.RULE('unitSection', () => {
    this.CONSUME(Unit);
    this.MANY(() => this.SUBRULE(this.skipStatement));
  });

  skipStatement = this.RULE('skipStatement', () => {
    this.AT_LEAST_ONE(() => this.SUBRULE(this.geometryBodyToken));
    this.CONSUME(Semicolon);
  });

  importsClause = this.RULE('importsClause', () => {
    this.CONSUME(Imports);
    this.OPTION(() => this.CONSUME(Unqualified));
    this.SUBRULE(this.qualifiedName);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.OPTION2(() => this.CONSUME2(Unqualified));
      this.SUBRULE2(this.qualifiedName);
    });
    this.CONSUME(Semicolon);
  });

  modelHeaderBits = this.RULE('modelHeaderBits', () => {
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.languageTag) },
        { ALT: () => this.SUBRULE(this.versionClause) },
        { ALT: () => this.SUBRULE(this.atClause) },
        { ALT: () => this.SUBRULE(this.translationClause) },
      ]);
    });
  });

  languageTag = this.RULE('languageTag', () => {
    this.CONSUME(LParen);
    this.CONSUME(Identifier);
    this.CONSUME(RParen);
  });

  versionClause = this.RULE('versionClause', () => {
    this.CONSUME(Version);
    this.CONSUME(StringLiteral);
  });

  atClause = this.RULE('atClause', () => {
    this.CONSUME(At);
    this.CONSUME(StringLiteral);
  });

  translationClause = this.RULE('translationClause', () => {
    this.CONSUME(Translation);
    this.CONSUME(Of);
    this.SUBRULE(this.qualifiedName);
    this.OPTION(() => {
      this.CONSUME(LBracket);
      this.CONSUME(StringLiteral);
      this.CONSUME(RBracket);
    });
  });

  topicDef = this.RULE('topicDef', () => {
    this.CONSUME(Topic);
    this.CONSUME(Identifier, { LABEL: 'topicName' });
    this.OPTION3(() => this.SUBRULE(this.classModifier));
    this.OPTION(() => this.SUBRULE(this.extendsClause));
    this.CONSUME(Equals);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.classDef) },
        { ALT: () => this.SUBRULE(this.structureDef) },
        { ALT: () => this.SUBRULE(this.enumerationDef) },
        { ALT: () => this.SUBRULE(this.domainSection) },
        { ALT: () => this.SUBRULE(this.associationDef) },
        { ALT: () => this.SUBRULE(this.basketOidDecl) },
        { ALT: () => this.SUBRULE(this.topicOidDecl) },
        { ALT: () => this.SUBRULE(this.dependsOnDecl) },
        { ALT: () => this.SUBRULE(this.constraintsOfBlock) },
      ]);
    });
    this.CONSUME(End);
    this.CONSUME2(Identifier, { LABEL: 'topicEndName' });
    this.CONSUME(Semicolon);
  });

  constraintsOfBlock = this.RULE('constraintsOfBlock', () => {
    this.CONSUME(Constraints);
    this.CONSUME(Of);
    this.SUBRULE(this.qualifiedName);
    this.CONSUME(Equals);
    this.MANY(() => this.SUBRULE(this.constraintClause));
    this.CONSUME(End);
    this.CONSUME(Semicolon);
  });

  dependsOnDecl = this.RULE('dependsOnDecl', () => {
    this.CONSUME(Depends);
    this.CONSUME(On);
    this.SUBRULE(this.qualifiedName);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.qualifiedName);
    });
    this.CONSUME(Semicolon);
  });

  topicOidDecl = this.RULE('topicOidDecl', () => {
    this.CONSUME(Oid);
    this.CONSUME(As);
    this.SUBRULE(this.qualifiedName);
    this.CONSUME(Semicolon);
  });

  basketOidDecl = this.RULE('basketOidDecl', () => {
    this.CONSUME(Basket);
    this.CONSUME(Oid);
    this.CONSUME(As);
    this.SUBRULE(this.qualifiedName);
    this.CONSUME(Semicolon);
  });

  structureDef = this.RULE('structureDef', () => {
    this.CONSUME(Structure);
    this.CONSUME(Identifier, { LABEL: 'structName' });
    this.OPTION(() => this.SUBRULE(this.classModifier));
    this.OPTION2(() => this.SUBRULE(this.extendsClause));
    this.CONSUME(Equals);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.attributeDef) },
        { ALT: () => this.SUBRULE(this.constraintClause) },
      ]);
    });
    this.CONSUME(End);
    this.CONSUME2(Identifier, { LABEL: 'structEndName' });
    this.CONSUME(Semicolon);
  });

  collectionType = this.RULE('collectionType', () => {
    this.OR([
      { ALT: () => this.CONSUME(Bag) },
      { ALT: () => this.CONSUME(List) },
    ]);
    this.OPTION(() => this.SUBRULE(this.cardinality));
    this.CONSUME(Of);
    this.SUBRULE(this.qualifiedName);
  });

  associationDef = this.RULE('associationDef', () => {
    this.CONSUME(Association);
    this.CONSUME(Identifier, { LABEL: 'assocName' });
    this.OPTION(() => this.SUBRULE(this.classModifier));
    this.OPTION2(() => this.SUBRULE(this.extendsClause));
    this.OPTION3(() => this.SUBRULE(this.oidClause));
    this.CONSUME(Equals);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.roleDef) },
        { ALT: () => this.SUBRULE(this.constraintClause) },
        { ALT: () => this.SUBRULE(this.attributeDef) },
        { ALT: () => this.SUBRULE(this.topicOidDecl) },
      ]);
    });
    this.CONSUME(End);
    this.CONSUME2(Identifier, { LABEL: 'assocEndName' });
    this.CONSUME(Semicolon);
  });

  roleDef = this.RULE('roleDef', () => {
    this.CONSUME(Identifier, { LABEL: 'roleName' });
    this.OPTION(() => {
      this.CONSUME(LParen);
      this.OR([
        { ALT: () => this.CONSUME(External) },
        { ALT: () => this.CONSUME2(Identifier, { LABEL: 'roleModifier' }) },
      ]);
      this.MANY(() => {
        this.CONSUME(Comma);
        this.OR2([
          { ALT: () => this.CONSUME2(External) },
          { ALT: () => this.CONSUME3(Identifier, { LABEL: 'roleModifierMore' }) },
        ]);
      });
      this.CONSUME(RParen);
    });
    this.OR3([
      { ALT: () => this.CONSUME(DashDash) },
      { ALT: () => this.CONSUME(CompositionArrow) },
      { ALT: () => this.CONSUME(AggregationArrow) },
    ]);
    this.OPTION2(() => this.SUBRULE(this.cardinality));
    this.SUBRULE(this.qualifiedName, { LABEL: 'targetClass' });
    this.MANY2(() => {
      this.CONSUME(Or);
      this.SUBRULE2(this.qualifiedName, { LABEL: 'targetClassAlt' });
    });
    this.OPTION3(() => this.SUBRULE(this.restrictionClause));
    this.CONSUME(Semicolon);
  });

  restrictionClause = this.RULE('restrictionClause', () => {
    this.CONSUME(Restriction);
    this.CONSUME(LParen);
    this.SUBRULE(this.qualifiedName);
    this.MANY(() => {
      this.CONSUME(Semicolon);
      this.SUBRULE2(this.qualifiedName);
    });
    this.CONSUME(RParen);
  });

  domainSection = this.RULE('domainSection', () => {
    this.CONSUME(Domain);
    this.MANY(() => this.SUBRULE(this.domainDef));
  });

  domainDef = this.RULE('domainDef', () => {
    this.CONSUME(Identifier, { LABEL: 'domainName' });
    this.OPTION(() => {
      this.CONSUME(Extends);
      this.SUBRULE(this.qualifiedName, { LABEL: 'extendsRef' });
    });
    this.CONSUME(Equals);
    this.OR([
      { ALT: () => this.SUBRULE(this.allOfClause) },
      { ALT: () => this.SUBRULE2(this.enumValueList) },
      { ALT: () => this.SUBRULE3(this.numericType) },
      { ALT: () => this.SUBRULE4(this.numericRange) },
      { ALT: () => this.SUBRULE5(this.geometryType) },
      { ALT: () => this.SUBRULE6(this.textType) },
      { ALT: () => this.SUBRULE(this.oidDomainType) },
      { ALT: () => this.SUBRULE(this.formatType) },
      { ALT: () => this.SUBRULE7(this.qualifiedName, { LABEL: 'aliasRef' }) },
    ]);
    this.CONSUME(Semicolon);
  });

  formatType = this.RULE('formatType', () => {
    this.CONSUME(Format);
    this.OPTION(() => this.CONSUME(Identifier, { LABEL: 'formatBase' }));
    this.SUBRULE(this.qualifiedName);
    this.OPTION2(() => {
      this.CONSUME(StringLiteral, { LABEL: 'minVal' });
      this.CONSUME(DotDot);
      this.CONSUME2(StringLiteral, { LABEL: 'maxVal' });
    });
  });

  oidDomainType = this.RULE('oidDomainType', () => {
    this.CONSUME(Oid);
    this.OR([
      { ALT: () => this.SUBRULE(this.textType) },
      { ALT: () => this.SUBRULE(this.numericType) },
      { ALT: () => this.SUBRULE(this.qualifiedName) },
    ]);
  });

  allOfClause = this.RULE('allOfClause', () => {
    this.CONSUME(All);
    this.CONSUME(Of);
    this.SUBRULE(this.qualifiedName, { LABEL: 'baseRef' });
  });

  enumerationDef = this.RULE('enumerationDef', () => {
    this.CONSUME(Enumeration);
    this.CONSUME(Identifier, { LABEL: 'enumName' });
    this.CONSUME(Equals);
    this.SUBRULE(this.enumValueList);
    this.CONSUME(Semicolon);
  });

  enumValueList = this.RULE('enumValueList', () => {
    this.CONSUME(LParen);
    this.OPTION(() => {
      this.SUBRULE(this.enumValue);
      this.MANY(() => {
        this.CONSUME(Comma);
        this.SUBRULE2(this.enumValue);
      });
    });
    this.CONSUME(RParen);
    this.OPTION2({
      GATE: () => {
        const t = this.LA(1);
        return t.tokenType === Identifier && (t.image === 'ORDERED' || t.image === 'CIRCULAR');
      },
      DEF: () => this.CONSUME2(Identifier, { LABEL: 'enumModifier' }),
    });
  });

  enumValue = this.RULE('enumValue', () => {
    this.CONSUME(Identifier, { LABEL: 'valueName' });
    this.OPTION(() => this.SUBRULE(this.enumValueList));
  });

  classDef = this.RULE('classDef', () => {
    this.CONSUME(Class);
    this.CONSUME(Identifier, { LABEL: 'className' });
    this.OPTION(() => this.SUBRULE(this.classModifier));
    this.OPTION2(() => this.SUBRULE(this.extendsClause));
    this.OPTION3(() => this.SUBRULE(this.oidClause));
    this.CONSUME(Equals);
    this.OPTION4(() => this.CONSUME(Attribute));
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.attributeDef) },
        { ALT: () => this.SUBRULE(this.constraintClause) },
        { ALT: () => this.SUBRULE(this.noOidClause) },
      ]);
    });
    this.CONSUME(End);
    this.CONSUME2(Identifier, { LABEL: 'classEndName' });
    this.CONSUME(Semicolon);
  });

  noOidClause = this.RULE('noOidClause', () => {
    this.CONSUME(No);
    this.CONSUME(Oid);
    this.CONSUME(Semicolon);
  });

  oidClause = this.RULE('oidClause', () => {
    this.CONSUME(Oid);
    this.CONSUME(As);
    this.OR([
      { ALT: () => this.SUBRULE(this.textType) },
      { ALT: () => this.SUBRULE(this.numericType) },
      { ALT: () => this.SUBRULE(this.qualifiedName) },
    ]);
  });

  constraintClause = this.RULE('constraintClause', () => {
    this.OR([
      { ALT: () => this.CONSUME(Unique) },
      { ALT: () => this.CONSUME(Mandatory) },
      { ALT: () => this.CONSUME(Existence) },
      { ALT: () => this.CONSUME(Set) },
      { ALT: () => this.CONSUME(Constraint) },
    ]);
    this.MANY(() => this.SUBRULE(this.geometryBodyToken));
    this.CONSUME(Semicolon);
  });

  classModifier = this.RULE('classModifier', () => {
    this.CONSUME(LParen);
    this.OR([
      { ALT: () => this.CONSUME(Abstract) },
      { ALT: () => this.CONSUME(Final) },
      { ALT: () => this.CONSUME(Extended) },
    ]);
    this.CONSUME(RParen);
  });

  extendsClause = this.RULE('extendsClause', () => {
    this.CONSUME(Extends);
    this.SUBRULE(this.qualifiedName);
  });

  qualifiedName = this.RULE('qualifiedName', () => {
    this.SUBRULE(this.identifierLike);
    this.MANY(() => {
      this.CONSUME(Dot);
      this.SUBRULE2(this.identifierLike);
    });
  });

  identifierLike = this.RULE('identifierLike', () => {
    this.OR([
      { ALT: () => this.CONSUME(Identifier) },
      { ALT: () => this.CONSUME(Interlis) },
    ]);
  });

  attributeDef = this.RULE('attributeDef', () => {
    this.CONSUME(Identifier, { LABEL: 'attrName' });
    this.OPTION(() => {
      this.CONSUME(LParen);
      this.CONSUME(Extended);
      this.CONSUME(RParen);
    });
    this.CONSUME(Colon);
    this.OPTION2(() => this.CONSUME(Mandatory));
    this.SUBRULE(this.attributeType);
    this.OPTION3(() => {
      this.CONSUME(ColonEquals);
      this.MANY(() => this.SUBRULE(this.geometryBodyToken));
    });
    this.CONSUME(Semicolon);
  });

  attributeType = this.RULE('attributeType', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.textType) },
      { ALT: () => this.SUBRULE(this.mtextType) },
      { ALT: () => this.SUBRULE(this.numericType) },
      { ALT: () => this.SUBRULE(this.numericRange) },
      { ALT: () => this.CONSUME(Boolean) },
      { ALT: () => this.CONSUME(Date) },
      { ALT: () => this.CONSUME(DateTime) },
      { ALT: () => this.SUBRULE(this.referenceType) },
      { ALT: () => this.SUBRULE(this.oidDomainType) },
      { ALT: () => this.SUBRULE(this.collectionType) },
      { ALT: () => this.SUBRULE(this.geometryType) },
      { ALT: () => this.SUBRULE(this.enumValueList) },
      { ALT: () => this.SUBRULE(this.qualifiedName) },
    ]);
  });

  referenceType = this.RULE('referenceType', () => {
    this.CONSUME(Reference);
    this.CONSUME(To);
    this.OPTION(() => {
      this.CONSUME(LParen);
      this.CONSUME(External);
      this.CONSUME(RParen);
    });
    this.SUBRULE(this.qualifiedName);
  });

  mtextType = this.RULE('mtextType', () => {
    this.CONSUME(MText);
    this.OPTION(() => {
      this.CONSUME(Star);
      this.CONSUME(NumberLiteral);
    });
  });

  geometryType = this.RULE('geometryType', () => {
    this.OR([
      { ALT: () => this.CONSUME(Coord) },
      { ALT: () => this.CONSUME(MultiCoord) },
      { ALT: () => this.CONSUME(Polyline) },
      { ALT: () => this.CONSUME(MultiPolyline) },
      { ALT: () => this.CONSUME(Surface) },
      { ALT: () => this.CONSUME(MultiSurface) },
      { ALT: () => this.CONSUME(Area) },
      { ALT: () => this.CONSUME(MultiArea) },
    ]);
    this.MANY(() => this.SUBRULE(this.geometryBodyToken));
  });

  geometryBodyToken = this.RULE('geometryBodyToken', () => {
    this.OR([
      { ALT: () => this.CONSUME(NumberLiteral) },
      { ALT: () => this.CONSUME(Identifier) },
      { ALT: () => this.CONSUME(HashIdentifier) },
      { ALT: () => this.CONSUME(StringLiteral) },
      { ALT: () => this.CONSUME(Interlis) },
      { ALT: () => this.CONSUME(Not) },
      { ALT: () => this.CONSUME(And) },
      { ALT: () => this.CONSUME(Or) },
      { ALT: () => this.CONSUME(True) },
      { ALT: () => this.CONSUME(False) },
      { ALT: () => this.CONSUME(Null) },
      { ALT: () => this.CONSUME(NotEqual) },
      { ALT: () => this.CONSUME(EqualEqual) },
      { ALT: () => this.CONSUME(ColonEquals) },
      { ALT: () => this.CONSUME(At2) },
      { ALT: () => this.CONSUME(Constraint) },
      { ALT: () => this.CONSUME(Unique) },
      { ALT: () => this.CONSUME(Existence) },
      { ALT: () => this.CONSUME(Set) },
      { ALT: () => this.CONSUME(Tid) },
      { ALT: () => this.CONSUME(Oid) },
      { ALT: () => this.CONSUME(Type) },
      { ALT: () => this.CONSUME(All) },
      { ALT: () => this.CONSUME(Reference) },
      { ALT: () => this.CONSUME(Bag) },
      { ALT: () => this.CONSUME(List) },
      { ALT: () => this.CONSUME(Comma) },
      { ALT: () => this.CONSUME(Dot) },
      { ALT: () => this.CONSUME(DotDot) },
      { ALT: () => this.CONSUME(Minus) },
      { ALT: () => this.CONSUME(Plus) },
      { ALT: () => this.CONSUME(Star) },
      { ALT: () => this.CONSUME(Slash) },
      { ALT: () => this.CONSUME(LParen) },
      { ALT: () => this.CONSUME(RParen) },
      { ALT: () => this.CONSUME(LBracket) },
      { ALT: () => this.CONSUME(RBracket) },
      { ALT: () => this.CONSUME(LBrace) },
      { ALT: () => this.CONSUME(RBrace) },
      { ALT: () => this.CONSUME(ArrowLeft) },
      { ALT: () => this.CONSUME(ArrowRight) },
      { ALT: () => this.CONSUME(ArrowBoth) },
      { ALT: () => this.CONSUME(DashDash) },
      { ALT: () => this.CONSUME(Less) },
      { ALT: () => this.CONSUME(Greater) },
      { ALT: () => this.CONSUME(LessEqual) },
      { ALT: () => this.CONSUME(GreaterEqual) },
      { ALT: () => this.CONSUME(With) },
      { ALT: () => this.CONSUME(Without) },
      { ALT: () => this.CONSUME(Of) },
      { ALT: () => this.CONSUME(To) },
      { ALT: () => this.CONSUME(From) },
      { ALT: () => this.CONSUME(As) },
      { ALT: () => this.CONSUME(Mandatory) },
      { ALT: () => this.CONSUME(Equals) },
      { ALT: () => this.CONSUME(Colon) },
      { ALT: () => this.CONSUME(Required) },
      { ALT: () => this.CONSUME(In) },
    ]);
  });

  textType = this.RULE('textType', () => {
    this.CONSUME(Text);
    this.OPTION(() => {
      this.CONSUME(Star);
      this.CONSUME(NumberLiteral);
    });
  });

  numericType = this.RULE('numericType', () => {
    this.CONSUME(Numeric);
    this.OPTION(() => this.SUBRULE(this.numericRange));
  });

  numericRange = this.RULE('numericRange', () => {
    this.SUBRULE(this.signedNumber, { LABEL: 'min' });
    this.CONSUME(DotDot);
    this.SUBRULE2(this.signedNumber, { LABEL: 'max' });
    this.OPTION(() => this.SUBRULE(this.unitRef));
  });

  signedNumber = this.RULE('signedNumber', () => {
    this.OPTION(() => this.CONSUME(Minus));
    this.CONSUME(NumberLiteral);
  });

  unitRef = this.RULE('unitRef', () => {
    this.CONSUME(LBracket);
    this.SUBRULE(this.qualifiedName);
    this.CONSUME(RBracket);
  });

  cardinality = this.RULE('cardinality', () => {
    this.CONSUME(LBrace);
    this.SUBRULE(this.cardinalityValue, { LABEL: 'min' });
    this.OPTION(() => {
      this.CONSUME(DotDot);
      this.SUBRULE2(this.cardinalityValue, { LABEL: 'max' });
    });
    this.CONSUME(RBrace);
  });

  cardinalityValue = this.RULE('cardinalityValue', () => {
    this.OR([
      { ALT: () => this.CONSUME(NumberLiteral) },
      { ALT: () => this.CONSUME(Star) },
    ]);
  });
}

export const cstParserInstance = new IliCstParser();

export interface ParseOutcome {
  cst: ReturnType<IliCstParser['iliFile']>;
  errors: ReturnType<IliCstParser['errors']['valueOf']>;
  tokens: IToken[];
}
