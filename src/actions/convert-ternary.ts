import * as ts from 'typescript';
import * as vscode from 'vscode';
import { RefactorAction } from '.';
import { getFirstMatchingAncestor } from '../traverse';

const conditionalToIfElse = (
  expression: ts.Expression,
): ts.IfStatement | ts.ReturnStatement => {
  if (!ts.isConditionalExpression(expression)) {
    return ts.factory.createReturnStatement(expression);
  }

  return ts.factory.createIfStatement(
    expression.condition,
    ts.factory.createBlock([conditionalToIfElse(expression.whenTrue)]),
    ts.factory.createBlock([conditionalToIfElse(expression.whenFalse)]),
  );
};

export const convertTernary: RefactorAction = (node, source, document) => {
  const conditional = getFirstMatchingAncestor<ts.ConditionalExpression>(
    node,
    ts.isConditionalExpression,
  );

  if (conditional === undefined) return;

  const replacementCallExpression = ts.factory.createCallExpression(
    ts.factory.createParenthesizedExpression(
      ts.factory.createArrowFunction(
        undefined,
        undefined,
        [],
        undefined,
        ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        ts.factory.createBlock([conditionalToIfElse(conditional)], true),
      ),
    ),
    undefined,
    [],
  );

  const ifStatementRange = new vscode.Range(
    document.positionAt(conditional.pos),
    document.positionAt(conditional.end),
  );

  const action = new vscode.CodeAction(
    'Convert ternary expression to if/else function',
    vscode.CodeActionKind.RefactorMove,
  );

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const printedCallExpression = printer.printNode(
    ts.EmitHint.Unspecified,
    replacementCallExpression,
    source,
  );

  action.edit = new vscode.WorkspaceEdit();

  action.edit.replace(
    document.uri,
    ifStatementRange,
    `\n${printedCallExpression}\n`,
  );

  return action;
};
