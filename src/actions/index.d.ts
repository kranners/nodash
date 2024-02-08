import * as ts from 'typescript';
import * as vscode from 'vscode';

export type RefactorAction = (
  node: ts.Node,
  source: ts.SourceFile,
  document: vscode.TextDocument,
) => vscode.CodeAction | undefined;
