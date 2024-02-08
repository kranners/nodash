import * as vscode from 'vscode';
import * as ts from 'typescript';

export function getFirstMatchingAncestor<NodeType extends ts.Node>(
  descendent: ts.Node,
  guard: (node: ts.Node) => node is NodeType,
): NodeType | undefined {
  while (!guard(descendent)) {
    if (ts.isSourceFile(descendent.parent)) {
      return undefined;
    }

    descendent = descendent.parent;
  }

  return descendent;
}

export function getDescendantAtPosition(
  source: ts.SourceFile,
  position: vscode.Position,
): ts.Node {
  let node: ts.Node = source;

  const offset = source.getPositionOfLineAndCharacter(
    position.line,
    position.character,
  );

  while (node.kind >= ts.SyntaxKind.FirstNode) {
    const child = node.forEachChild((child) => {
      if (child.pos <= offset && child.end > offset) return child;
    });

    if (child === undefined) return node;

    node = child;
  }

  return node;
}
