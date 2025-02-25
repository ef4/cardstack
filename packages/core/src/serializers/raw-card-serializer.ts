import * as JSON from 'json-typescript';
import get from 'lodash/get';
import set from 'lodash/set';
import { RawCard, CompiledCard, Field, ResourceObject, Unsaved, Saved, FEATURE_NAMES } from '../interfaces';
import { findIncluded } from './index';

export class RawCardSerializer {
  doc: any;

  serialize(card: RawCard, compiled?: CompiledCard): JSON.Object {
    let rawCardKeys: (keyof RawCard)[] = ['id', 'realm', 'adoptsFrom', 'data', 'files', ...FEATURE_NAMES];
    let resource = serializeResource('raw-cards', `${card.realm}${card.id}`, card, rawCardKeys);

    this.doc = { data: resource };

    if (compiled) {
      this.doc.included = [];
      resource.relationships = {
        compiledMeta: { data: this.includeCompiledMeta(compiled) },
      };
    }
    return this.doc;
  }

  private includeCompiledMeta(compiled: CompiledCard, resourceStack: ResourceObject<Saved | Unsaved>[] = []) {
    if (!findIncluded(this.doc, { type: 'compiled-metas', id: compiled.url })) {
      let keysToSerialize: (keyof CompiledCard)[] = ['schemaModule', 'serializerModule', 'deps', 'componentInfos'];
      let resource = serializeResource('compiled-metas', compiled.url, compiled, keysToSerialize);

      resource.relationships ||= {};
      if (compiled.adoptsFrom) {
        resource.relationships.adoptsFrom = {
          data: this.includeCompiledMeta(compiled.adoptsFrom),
        };
      }
      resource.relationships.fields = {
        data: Object.values(compiled.fields).map((field) => this.includeField(compiled, field, resourceStack)),
      };

      this.doc.included.push(resource);
    }

    return { type: 'compiled-metas', id: compiled.url };
  }

  private includeField(parent: CompiledCard, field: Field, resourceStack: ResourceObject<Saved | Unsaved>[] = []) {
    let id = `${parent.url}/${field.name}`;
    if (!findIncluded(this.doc, { type: 'fields', id })) {
      let resource = serializeResource('fields', id, field, ['name', 'computed', { fieldType: 'type' }]);
      if (!resourceStack.find((r) => r.id === resource.id && r.type === resource.type)) {
        resource.relationships ||= {};
        resource.relationships.card = {
          data: this.includeCompiledMeta(field.card, [...resourceStack, resource]),
        };
        this.doc.included.push(resource);
      }
    }
    return { type: 'fields', id };
  }
}

function serializeResource<Identity extends Saved | Unsaved>(
  type: string,
  id: Identity,
  payload: any,
  attributes?: (string | Record<string, string>)[]
): ResourceObject<Identity> {
  let resource: ResourceObject<Identity> = {
    id,
    type,
  };
  resource.attributes = {};

  if (!attributes) {
    attributes = Object.keys(payload);
  }

  for (const attr of attributes) {
    if (typeof attr === 'object') {
      let [aliasName, name] = Object.entries(attr)[0];
      set(resource.attributes, aliasName, get(payload, name) ?? null);
    } else {
      set(resource.attributes, attr, get(payload, attr) ?? null);
    }
  }
  return resource;
}
