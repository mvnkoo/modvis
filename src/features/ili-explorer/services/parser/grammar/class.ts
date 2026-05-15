import type { IliCstParserBuilder } from '../cstParser';
import {
  Class, Structure, Association, End, Equals, Semicolon, Comma, Colon,
  Identifier, LParen, RParen,
  Abstract, Final, Extends, Extended, External, Transient,
  Attribute, Or, Restriction,
  Oid, As, No,
  DashDash, CompositionArrow, AggregationArrow,
  Ordered,
} from '../tokens';

// Disambiguator for associationDef body: peek forward, paren-balanced, to see
// whether the next "Identifier ..." item is a roleDef (terminates at -- / -<> / -<#>)
// or an attributeDef (terminates at ':').
function isRoleAhead(p: IliCstParserBuilder): boolean {
  let i = 1;
  let depth = 0;
  while (i < 60) {
    const t = p.LA(i);
    if (!t || !t.tokenType) return false;
    if (t.tokenType === LParen) depth++;
    else if (t.tokenType === RParen) depth--;
    else if (depth === 0) {
      if (t.tokenType === DashDash
        || t.tokenType === CompositionArrow
        || t.tokenType === AggregationArrow) return true;
      if (t.tokenType === Colon || t.tokenType === Semicolon) return false;
    }
    i++;
  }
  return false;
}

export function registerClassRules(p: IliCstParserBuilder): void {
  p.classDef = p.RULE('classDef', () => {
    p.CONSUME(Class);
    p.CONSUME(Identifier, { LABEL: 'className' });
    p.OPTION(() => p.SUBRULE(p.classModifier));
    p.OPTION2(() => p.SUBRULE(p.extendsClause));
    p.OPTION3(() => p.SUBRULE(p.oidClause));
    p.CONSUME(Equals);
    p.OPTION4(() => p.CONSUME(Attribute));
    p.MANY(() => {
      p.OR([
        { ALT: () => p.SUBRULE(p.attributeDef) },
        { ALT: () => p.SUBRULE(p.constraintClause) },
        { ALT: () => p.SUBRULE(p.noOidClause) },
        { ALT: () => p.SUBRULE(p.topicOidDecl) },
        // ATTRIBUTE-Marker auch mitten im Body zulassen (nicht nur direkt nach `=`)
        { ALT: () => p.CONSUME2(Attribute) },
      ]);
    });
    p.CONSUME(End);
    p.CONSUME2(Identifier, { LABEL: 'classEndName' });
    p.CONSUME(Semicolon);
  });

  p.structureDef = p.RULE('structureDef', () => {
    p.CONSUME(Structure);
    p.CONSUME(Identifier, { LABEL: 'structName' });
    p.OPTION(() => p.SUBRULE(p.classModifier));
    p.OPTION2(() => p.SUBRULE(p.extendsClause));
    p.CONSUME(Equals);
    p.MANY(() => {
      p.OR([
        { ALT: () => p.SUBRULE(p.attributeDef) },
        { ALT: () => p.SUBRULE(p.constraintClause) },
      ]);
    });
    p.CONSUME(End);
    p.CONSUME2(Identifier, { LABEL: 'structEndName' });
    p.CONSUME(Semicolon);
  });

  p.associationDef = p.RULE('associationDef', () => {
    p.CONSUME(Association);
    p.CONSUME(Identifier, { LABEL: 'assocName' });
    p.OPTION(() => p.SUBRULE(p.classModifier));
    p.OPTION2(() => p.SUBRULE(p.extendsClause));
    p.OPTION3(() => p.SUBRULE(p.oidClause));
    p.CONSUME(Equals);
    p.MANY(() => {
      p.OR([
        {
          GATE: () => isRoleAhead(p),
          ALT: () => p.SUBRULE(p.roleDef),
        },
        { ALT: () => p.SUBRULE(p.constraintClause) },
        { ALT: () => p.SUBRULE(p.attributeDef) },
        { ALT: () => p.SUBRULE(p.topicOidDecl) },
      ]);
    });
    p.CONSUME(End);
    p.CONSUME2(Identifier, { LABEL: 'assocEndName' });
    p.CONSUME(Semicolon);
  });

  p.roleDef = p.RULE('roleDef', () => {
    p.CONSUME(Identifier, { LABEL: 'roleName' });
    p.OPTION(() => {
      p.CONSUME(LParen);
      p.SUBRULE(p.roleProp);
      p.MANY(() => {
        p.CONSUME(Comma);
        p.SUBRULE2(p.roleProp);
      });
      p.CONSUME(RParen);
    });
    p.OR3([
      { ALT: () => p.CONSUME(DashDash) },
      { ALT: () => p.CONSUME(CompositionArrow) },
      { ALT: () => p.CONSUME(AggregationArrow) },
    ]);
    p.OPTION2(() => p.SUBRULE(p.cardinality));
    p.SUBRULE(p.qualifiedName, { LABEL: 'targetClass' });
    p.MANY2(() => {
      p.CONSUME(Or);
      p.SUBRULE2(p.qualifiedName, { LABEL: 'targetClassAlt' });
    });
    p.OPTION3(() => p.SUBRULE(p.restrictionClause));
    p.CONSUME(Semicolon);
  });

  p.restrictionClause = p.RULE('restrictionClause', () => {
    p.CONSUME(Restriction);
    p.CONSUME(LParen);
    p.SUBRULE(p.qualifiedName);
    p.MANY(() => {
      p.CONSUME(Semicolon);
      p.SUBRULE2(p.qualifiedName);
    });
    p.CONSUME(RParen);
  });

  p.classModifier = p.RULE('classModifier', () => {
    p.CONSUME(LParen);
    p.OR([
      { ALT: () => p.CONSUME(Abstract) },
      { ALT: () => p.CONSUME(Final) },
      { ALT: () => p.CONSUME(Extended) },
    ]);
    p.CONSUME(RParen);
  });

  p.extendsClause = p.RULE('extendsClause', () => {
    p.CONSUME(Extends);
    p.SUBRULE(p.qualifiedName);
  });

  p.oidClause = p.RULE('oidClause', () => {
    p.CONSUME(Oid);
    p.CONSUME(As);
    p.OR([
      { ALT: () => p.SUBRULE(p.textType) },
      { ALT: () => p.SUBRULE(p.numericType) },
      { ALT: () => p.SUBRULE(p.qualifiedName) },
    ]);
  });

  p.noOidClause = p.RULE('noOidClause', () => {
    p.CONSUME(No);
    p.CONSUME(Oid);
    p.CONSUME(Semicolon);
  });

  p.roleProp = p.RULE('roleProp', () => {
    p.OR([
      { ALT: () => p.CONSUME(External) },
      { ALT: () => p.CONSUME(Ordered) },
      { ALT: () => p.CONSUME(Abstract) },
      { ALT: () => p.CONSUME(Final) },
      { ALT: () => p.CONSUME(Extended) },
      { ALT: () => p.CONSUME(Transient) },
      { ALT: () => p.CONSUME(Identifier) },
    ]);
  });
}
