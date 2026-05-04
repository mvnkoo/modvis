import type { IliCstParserBuilder } from '../parser';
import {
  Topic, End, Equals, Semicolon, Comma,
  Identifier,
  Constraints, Of, Depends, On, Oid, As, Basket,
} from '../tokens';

export function registerTopicRules(p: IliCstParserBuilder): void {
  p.topicDef = p.RULE('topicDef', () => {
    p.CONSUME(Topic);
    p.CONSUME(Identifier, { LABEL: 'topicName' });
    p.OPTION3(() => p.SUBRULE(p.classModifier));
    p.OPTION(() => p.SUBRULE(p.extendsClause));
    p.CONSUME(Equals);
    p.MANY(() => {
      p.OR([
        { ALT: () => p.SUBRULE(p.classDef) },
        { ALT: () => p.SUBRULE(p.structureDef) },
        { ALT: () => p.SUBRULE(p.enumerationDef) },
        { ALT: () => p.SUBRULE(p.domainSection) },
        { ALT: () => p.SUBRULE(p.associationDef) },
        { ALT: () => p.SUBRULE(p.basketOidDecl) },
        { ALT: () => p.SUBRULE(p.topicOidDecl) },
        { ALT: () => p.SUBRULE(p.dependsOnDecl) },
        { ALT: () => p.SUBRULE(p.constraintsOfBlock) },
        { ALT: () => p.SUBRULE(p.functionDef) },
        { ALT: () => p.SUBRULE(p.viewDef) },
        { ALT: () => p.SUBRULE(p.graphicSkipDef) },
        { ALT: () => p.SUBRULE(p.refsystemBasketSkipDef) },
        { ALT: () => p.SUBRULE(p.signBasketSkipDef) },
        { ALT: () => p.SUBRULE(p.parameterSkipDef) },
      ]);
    });
    p.CONSUME(End);
    p.CONSUME2(Identifier, { LABEL: 'topicEndName' });
    p.CONSUME(Semicolon);
  });

  p.constraintsOfBlock = p.RULE('constraintsOfBlock', () => {
    p.CONSUME(Constraints);
    p.CONSUME(Of);
    p.SUBRULE(p.qualifiedName);
    p.CONSUME(Equals);
    p.MANY(() => p.SUBRULE(p.constraintClause));
    p.CONSUME(End);
    p.CONSUME(Semicolon);
  });

  p.dependsOnDecl = p.RULE('dependsOnDecl', () => {
    p.CONSUME(Depends);
    p.CONSUME(On);
    p.SUBRULE(p.qualifiedName);
    p.MANY(() => {
      p.CONSUME(Comma);
      p.SUBRULE2(p.qualifiedName);
    });
    p.CONSUME(Semicolon);
  });

  p.topicOidDecl = p.RULE('topicOidDecl', () => {
    p.CONSUME(Oid);
    p.CONSUME(As);
    p.SUBRULE(p.qualifiedName);
    p.CONSUME(Semicolon);
  });

  p.basketOidDecl = p.RULE('basketOidDecl', () => {
    p.CONSUME(Basket);
    p.CONSUME(Oid);
    p.CONSUME(As);
    p.SUBRULE(p.qualifiedName);
    p.CONSUME(Semicolon);
  });
}
