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

const getReplacementCallExpression = (
  variableDeclaration: ts.VariableDeclaration | undefined,
  originalCallExpression: ts.CallExpression,
  newFunctionIdentifier: ts.Identifier,
): ts.VariableStatement | ts.CallExpression => {
  if (variableDeclaration === undefined) {
    return ts.factory.createCallExpression(
      newFunctionIdentifier,
      originalCallExpression.typeArguments,
      originalCallExpression.arguments,
    );
  }

  return ts.factory.createVariableStatement(
    undefined,
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          variableDeclaration.name,
          undefined,
          undefined,
          ts.factory.createCallExpression(
            newFunctionIdentifier,
            originalCallExpression.typeArguments,
            originalCallExpression.arguments,
          ),
        ),
      ],
      ts.NodeFlags.Const,
    ),
  );
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

  const variableDeclarationList = getFirstMatchingAncestor(
    callExpression,
    ts.isVariableDeclarationList,
  );

  const variableDeclaration = variableDeclarationList?.declarations[0];

  const newFunctionIdentifier = ts.factory.createIdentifier(
    getNewFunctionName(variableDeclaration),
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

  const replacementCallExpression = getReplacementCallExpression(
    variableDeclaration,
    callExpression,
    newFunctionIdentifier,
  );

  const newVariableDeclarationRange = new vscode.Range(
    document.positionAt(variableDeclarationList?.pos ?? callExpression.pos),
    // End position needs to be shifted over by one to account for the trailing semicolon
    document
      .positionAt(variableDeclarationList?.end ?? callExpression.end)
      .translate(0, 1),
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

  action.edit.replace(
    document.uri,
    newVariableDeclarationRange,
    printedFunctionVariable,
  );

  action.edit.insert(
    document.uri,
    newVariableDeclarationRange.end.translate(1, 0),
    printedCallExpression,
  );

  return action;
};
