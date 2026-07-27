import { describe, it, expect } from 'vitest';
import { IliParser } from '../IliParser';
import type { IliClassNode } from '../../types/IliModelTypes';

describe('parseContents: cross-file inheritance & reference resolution', () => {
  const BASE_TOPIC = `INTERLIS 2.3;
MODEL Base_LV95 AT "x" VERSION "1" =
  TOPIC Administration =
    CLASS SIA405_BaseClass (ABSTRACT) =
      Bezeichnung : MANDATORY TEXT*40;
      Datenherr : TEXT*80;
    END SIA405_BaseClass;
  END Administration;
END Base_LV95.`;

  const VSA_3LEVEL = `INTERLIS 2.3;
MODEL VSA_DSS_2020 AT "x" VERSION "1" =
  IMPORTS Base_LV95;
  TOPIC Siedlungsentwaesserung =
    CLASS VSA_BaseClass (ABSTRACT) EXTENDS Base_LV95.Administration.SIA405_BaseClass =
      Letzte_Aenderung : DATETIME;
    END VSA_BaseClass;
  END Siedlungsentwaesserung;
END VSA_DSS_2020.`;

  const BASE_MODEL_LEVEL = `INTERLIS 2.3;
MODEL SIA405_Base_Abwasser_LV95 AT "x" VERSION "1" =
  CLASS SIA405_BaseClass (ABSTRACT) =
    Bezeichnung : MANDATORY TEXT*40;
  END SIA405_BaseClass;
END SIA405_Base_Abwasser_LV95.`;

  const VSA_2LEVEL = `INTERLIS 2.3;
MODEL VSA_DSS_2020 AT "x" VERSION "1" =
  IMPORTS SIA405_Base_Abwasser_LV95;
  TOPIC Siedlungsentwaesserung =
    CLASS VSA_BaseClass (ABSTRACT) EXTENDS SIA405_Base_Abwasser_LV95.SIA405_BaseClass =
      Letzte_Aenderung : DATETIME;
    END VSA_BaseClass;
  END Siedlungsentwaesserung;
END VSA_DSS_2020.`;

  it('rewrites Model.Topic.Class EXTENDS to canonical Topic.Class', () => {
    const r = new IliParser().parseContents([
      { name: 'VSA.ili', content: VSA_3LEVEL, isPrimary: true, modelName: 'VSA_DSS_2020' },
      { name: 'Base.ili', content: BASE_TOPIC, isPrimary: false, modelName: 'Base_LV95' },
    ]);
    const ext = r.relations.find(rel =>
      rel.type === 'EXTENDS' && rel.sourceId === 'Siedlungsentwaesserung.VSA_BaseClass',
    );
    expect(ext).toBeDefined();
    expect(ext!.targetId).toBe('Administration.SIA405_BaseClass');
  });

  it('rewrites Model.Class EXTENDS for model-level classes', () => {
    const r = new IliParser().parseContents([
      { name: 'VSA.ili', content: VSA_2LEVEL, isPrimary: true, modelName: 'VSA_DSS_2020' },
      { name: 'Base.ili', content: BASE_MODEL_LEVEL, isPrimary: false, modelName: 'SIA405_Base_Abwasser_LV95' },
    ]);
    const ext = r.relations.find(rel =>
      rel.type === 'EXTENDS' && rel.sourceId === 'Siedlungsentwaesserung.VSA_BaseClass',
    );
    expect(ext).toBeDefined();
    expect(ext!.targetId).toBe('SIA405_BaseClass');
  });

  it('drops external placeholder when alias matches an imported real class', () => {
    const r = new IliParser().parseContents([
      { name: 'VSA.ili', content: VSA_3LEVEL, isPrimary: true, modelName: 'VSA_DSS_2020' },
      { name: 'Base.ili', content: BASE_TOPIC, isPrimary: false, modelName: 'Base_LV95' },
    ]);
    const externals = r.nodes.filter(n => n.data?.isExternal === true);
    expect(externals).toHaveLength(0);
  });

  it('decorates inherited attributes from cross-file parent (3-level)', () => {
    const r = new IliParser().parseContents([
      { name: 'VSA.ili', content: VSA_3LEVEL, isPrimary: true, modelName: 'VSA_DSS_2020' },
      { name: 'Base.ili', content: BASE_TOPIC, isPrimary: false, modelName: 'Base_LV95' },
    ]);
    const vsa = r.nodes.find(n => n.id === 'Siedlungsentwaesserung.VSA_BaseClass') as IliClassNode;
    const inh = vsa.inheritedAttributes ?? [];
    expect(inh).toHaveLength(1);
    expect(inh[0].className).toBe('SIA405_BaseClass');
    expect(inh[0].attributes.map(a => a.name).sort()).toEqual(['Bezeichnung', 'Datenherr']);
  });

  it('decorates inherited attributes from cross-file parent (2-level)', () => {
    const r = new IliParser().parseContents([
      { name: 'VSA.ili', content: VSA_2LEVEL, isPrimary: true, modelName: 'VSA_DSS_2020' },
      { name: 'Base.ili', content: BASE_MODEL_LEVEL, isPrimary: false, modelName: 'SIA405_Base_Abwasser_LV95' },
    ]);
    const vsa = r.nodes.find(n => n.id === 'Siedlungsentwaesserung.VSA_BaseClass') as IliClassNode;
    const inh = vsa.inheritedAttributes ?? [];
    expect(inh).toHaveLength(1);
    expect(inh[0].attributes.map(a => a.name)).toEqual(['Bezeichnung']);
  });

  it('rewrites ASSOCIATION source/target classes that use Model.Topic.Class form', () => {
    const ASSOC_PRIMARY = `INTERLIS 2.3;
MODEL VSA_DSS_2020 AT "x" VERSION "1" =
  IMPORTS Base_LV95;
  TOPIC Sied =
    CLASS Foo =
      label : MANDATORY TEXT*40;
    END Foo;
    ASSOCIATION FooBar =
      FooRef -- {1} Foo;
      BarRef (EXTERNAL) -- {0..*} Base_LV95.Administration.SIA405_BaseClass;
    END FooBar;
  END Sied;
END VSA_DSS_2020.`;
    const r = new IliParser().parseContents([
      { name: 'V.ili', content: ASSOC_PRIMARY, isPrimary: true, modelName: 'VSA_DSS_2020' },
      { name: 'B.ili', content: BASE_TOPIC, isPrimary: false, modelName: 'Base_LV95' },
    ]);
    const assoc = r.nodes.find(n => n.type === 'ASSOCIATION');
    expect(assoc).toBeDefined();
    const a = (assoc!.data as any).association;
    expect(a.targetClass === 'Administration.SIA405_BaseClass'
        || a.sourceClass === 'Administration.SIA405_BaseClass').toBe(true);
  });
});
