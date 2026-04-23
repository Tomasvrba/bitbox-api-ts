// SPDX-License-Identifier: Apache-2.0

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REF_DTS = path.resolve(__dirname, '../../bitbox-api-rs/pkg/bitbox_api.d.ts');
const PORT_DTS = path.resolve(__dirname, '../dist/index.d.ts');

// The reference d.ts lives in a sibling repo that isn't present in stand-alone
// CI checkouts. Skip the snapshot cleanly if it's missing.
const REF_AVAILABLE = existsSync(REF_DTS);

type Shape = {
  functions: Map<string, string>;
  typeAliases: Map<string, string>;
  classes: Map<string, { methods: Map<string, string> }>;
};

function parse(filePath: string): Shape {
  const source = ts.createSourceFile(
    filePath,
    readFileSync(filePath, 'utf8'),
    ts.ScriptTarget.ES2022,
    true,
  );
  const printer = ts.createPrinter({ removeComments: true });
  const print = (node: ts.Node): string =>
    printer.printNode(ts.EmitHint.Unspecified, node, source);
  // The comparison is on TYPES only — parameter names and redundant parens
  // around single identifiers (wasm-bindgen emits e.g. `(Keypath)[]`) are
  // normalized away, since neither affects call-site compatibility.
  const normalize = (text: string): string =>
    text
      .replace(/\s+/g, ' ')
      .replace(/\(([A-Za-z_][A-Za-z0-9_]*)\)/g, '$1')
      .trim();

  const paramType = (p: ts.ParameterDeclaration): string => {
    const q = p.questionToken ? '?' : '';
    const t = p.type ? print(p.type) : 'any';
    return normalize(`${q}${t}`);
  };
  const sigOf = (
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.MethodSignature,
  ): string => {
    const params = node.parameters.map(paramType).join(', ');
    const ret = node.type ? `: ${print(node.type)}` : '';
    return normalize(`(${params})${ret}`);
  };

  const isExported = (node: ts.Node): boolean =>
    (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0;

  const functions = new Map<string, string>();
  const typeAliases = new Map<string, string>();
  const classes = new Map<string, { methods: Map<string, string> }>();

  ts.forEachChild(source, (node) => {
    if (ts.isFunctionDeclaration(node) && isExported(node) && node.name) {
      functions.set(node.name.text, sigOf(node));
    } else if (ts.isTypeAliasDeclaration(node) && isExported(node)) {
      typeAliases.set(node.name.text, normalize(print(node.type)));
    } else if (ts.isClassDeclaration(node) && isExported(node) && node.name) {
      const methods = new Map<string, string>();
      for (const member of node.members) {
        const mods = ts.getCombinedModifierFlags(member);
        if (mods & ts.ModifierFlags.Private) {
          continue;
        }
        if (ts.isConstructorDeclaration(member)) {
          continue;
        }
        if (
          (ts.isMethodDeclaration(member) || ts.isMethodSignature(member)) &&
          member.name &&
          ts.isIdentifier(member.name)
        ) {
          methods.set(member.name.text, sigOf(member));
        }
      }
      classes.set(node.name.text, { methods });
    }
  });

  return { functions, typeAliases, classes };
}

describe.skipIf(!REF_AVAILABLE)('API snapshot: exported shape matches bitbox-api-rs/pkg/bitbox_api.d.ts', () => {
  const ref = REF_AVAILABLE ? parse(REF_DTS) : { functions: new Map(), typeAliases: new Map(), classes: new Map() };
  const port = REF_AVAILABLE ? parse(PORT_DTS) : { functions: new Map(), typeAliases: new Map(), classes: new Map() };

  it('exports the same set of functions', () => {
    expect([...port.functions.keys()].sort()).toEqual([...ref.functions.keys()].sort());
  });

  it('function signatures match', () => {
    for (const [name, refSig] of ref.functions) {
      expect(port.functions.get(name), `function ${name}`).toBe(refSig);
    }
  });

  // Type aliases are declared in the reference d.ts WITHOUT `export`, so they
  // aren't importable by name. Our port exports them (more ergonomic). So the
  // check is: port is a superset of ref, and shared type aliases match shape.
  it('every type alias in the reference is present in the port', () => {
    const missing = [...ref.typeAliases.keys()].filter((n) => !port.typeAliases.has(n));
    expect(missing).toEqual([]);
  });

  it('shared type alias shapes match', () => {
    for (const [name, refShape] of ref.typeAliases) {
      expect(port.typeAliases.get(name), `type ${name}`).toBe(refShape);
    }
  });

  it('exports the same set of classes', () => {
    expect([...port.classes.keys()].sort()).toEqual([...ref.classes.keys()].sort());
  });

  it('class method sets and signatures match', () => {
    for (const [className, refClass] of ref.classes) {
      const portClass = port.classes.get(className);
      expect(portClass, `class ${className}`).toBeDefined();
      if (!portClass) {
        continue;
      }
      expect(
        [...portClass.methods.keys()].sort(),
        `class ${className} method set`,
      ).toEqual([...refClass.methods.keys()].sort());
      for (const [methodName, refSig] of refClass.methods) {
        expect(
          portClass.methods.get(methodName),
          `${className}.${methodName}`,
        ).toBe(refSig);
      }
    }
  });
});
