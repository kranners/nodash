import * as ts from 'typescript';
import * as vscode from 'vscode';
import { RefactorAction } from '.';
import { getFirstMatchingAncestor } from '../traverse';

// We must use Lodash to kill Lodash, cycle of life
import lodashToPath from 'lodash/toPath';

const getCallIdentifier = (
  callExpression: ts.CallExpression,
): ts.MemberName | ts.LeftHandSideExpression => {
  if (ts.isPropertyAccessExpression(callExpression.expression)) {
    return callExpression.expression.name;
  }
  return callExpression.expression;
};

const buildAccessExpression = (
  expression: ts.Expression,
  propertyPaths: string[],
  coalesceNulls: boolean,
): ts.Expression => {
  if (propertyPaths.length === 0) return expression;

  const [nextPath, ...remainingPaths] = propertyPaths;

  const shouldCoalesce = coalesceNulls && remainingPaths.length > 0;
  const questionDotToken = ts.factory.createToken(
    ts.SyntaxKind.QuestionDotToken,
  );

  const accessToken = shouldCoalesce ? questionDotToken : undefined;

  if (Number.isNaN(Number(nextPath))) {
    const propertyAccessExpression = ts.factory.createPropertyAccessChain(
      expression,
      accessToken,
      ts.factory.createIdentifier(nextPath),
    );

    return buildAccessExpression(
      propertyAccessExpression,
      remainingPaths,
      coalesceNulls,
    );
  }

  const elementAccessExpression = ts.factory.createElementAccessChain(
    expression,
    accessToken,
    ts.factory.createNumericLiteral(nextPath),
  );

  return buildAccessExpression(
    elementAccessExpression,
    remainingPaths,
    coalesceNulls,
  );
};

const buildBinaryExpression = (
  accessExpression: ts.Expression,
  defaultExpression: ts.Expression | undefined,
): ts.BinaryExpression | ts.Expression => {
  if (!defaultExpression) return accessExpression;

  return ts.factory.createBinaryExpression(
    accessExpression,
    ts.factory.createToken(ts.SyntaxKind.QuestionQuestionToken),
    defaultExpression,
  );
};

export const replaceLodashGet: RefactorAction = (node, source, document) => {
  const callExpression = getFirstMatchingAncestor(node, ts.isCallExpression);

  if (callExpression === undefined) return;

  const callArguments = callExpression.arguments;
  if (callArguments.length > 3) return;
  if (callArguments.length < 2) return;

  const callIdentifier = getCallIdentifier(callExpression);
  if (callIdentifier.getText() !== 'get') return;

  const [objectExpression, pathExpression, defaultExpression] = callArguments;

  if (!ts.isStringLiteral(pathExpression)) return;

  const propertyPaths = lodashToPath(pathExpression.text);

  const replacementAccessExpression = buildAccessExpression(
    objectExpression,
    propertyPaths,
    (defaultExpression as ts.Expression | undefined) !== undefined,
  );

  const replacementExpression = buildBinaryExpression(
    replacementAccessExpression,
    defaultExpression,
  );

  const replacementRange = new vscode.Range(
    document.positionAt(callExpression.getStart()),
    document.positionAt(callExpression.getEnd()),
  );

  const action = new vscode.CodeAction(
    'Replace potentially unnecessary get()',
    vscode.CodeActionKind.QuickFix,
  );

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const printedExpression = printer.printNode(
    ts.EmitHint.Unspecified,
    replacementExpression,
    source,
  );

  action.edit = new vscode.WorkspaceEdit();

  action.edit.replace(document.uri, replacementRange, printedExpression);

  return action;
};
