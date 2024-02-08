import * as ts from 'typescript';
import * as vscode from 'vscode';
import { RefactorAction } from '.';
import { getFirstMatchingAncestor } from '../traverse';

const getNewFunctionName = (
  variableDeclaration: ts.VariableDeclaration | undefined,
): string => {
  if (variableDeclaration === undefined) return 'getSomeValue';

  const identifier = variableDeclaration.name.getText();

  return `get${identifier.charAt(0).toUpperCase() + identifier.slice(1)}`;
};

export const splitCallExpression: RefactorAction = (node, source, document) => {
  const callExpression = getFirstMatchingAncestor(node, ts.isCallExpression);

  if (callExpression === undefined) return;
  if (!ts.isParenthesizedExpression(callExpression.expression)) return;

  // CallExpression.ParenthesizedExpression.FunctionExpression
  const functionExpression = callExpression.expression.expression;

  if (
    !ts.isFunctionExpression(functionExpression) &&
    !ts.isArrowFunction(functionExpression)
  ) {
    return;
  }

  const originalVariableDeclaration = getFirstMatchingAncestor(
    callExpression,
    ts.isVariableDeclaration,
  );

  const newFunctionIdentifier = ts.factory.createIdentifier(
    getNewFunctionName(originalVariableDeclaration),
  );

  const newFunctionVariable = ts.factory.createVariableStatement(
    undefined,
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          newFunctionIdentifier,
          undefined,
          undefined,
          functionExpression,
        ),
      ],
      ts.NodeFlags.Const,
    ),
  );

  const replacementCallExpression = ts.factory.createCallExpression(
    newFunctionIdentifier,
    callExpression.typeArguments,
    callExpression.arguments,
  );

  const callExpressionRange = new vscode.Range(
    document.positionAt(callExpression.pos),
    document.positionAt(callExpression.end),
  );

  const action = new vscode.CodeAction(
    'Split IIFE into arrow function and call expression',
    vscode.CodeActionKind.RefactorMove,
  );

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const printedCallExpression = printer.printNode(
    ts.EmitHint.Unspecified,
    replacementCallExpression,
    source,
  );

  const printedFunctionVariable = printer.printNode(
    ts.EmitHint.Unspecified,
    newFunctionVariable,
    source,
  );

  action.edit = new vscode.WorkspaceEdit();

  const newVariablePosition =
    callExpressionRange.start.line === 0
      ? new vscode.Position(0, callExpressionRange.start.character)
      : callExpressionRange.start.translate(-2, 0);

  action.edit.replace(document.uri, callExpressionRange, printedCallExpression);
  action.edit.insert(
    document.uri,
    newVariablePosition,
    printedFunctionVariable,
  );

  return action;
};
