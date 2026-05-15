import type { IliCstParserBuilder } from '../cstParser';
import {
  Identifier, NumberLiteral, StringLiteral,
  Comma, Colon, Semicolon, ColonEquals,
  LParen, RParen, LBrace, RBrace, LBracket, RBracket,
  Mandatory, Extended, Abstract, Final, Transient,
  Text, MText, Numeric, Boolean, Date, DateTime,
  Reference, To, External, AnyClass, AnyStructure,
  Bag, List, Of,
  Coord, MultiCoord, Polyline, MultiPolyline,
  Surface, MultiSurface, Area, MultiArea,
  Star, Minus, DotDot,
  Oid, Continuous, Subdivision,
  Circular, Clockwise, Counterclockwise, Refsys,
} from '../tokens';

export function registerAttributeRules(p: IliCstParserBuilder): void {
  p.attributeDef = p.RULE('attributeDef', () => {
    p.OPTION4(() => {
      p.OPTION(() => p.CONSUME(Continuous));
      p.CONSUME(Subdivision);
    });
    p.CONSUME(Identifier, { LABEL: 'attrName' });
    p.OPTION5(() => p.SUBRULE(p.attributeProperties));
    p.CONSUME(Colon);
    p.OR([
      {
        ALT: () => {
          p.CONSUME(Mandatory);
          p.OPTION2(() => p.SUBRULE(p.attributeType));
        },
      },
      { ALT: () => p.SUBRULE2(p.attributeType) },
    ]);
    p.OPTION3(() => {
      p.CONSUME(ColonEquals);
      p.MANY(() => p.SUBRULE(p.geometryBodyToken));
    });
    p.CONSUME(Semicolon);
  });

  p.attributeProperties = p.RULE('attributeProperties', () => {
    p.CONSUME(LParen);
    p.SUBRULE(p.attributeProp);
    p.MANY(() => {
      p.CONSUME(Comma);
      p.SUBRULE2(p.attributeProp);
    });
    p.CONSUME(RParen);
  });

  p.attributeProp = p.RULE('attributeProp', () => {
    p.OR([
      { ALT: () => p.CONSUME(Abstract) },
      { ALT: () => p.CONSUME(Extended) },
      { ALT: () => p.CONSUME(Final) },
      { ALT: () => p.CONSUME(Transient) },
    ]);
  });

  p.attributeType = p.RULE('attributeType', () => {
    p.OR([
      { ALT: () => p.SUBRULE(p.textType) },
      { ALT: () => p.SUBRULE(p.mtextType) },
      { ALT: () => p.SUBRULE(p.numericType) },
      { ALT: () => p.SUBRULE(p.numericRange) },
      { ALT: () => p.CONSUME(Boolean) },
      { ALT: () => p.CONSUME(Date) },
      { ALT: () => p.CONSUME(DateTime) },
      { ALT: () => p.SUBRULE(p.referenceType) },
      { ALT: () => p.SUBRULE(p.oidDomainType) },
      { ALT: () => p.SUBRULE(p.collectionType) },
      { ALT: () => p.SUBRULE(p.geometryType) },
      { ALT: () => p.SUBRULE(p.enumValueList) },
      { ALT: () => p.SUBRULE(p.formatType) },
      { ALT: () => p.SUBRULE(p.qualifiedName) },
    ]);
  });

  p.referenceType = p.RULE('referenceType', () => {
    p.CONSUME(Reference);
    p.CONSUME(To);
    p.OPTION(() => {
      p.CONSUME(LParen);
      p.CONSUME(External);
      p.CONSUME(RParen);
    });
    p.OR([
      { ALT: () => p.CONSUME(AnyClass) },
      { ALT: () => p.SUBRULE(p.qualifiedName) },
    ]);
    p.OPTION2(() => p.SUBRULE(p.restrictionClause));
  });

  p.oidDomainType = p.RULE('oidDomainType', () => {
    p.CONSUME(Oid);
    p.OR([
      { ALT: () => p.SUBRULE(p.textType) },
      { ALT: () => p.SUBRULE(p.numericType) },
      { ALT: () => p.SUBRULE(p.qualifiedName) },
    ]);
  });

  p.collectionType = p.RULE('collectionType', () => {
    p.OR([
      { ALT: () => p.CONSUME(Bag) },
      { ALT: () => p.CONSUME(List) },
    ]);
    p.OPTION(() => p.SUBRULE(p.cardinality));
    p.CONSUME(Of);
    p.OR2([
      { ALT: () => p.CONSUME(AnyStructure) },
      { ALT: () => p.SUBRULE(p.qualifiedName) },
    ]);
    p.OPTION2(() => p.SUBRULE(p.restrictionClause));
  });

  p.textType = p.RULE('textType', () => {
    p.CONSUME(Text);
    p.OPTION(() => {
      p.CONSUME(Star);
      p.CONSUME(NumberLiteral);
    });
  });

  p.mtextType = p.RULE('mtextType', () => {
    p.CONSUME(MText);
    p.OPTION(() => {
      p.CONSUME(Star);
      p.CONSUME(NumberLiteral);
    });
  });

  p.numericType = p.RULE('numericType', () => {
    p.CONSUME(Numeric);
    p.OPTION(() => p.SUBRULE(p.numericRange));
  });

  p.numericRange = p.RULE('numericRange', () => {
    p.SUBRULE(p.signedNumber, { LABEL: 'min' });
    p.CONSUME(DotDot);
    p.SUBRULE2(p.signedNumber, { LABEL: 'max' });
    p.OPTION4(() => p.CONSUME(Circular));
    p.OPTION(() => p.SUBRULE(p.unitRef));
    p.OPTION2(() => p.SUBRULE(p.refsysSuffix));
  });

  p.refsysSuffix = p.RULE('refsysSuffix', () => {
    p.OR([
      { ALT: () => p.CONSUME(Clockwise) },
      { ALT: () => p.CONSUME(Counterclockwise) },
      {
        ALT: () => {
          p.CONSUME(Refsys);
          p.OR2([
            { ALT: () => p.CONSUME(StringLiteral) },
            { ALT: () => p.SUBRULE(p.qualifiedName) },
          ]);
        },
      },
    ]);
  });

  p.signedNumber = p.RULE('signedNumber', () => {
    p.OPTION(() => p.CONSUME(Minus));
    p.CONSUME(NumberLiteral);
  });

  p.unitRef = p.RULE('unitRef', () => {
    p.CONSUME(LBracket);
    p.SUBRULE(p.qualifiedName);
    p.CONSUME(RBracket);
  });

  p.geometryType = p.RULE('geometryType', () => {
    p.OR([
      { ALT: () => p.CONSUME(Coord) },
      { ALT: () => p.CONSUME(MultiCoord) },
      { ALT: () => p.CONSUME(Polyline) },
      { ALT: () => p.CONSUME(MultiPolyline) },
      { ALT: () => p.CONSUME(Surface) },
      { ALT: () => p.CONSUME(MultiSurface) },
      { ALT: () => p.CONSUME(Area) },
      { ALT: () => p.CONSUME(MultiArea) },
    ]);
    p.MANY(() => p.SUBRULE(p.geometryBodyToken));
  });

  p.cardinality = p.RULE('cardinality', () => {
    p.CONSUME(LBrace);
    p.SUBRULE(p.cardinalityValue, { LABEL: 'min' });
    p.OPTION(() => {
      p.CONSUME(DotDot);
      p.SUBRULE2(p.cardinalityValue, { LABEL: 'max' });
    });
    p.CONSUME(RBrace);
  });

  p.cardinalityValue = p.RULE('cardinalityValue', () => {
    p.OR([
      { ALT: () => p.CONSUME(NumberLiteral) },
      { ALT: () => p.CONSUME(Star) },
    ]);
  });
}
