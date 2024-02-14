import * as ts from 'typescript';
import * as vscode from 'vscode';
import { RefactorAction } from '.';
import {
  getFirstMatchingAncestor,
  isPotentialLodashExpression,
} from '../traverse';

const isFunction = (
  node: ts.Node,
): node is ts.ArrowFunction | ts.FunctionExpression => {
  return ts.isArrowFunction(node) || ts.isFunctionExpression(node);
};

export const replaceMappingFunction: RefactorAction = (
  node,
  source,
  document,
) => {
  const callExpression = getFirstMatchingAncestor(node, ts.isCallExpression);

  if (callExpression === undefined) return;

  // The mapping function may be either map(...) or something.map(...)
  const mappingExpression = callExpression.expression;
  if (!isPotentialLodashExpression(mappingExpression)) return;

  const functionIdentifier = ts.isIdentifier(mappingExpression)
    ? mappingExpression
    : mappingExpression.name;

  // Lodash mapping functions always look like FUNCTION(ARRAY, ARROW)
  // Meaning we can just check for having two arguments
  if (callExpression.arguments.length !== 2) return;

  const [variableIdentifier, arrowFunction] = callExpression.arguments;
  if (!ts.isIdentifier(variableIdentifier)) return;
  if (!isFunction(arrowFunction)) return;

  const replacementCallExpression = ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      variableIdentifier,
      functionIdentifier,
    ),
    undefined,
    [arrowFunction],
  );

  const containingStatement = getFirstMatchingAncestor(
    callExpression,
    ts.isExpressionStatement,
  );

  const ancestorStatement = containingStatement ?? callExpression;

  const ancestorReplacement = containingStatement
    ? ts.factory.createExpressionStatement(replacementCallExpression)
    : replacementCallExpression;

  const replacementRange = new vscode.Range(
    document.positionAt(ancestorStatement.getStart(source, true)),
    document.positionAt(ancestorStatement.getEnd()),
  );

  const action = new vscode.CodeAction(
    'Convert potentially unnecessary mapping function',
    vscode.CodeActionKind.QuickFix,
  );

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const printedCallExpression = printer.printNode(
    ts.EmitHint.Unspecified,
    ancestorReplacement,
    source,
  );

  action.edit = new vscode.WorkspaceEdit();

  action.edit.replace(document.uri, replacementRange, printedCallExpression);

  return action;
};
