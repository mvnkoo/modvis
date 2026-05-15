import type { IliCstParserBuilder } from '../cstParser';
import {
  Interlis, Model, End, Equals, Dot, Semicolon, Comma,
  Identifier, NumberLiteral, StringLiteral,
  LParen, RParen, LBracket, RBracket,
  Imports, Unqualified, Version, At, Translation, Of,
  Type, Refsystem, Symbology, Coordsystem, Contracted,
  Topic, View,
} from '../tokens';

export function registerTopLevelRules(p: IliCstParserBuilder): void {
  p.iliFile = p.RULE('iliFile', () => {
    p.OPTION(() => p.SUBRULE(p.interlisVersionDecl));
    p.MANY(() => p.SUBRULE(p.modelDef));
  });

  p.interlisVersionDecl = p.RULE('interlisVersionDecl', () => {
    p.CONSUME(Interlis);
    p.CONSUME(NumberLiteral);
    p.CONSUME(Semicolon);
  });

  p.modelDef = p.RULE('modelDef', () => {
    p.MANY3({
      GATE: () => {
        const t = p.LA(1);
        return t.tokenType === Type
          || t.tokenType === Refsystem
          || t.tokenType === Symbology
          || t.tokenType === Coordsystem
          || t.tokenType === Contracted;
      },
      DEF: () => p.OR3([
        { ALT: () => p.CONSUME(Type) },
        { ALT: () => p.CONSUME(Refsystem) },
        { ALT: () => p.CONSUME(Symbology) },
        { ALT: () => p.CONSUME(Coordsystem) },
        { ALT: () => p.CONSUME(Contracted) },
      ]),
    });
    p.CONSUME(Model);
    p.CONSUME(Identifier, { LABEL: 'modelName' });
    p.SUBRULE(p.modelHeaderBits);
    p.CONSUME(Equals);
    p.MANY(() => {
      p.OR([
        // `VIEW TOPIC <Name>` muss zur topicDef-Variante, nicht zur viewDef.
        {
          GATE: () => {
            const t1 = p.LA(1).tokenType;
            if (t1 === Topic) return true;
            if (t1 === View && p.LA(2).tokenType === Topic) return true;
            return false;
          },
          ALT: () => p.SUBRULE(p.topicDef),
        },
        { ALT: () => p.SUBRULE(p.domainSection) },
        { ALT: () => p.SUBRULE(p.importsClause) },
        { ALT: () => p.SUBRULE(p.unitSection) },
        { ALT: () => p.SUBRULE(p.classDef) },
        { ALT: () => p.SUBRULE(p.structureDef) },
        { ALT: () => p.SUBRULE(p.enumerationDef) },
        { ALT: () => p.SUBRULE(p.associationDef) },
        { ALT: () => p.SUBRULE(p.functionDef) },
        {
          GATE: () => p.LA(1).tokenType === View && p.LA(2).tokenType !== Topic,
          ALT: () => p.SUBRULE(p.viewDef),
        },
        { ALT: () => p.SUBRULE(p.graphicSkipDef) },
        { ALT: () => p.SUBRULE(p.parameterSkipDef) },
      ]);
    });
    p.CONSUME(End);
    p.CONSUME2(Identifier, { LABEL: 'modelEndName' });
    p.CONSUME(Dot);
  });

  p.modelHeaderBits = p.RULE('modelHeaderBits', () => {
    p.MANY(() => {
      p.OR([
        { ALT: () => p.SUBRULE(p.languageTag) },
        { ALT: () => p.SUBRULE(p.versionClause) },
        { ALT: () => p.SUBRULE(p.atClause) },
        { ALT: () => p.SUBRULE(p.translationClause) },
      ]);
    });
  });

  p.languageTag = p.RULE('languageTag', () => {
    p.CONSUME(LParen);
    p.CONSUME(Identifier);
    p.CONSUME(RParen);
  });

  p.versionClause = p.RULE('versionClause', () => {
    p.CONSUME(Version);
    p.CONSUME(StringLiteral);
  });

  p.atClause = p.RULE('atClause', () => {
    p.CONSUME(At);
    p.CONSUME(StringLiteral);
  });

  p.translationClause = p.RULE('translationClause', () => {
    p.CONSUME(Translation);
    p.CONSUME(Of);
    p.SUBRULE(p.qualifiedName);
    p.OPTION(() => {
      p.CONSUME(LBracket);
      p.CONSUME(StringLiteral);
      p.CONSUME(RBracket);
    });
  });

  p.importsClause = p.RULE('importsClause', () => {
    p.CONSUME(Imports);
    p.OPTION(() => p.CONSUME(Unqualified));
    p.SUBRULE(p.qualifiedName);
    p.MANY(() => {
      p.CONSUME(Comma);
      p.OPTION2(() => p.CONSUME2(Unqualified));
      p.SUBRULE2(p.qualifiedName);
    });
    p.CONSUME(Semicolon);
  });

  p.qualifiedName = p.RULE('qualifiedName', () => {
    p.SUBRULE(p.identifierLike);
    p.MANY(() => {
      p.CONSUME(Dot);
      p.SUBRULE2(p.identifierLike);
    });
  });

  p.identifierLike = p.RULE('identifierLike', () => {
    p.OR([
      { ALT: () => p.CONSUME(Identifier) },
      { ALT: () => p.CONSUME(Interlis) },
    ]);
  });
}
