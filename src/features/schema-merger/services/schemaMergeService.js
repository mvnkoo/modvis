export class SchemaMergeService {
  constructor() {
    this.enumTypes = new Map();
  }

  async validateExpressFile(file) {
    try {
      const content = await file.text();
      const schemaVersion = this.detectSchemaVersion(content);
      
      if (!content.includes('SCHEMA') || !content.includes('END_SCHEMA;')) {
        return {
          isValid: false,
          errors: ['Ungültiges EXPRESS Schema: SCHEMA Definition nicht gefunden']
        };
      }

      return {
        isValid: true,
        schemaVersion: schemaVersion || 'unknown'
      };
    } catch (error) {
      console.error('Fehler bei der Schema-Validierung:', error);
      return {
        isValid: false,
        errors: [error.message || 'Unbekannter Fehler bei der Validierung']
      };
    }
  }

  async parsePSetFile(file, dispatch) {
    const content = await file.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, "text/xml");

    // Prüfe, ob es sich um ein QtoSet handelt
    const isQtoSet = xmlDoc.documentElement.tagName === 'QtoSetDef';

    if (isQtoSet) {
      return {
        name: this.getFirstElementText(xmlDoc, "Name"),
        definition: this.getFirstElementText(xmlDoc, "Definition"),
        ifcVersion: this.getVersionAttribute(xmlDoc),
        applicableClasses: this.getApplicableClasses(xmlDoc),
        properties: this.getQtoProperties(xmlDoc),
        isQtoSet: true
      };
    }

    // Bestehende PSet-Verarbeitung
    return {
      name: this.getFirstElementText(xmlDoc, "Name"),
      definition: this.getFirstElementText(xmlDoc, "Definition"),
      ifcVersion: this.getVersionAttribute(xmlDoc),
      applicableClasses: this.getApplicableClasses(xmlDoc),
      properties: this.getProperties(xmlDoc, dispatch),
      isQtoSet: false
    };
  }

  async mergeExpressWithPSets(expressData, psetData, configuration, dispatch) {
    try {
      if (!expressData) {
        throw new Error('Kein EXPRESS Schema vorhanden');
      }
      if (!psetData || psetData.length === 0) {
        throw new Error('Keine Property Sets vorhanden');
      }

      // Zählvariablen initialisieren
      let totalProperties = 0;
      let totalEnums = 0;

      dispatch({
        type: 'ADD_MERGE_LOG',
        payload: {
          level: 'INFO',
          message: `Starte Zusammenführung von ${psetData.length} Property Sets...`,
          timestamp: new Date().toISOString()
        }
      });

      // Verarbeite die PSets und zähle die Properties
      this.processEnumsFromPSets(psetData);
      
      // Zähle Properties und Enums
      psetData.forEach(pset => {
        dispatch({
          type: 'ADD_MERGE_LOG',
          payload: {
            level: 'INFO',
            message: `• Verarbeite ${pset.isQtoSet ? 'QtoSet' : 'PSet'}: ${pset.name} mit ${pset.properties.length} ${pset.isQtoSet ? 'Quantities' : 'Properties'}`,
            timestamp: new Date().toISOString()
          }
        });
        totalProperties += pset.properties.length;
        pset.properties.forEach(prop => {
          if (prop.enumValues) totalEnums++;
        });
      });

      let mergedContent = expressData;

      // Sammle alle separaten Relationen
      const separateRelations = new Set();

      // Modifiziere die Property-Integration
      if (configuration.mergingRules.extendExistingEntities) {
        dispatch({
          type: 'ADD_MERGE_LOG',
          payload: {
            level: 'INFO',
            message: 'Integriere Properties in Entities...',
            timestamp: new Date().toISOString()
          }
        });

        // Für jedes PSet
        for (const pset of psetData) {
          // Finde die zugehörigen Entities basierend auf applicableClasses
          for (const entityName of pset.applicableClasses) {
            // Suche die ENTITY-Definition im Schema
            const entityRegex = new RegExp(`ENTITY\\s+${entityName}[\\s\\S]*?END_ENTITY;`, 'g');
            const entityMatch = mergedContent.match(entityRegex);

            if (entityMatch) {
              let entityDefinition = entityMatch[0];
              const propertiesInsertPoint = entityDefinition.lastIndexOf('END_ENTITY;');
              
              // Erstelle die Property-Definitionen
              const propertyDefinitions = pset.properties.map(prop => {
                const propName = configuration.mergingRules.addSuffixToProperties
                  ? `${prop.name}_${pset.name.replace(/^(Pset_|Qto_)/, '')}`
                  : prop.name;

                let propType = prop.dataType;
                
                // Erweiterte Beziehungsbehandlung
                if (propType.startsWith('Ifc')) {
                  switch (configuration.mergingRules.relationships) {
                    case 'DIRECT_REFERENCE':
                      // Direkte Referenz (wie bisher)
                      dispatch({
                        type: 'ADD_MERGE_LOG',
                        payload: {
                          level: 'INFO',
                          message: `• Erstelle direkte Referenz: ${propName} -> ${propType}`,
                          timestamp: new Date().toISOString()
                        }
                      });
                      return `    ${propName} : ${propType};`;

                    case 'SEPARATE_RELATIONS':
                      // Erstelle separate Relation
                      const relationEntity = this.createRelationEntity(
                        entityName,
                        pset.name,
                        prop.name,
                        propType,
                        configuration
                      );
                      separateRelations.add(relationEntity);
                      
                      dispatch({
                        type: 'ADD_MERGE_LOG',
                        payload: {
                          level: 'INFO',
                          message: `• Erstelle separate Relation für: ${propName}`,
                          timestamp: new Date().toISOString()
                        }
                      });
                      // Property wird nicht direkt hinzugefügt
                      return null;

                    case 'NESTED':
                      // Verschachtelte Struktur (wie bisher)
                      const nestedTypeName = `${pset.name}_${prop.name}_Type`;
                      const nestedTypeDefinition = [
                        `TYPE ${nestedTypeName} = SELECT`,
                        `  (${propType});`,
                        'END_TYPE;'
                      ].join('\n');

                      // Füge den verschachtelten Typ zum Schema hinzu
                      mergedContent = mergedContent.replace(
                        /END_SCHEMA;/,
                        `${nestedTypeDefinition}\n\nEND_SCHEMA;`
                      );

                      dispatch({
                        type: 'ADD_MERGE_LOG',
                        payload: {
                          level: 'INFO',
                          message: `• Erstelle verschachtelte Struktur für: ${propName}`,
                          timestamp: new Date().toISOString()
                        }
                      });
                      return `    ${propName} : ${nestedTypeName};`;

                    case 'SIMPLE':
                      // Behandle als einfache Property
                      dispatch({
                        type: 'ADD_MERGE_LOG',
                        payload: {
                          level: 'INFO',
                          message: `• Konvertiere Referenz zu einfacher Property: ${propName}`,
                          timestamp: new Date().toISOString()
                        }
                      });
                      return `    ${propName} : STRING;`;

                    default:
                      return `    ${propName} : ${propType};`;
                  }
                }

                // Normale Property-Definition für nicht-Beziehungs-Properties
                if (prop.enumValues) {
                  propType = this.createEnumTypeName(pset.name, prop.name);
                }

                // Spezielle Behandlung für Quantities
                if (prop.isQuantity) {
                  return `    ${propName} : ${prop.dataType};  (* Quantity *)`;
                }

                return `    ${propName} : ${propType};`;
              }).filter(Boolean).join('\n');  // Filtere null-Werte aus

              // Füge Kommentar und Properties ein
              const updatedEntityDefinition = [
                entityDefinition.slice(0, propertiesInsertPoint),
                `\n    (* Properties from ${pset.name} *)\n`,
                propertyDefinitions,
                '\n',
                entityDefinition.slice(propertiesInsertPoint)
              ].join('');

              // Ersetze die alte Entity-Definition durch die neue
              mergedContent = mergedContent.replace(entityMatch[0], updatedEntityDefinition);

              dispatch({
                type: 'ADD_MERGE_LOG',
                payload: {
                  level: 'INFO',
                  message: `• ${pset.properties.length} Properties zu ${entityName} hinzugefügt`,
                  timestamp: new Date().toISOString()
                }
              });
            } else {
              dispatch({
                type: 'ADD_MERGE_LOG',
                payload: {
                  level: 'WARNING',
                  message: `Entity ${entityName} nicht gefunden für ${pset.name}`,
                  timestamp: new Date().toISOString()
                }
              });
            }
          }
        }
      }

      // Füge separate Relationen zum Schema hinzu
      if (separateRelations.size > 0) {
        dispatch({
          type: 'ADD_MERGE_LOG',
          payload: {
            level: 'INFO',
            message: `Füge ${separateRelations.size} separate Relationen hinzu...`,
            timestamp: new Date().toISOString()
          }
        });

        const relationDefinitions = Array.from(separateRelations).join('\n\n');
        mergedContent = mergedContent.replace(
          /END_SCHEMA;/,
          `\n\n${relationDefinitions}\n\nEND_SCHEMA;`
        );
      }

      // 3. Enums integrieren (wie bisher)
      const enumTypes = Array.from(this.enumTypes.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      
      if (enumTypes.length > 0) {
        dispatch({
          type: 'ADD_MERGE_LOG',
          payload: {
            level: 'INFO',
            message: `Erstelle ${enumTypes.length} Enumerationen...`,
            timestamp: new Date().toISOString()
          }
        });

        // Finde den TYPE-Bereich im Schema
        const typeMatches = [...mergedContent.matchAll(/TYPE\s+(\w+)\s*=[\s\S]*?END_TYPE;/g)];
        if (typeMatches.length > 0) {
          // Sammle alle existierenden TYPE-Namen
          const existingTypes = typeMatches.map(match => match[1]);
          
          // Erstelle alle neuen TYPE-Definitionen
          const newTypeDefinitions = enumTypes.map(([propName, enumValues]) => {
            const { typeDefinition } = this.createEnumerationType(
              propName,
              enumValues,
              propName.split('_')[0],
              configuration
            );
            return typeDefinition;
          });

          // Finde die Position für das Einfügen basierend auf alphabetischer Sortierung
          let insertPosition = -1;
          for (const match of typeMatches) {
            const typeName = match[1];
            const matchIndex = mergedContent.indexOf(match[0]);
            
            // Finde die erste Position, wo der neue Typ alphabetisch eingeordnet werden sollte
            if (enumTypes[0][0].localeCompare(typeName) < 0) {
              insertPosition = matchIndex;
              break;
            }
          }

          // Wenn keine passende Position gefunden wurde, füge am Ende des TYPE-Bereichs ein
          if (insertPosition === -1) {
            const lastTypeMatch = typeMatches[typeMatches.length - 1];
            insertPosition = mergedContent.indexOf(lastTypeMatch[0]) + lastTypeMatch[0].length;
          }

          // Füge die neuen TYPEs an der richtigen Position ein
          mergedContent = 
            mergedContent.slice(0, insertPosition) + 
            '\n\n' + 
            newTypeDefinitions.join('\n\n') + 
            '\n\n' + 
            mergedContent.slice(insertPosition);
        } else {
          // Wenn noch keine TYPEs existieren, füge sie vor END_SCHEMA ein
          const newTypeDefinitions = enumTypes.map(([propName, enumValues]) => {
            const { typeDefinition } = this.createEnumerationType(
              propName,
              enumValues,
              propName.split('_')[0],
              configuration
            );
            return typeDefinition;
          }).join('\n\n');

          mergedContent = mergedContent.replace(
            /END_SCHEMA;/,
            `\n\n${newTypeDefinitions}\n\nEND_SCHEMA;`
          );
        }
      }

      // Abschlussbericht mit den jetzt definierten Variablen
      dispatch({
        type: 'ADD_MERGE_LOG',
        payload: {
          level: 'INFO',
          message: 'Zusammenfassung:',
          timestamp: new Date().toISOString()
        }
      });
      dispatch({
        type: 'ADD_MERGE_LOG',
        payload: {
          level: 'INFO',
          message: `• ${psetData.length} Property Sets verarbeitet`,
          timestamp: new Date().toISOString()
        }
      });
      dispatch({
        type: 'ADD_MERGE_LOG',
        payload: {
          level: 'INFO',
          message: `• ${totalProperties} Properties gefunden`,
          timestamp: new Date().toISOString()
        }
      });
      dispatch({
        type: 'ADD_MERGE_LOG',
        payload: {
          level: 'INFO',
          message: `• ${totalEnums} Enumerationen erstellt`,
          timestamp: new Date().toISOString()
        }
      });

      return mergedContent;

    } catch (error) {
      dispatch({
        type: 'ADD_MERGE_LOG',
        payload: {
          level: 'ERROR',
          message: `Fehler beim Zusammenführen: ${error.message}`,
          timestamp: new Date().toISOString()
        }
      });
      throw error;
    }
  }

  processEnumsFromPSets(pSets) {
    for (const pSet of pSets) {
      if (pSet.properties) {
        for (const prop of pSet.properties) {
          if (prop.enumValues) {
            const enumTypeName = this.createEnumTypeName(pSet.name, prop.name);
            this.enumTypes.set(enumTypeName, prop.enumValues);
          }
        }
      }
    }
  }

  createEnumTypeName(psetName, propName) {
    const cleanPsetName = psetName.replace(/^Pset_/, '');
    const cleanPropName = propName.replace(/^Pset_/, '').replace(/Enum$/, '');
    
    // Entferne spezielle Zeichen und normalisiere den Namen
    let typeName = `${cleanPsetName}_${cleanPropName}_Enum`
      .replace(/[^a-zA-Z0-9_]/g, '')  // Entferne alle nicht-alphanumerischen Zeichen außer Unterstriche
      .replace(/_+/g, '_')            // Reduziere mehrfache Unterstriche auf einen
      .replace(/^_|_$/g, '');         // Entferne führende und nachfolgende Unterstriche

    // Stelle sicher, dass der Name mit einem Buchstaben beginnt
    if (/^[0-9]/.test(typeName)) {
      typeName = 'T_' + typeName;
    }

    return typeName;
  }

  createEnumerationType(propName, enumValues, psetName, config) {
    const typeName = this.createEnumTypeName(psetName, propName);
    const comment = `(* Enumeration from Property Set: ${psetName} *)`;
    
    // Formatiere die Enum-Werte
    const formattedEnumValues = enumValues
      .map(value => value.trim())
      .filter(value => value.length > 0)
      .map(value => value.replace(/[^a-zA-Z0-9_]/g, '_'))
      .map(value => /^[0-9]/.test(value) ? `E_${value}` : value);

    // Erstelle die TYPE-Definition mit schöner Formatierung
    const typeDefinition = [
      comment,
      `TYPE ${typeName} = ENUMERATION OF`,
      `  (${formattedEnumValues.join(',\n   ')});`,
      'END_TYPE;'
    ].join('\n');

    return {
      typeDefinition,
      typeReference: typeName
    };
  }

  detectSchemaVersion(content) {
    try {
      const schemaMatch = content.match(/SCHEMA\s+([^;]+);/);
      if (schemaMatch) {
        return schemaMatch[1].trim();
      }
      
      const versionMatch = content.match(/\b(IFC\d+(?:x\d+)?(?:_[A-Z]+\d+)?)\b/);
      return versionMatch ? versionMatch[1] : 'unknown';
    } catch (error) {
      console.error('Fehler beim Erkennen der Schema-Version:', error);
      return 'unknown';
    }
  }

  // Helper methods for XML parsing
  getFirstElementText(element, selector) {
    const selectedElement = element.querySelector(selector);
    return selectedElement?.textContent || "";
  }

  getVersionAttribute(doc) {
    const versionElement = doc.querySelector("IfcVersion");
    return versionElement?.getAttribute("version") || "";
  }

  getApplicableClasses(doc) {
    return Array.from(doc.querySelectorAll("ClassName"))
      .map(node => node.textContent || '');
  }

  getProperties(doc, dispatch) {
    return Array.from(doc.querySelectorAll("PropertyDef"))
      .map(propNode => ({
        name: this.getFirstElementText(propNode, "Name"),
        definition: this.getFirstElementText(propNode, "Definition"),
        dataType: this.extractDataType(propNode, dispatch),
        enumValues: this.extractEnumValues(propNode)
      }));
  }

  extractDataType(propNode, dispatch) {
    // Erweiterte Typ-Erkennung
    const typeNode = propNode.querySelector(
      "TypePropertySingleValue DataType, TypePropertyEnumeratedValue, TypePropertyReferenceValue, TypePropertyListValue, TypePropertyTableValue"
    );

    if (!typeNode) return "IfcLabel";

    // Referenz-Typ erkennen
    if (propNode.querySelector("TypePropertyReferenceValue")) {
      const reftype = typeNode.getAttribute("reftype");
      if (dispatch) {
        dispatch({
          type: 'ADD_MERGE_LOG',
          payload: {
            level: 'INFO',
            message: `Referenz-Property gefunden: ${propNode.querySelector("Name")?.textContent} -> ${reftype}`,
            timestamp: new Date().toISOString()
          }
        });
      }
      return reftype || "IfcDefinitionSelect";
    }

    // Liste erkennen
    if (propNode.querySelector("TypePropertyListValue")) {
      const listType = typeNode.getAttribute("type") || "IfcValue";
      return `LIST [1:?] OF ${listType}`;
    }

    // Tabelle erkennen
    if (propNode.querySelector("TypePropertyTableValue")) {
      const definingType = typeNode.getAttribute("DefiningType") || "IfcValue";
      const definedType = typeNode.getAttribute("DefinedType") || "IfcValue";
      return `TABLE [1:?] OF (${definingType}, ${definedType})`;
    }

    return typeNode.getAttribute("type") || 
           typeNode.getAttribute("reftype") || 
           "IfcLabel";
  }

  extractEnumValues(propNode) {
    const enumList = propNode.querySelector("EnumList");
    if (!enumList) return undefined;

    return Array.from(enumList.querySelectorAll("EnumItem"))
      .map(item => item.textContent || '');
  }

  analyzeRelationships(psetData, dispatch) {
    const relationships = new Map();
    
    psetData.forEach(pset => {
      pset.properties.forEach(prop => {
        if (prop.dataType.startsWith('Ifc')) {
          const relationship = {
            from: pset.name,
            property: prop.name,
            to: prop.dataType
          };
          
          if (!relationships.has(prop.dataType)) {
            relationships.set(prop.dataType, []);
          }
          relationships.get(prop.dataType).push(relationship);
        }
      });
    });

    // Log gefundene Beziehungen
    if (relationships.size > 0) {
      dispatch({
        type: 'ADD_MERGE_LOG',
        payload: {
          level: 'INFO',
          message: `Gefundene Beziehungen:`,
          timestamp: new Date().toISOString()
        }
      });

      relationships.forEach((refs, target) => {
        dispatch({
          type: 'ADD_MERGE_LOG',
          payload: {
            level: 'INFO',
            message: `• ${target}: ${refs.length} Referenzen`,
            timestamp: new Date().toISOString()
          }
        });
      });
    }

    return relationships;
  }

  createRelationEntity(entityName, psetName, propertyName, targetType, configuration) {
    const relationName = `${entityName}_Has_${propertyName}`;
    
    return [
      `(* Relation Entity for ${psetName}.${propertyName} *)`,
      `ENTITY ${relationName};`,
      `  RelatingObject : ${entityName};`,
      `  RelatedObject : ${targetType};`,
      'END_ENTITY;'
    ].join('\n');
  }

  // Neue Methode für Qto-Properties
  getQtoProperties(doc) {
    return Array.from(doc.querySelectorAll("QtoDef"))
      .map(qtoDef => ({
        name: this.getFirstElementText(qtoDef, "Name"),
        definition: this.getFirstElementText(qtoDef, "Definition"),
        dataType: this.getQtoDataType(qtoDef),  // Spezielle Behandlung für Qto-Typen
        isQuantity: true
      }));
  }

  // Spezielle Behandlung von Qto-Typen
  getQtoDataType(qtoDef) {
    const qtoType = this.getFirstElementText(qtoDef, "QtoType");
    
    // Mapping von Qto-Typen zu IFC-Typen
    const qtoTypeMapping = {
      'Q_LENGTH': 'IfcLengthMeasure',
      'Q_AREA': 'IfcAreaMeasure',
      'Q_VOLUME': 'IfcVolumeMeasure',
      'Q_COUNT': 'IfcCountMeasure',
      'Q_WEIGHT': 'IfcMassMeasure',
      'Q_TIME': 'IfcTimeMeasure'
    };

    return qtoTypeMapping[qtoType] || 'IfcReal';
  }
} 