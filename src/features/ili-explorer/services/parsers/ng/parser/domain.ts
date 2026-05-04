import type { IliCstParserBuilder } from '../parser';
import {
  Domain, Enumeration, All, Of,
  Identifier, StringLiteral,
  LParen, RParen,
  Equals, Semicolon, Comma, Extends, DotDot,
  Format, Ordered, Circular,
  Mandatory, Constraints, Colon,
  Abstract, Generic, Final,
} from '../tokens';

export function registerDomainRules(p: IliCstParserBuilder): void {
  p.domainSection = p.RULE('domainSection', () => {
    p.CONSUME(Domain);
    p.MANY(() => p.SUBRULE(p.domainDef));
  });

  p.domainDef = p.RULE('domainDef', () => {
    p.CONSUME(Identifier, { LABEL: 'domainName' });
    p.OPTION4(() => p.SUBRULE(p.domainProperties));
    p.OPTION(() => {
      p.CONSUME(Extends);
      p.SUBRULE(p.qualifiedName, { LABEL: 'extendsRef' });
    });
    p.CONSUME(Equals);
    p.OPTION2(() => p.CONSUME(Mandatory));
    p.OR([
      { ALT: () => p.SUBRULE(p.allOfClause) },
      { ALT: () => p.SUBRULE2(p.enumValueList) },
      { ALT: () => p.SUBRULE3(p.numericType) },
      { ALT: () => p.SUBRULE4(p.numericRange) },
      { ALT: () => p.SUBRULE5(p.geometryType) },
      { ALT: () => p.SUBRULE6(p.textType) },
      { ALT: () => p.SUBRULE(p.oidDomainType) },
      { ALT: () => p.SUBRULE(p.formatType) },
      { ALT: () => p.SUBRULE7(p.qualifiedName, { LABEL: 'aliasRef' }) },
    ]);
    p.OPTION3(() => p.SUBRULE(p.domainConstraintsClause));
    p.CONSUME(Semicolon);
  });

  p.domainProperties = p.RULE('domainProperties', () => {
    p.CONSUME(LParen);
    p.SUBRULE(p.domainProp);
    p.MANY(() => {
      p.CONSUME(Comma);
      p.SUBRULE2(p.domainProp);
    });
    p.CONSUME(RParen);
  });

  p.domainProp = p.RULE('domainProp', () => {
    p.OR([
      { ALT: () => p.CONSUME(Abstract) },
      { ALT: () => p.CONSUME(Generic) },
      { ALT: () => p.CONSUME(Final) },
    ]);
  });

  p.domainConstraintsClause = p.RULE('domainConstraintsClause', () => {
    p.CONSUME(Constraints);
    p.CONSUME(Identifier, { LABEL: 'constraintName' });
    p.CONSUME(Colon);
    p.MANY(() => p.SUBRULE(p.geometryBodyToken));
    p.MANY2(() => {
      p.CONSUME(Comma);
      p.CONSUME2(Identifier, { LABEL: 'constraintNameMore' });
      p.CONSUME2(Colon);
      p.MANY3(() => p.SUBRULE2(p.geometryBodyToken));
    });
  });

  p.formatType = p.RULE('formatType', () => {
    p.CONSUME(Format);
    p.OPTION(() => p.CONSUME(Identifier, { LABEL: 'formatBase' }));
    p.SUBRULE(p.qualifiedName);
    p.OPTION2(() => {
      p.CONSUME(StringLiteral, { LABEL: 'minVal' });
      p.CONSUME(DotDot);
      p.CONSUME2(StringLiteral, { LABEL: 'maxVal' });
    });
  });

  p.allOfClause = p.RULE('allOfClause', () => {
    p.CONSUME(All);
    p.CONSUME(Of);
    p.SUBRULE(p.qualifiedName, { LABEL: 'baseRef' });
  });

  p.enumerationDef = p.RULE('enumerationDef', () => {
    p.CONSUME(Enumeration);
    p.CONSUME(Identifier, { LABEL: 'enumName' });
    p.CONSUME(Equals);
    p.SUBRULE(p.enumValueList);
    p.CONSUME(Semicolon);
  });

  p.enumValueList = p.RULE('enumValueList', () => {
    p.CONSUME(LParen);
    p.OPTION(() => {
      p.SUBRULE(p.enumValue);
      p.MANY(() => {
        p.CONSUME(Comma);
        p.SUBRULE2(p.enumValue);
      });
    });
    p.CONSUME(RParen);
    p.OPTION2(() => p.OR([
      { ALT: () => p.CONSUME(Ordered) },
      { ALT: () => p.CONSUME(Circular) },
    ]));
  });

  p.enumValue = p.RULE('enumValue', () => {
    p.CONSUME(Identifier, { LABEL: 'valueName' });
    p.OPTION(() => p.SUBRULE(p.enumValueList));
  });
}
