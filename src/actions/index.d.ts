import * as ts from 'typescript';
import * as vscode from 'vscode';

export type RefactorAction = (
  node: ts.Node,
  source: ts.SourceFile,
  document: vscode.TextDocument,
) => vscode.CodeAction | undefined;

export type RefactorActionSet = (
  node: ts.Node,
  source: ts.SourceFile,
  document: vscode.TextDocument,
) => vscode.CodeAction[];

export type AsyncRefactorActionSet = (
  node: ts.Node,
  source: ts.SourceFile,
  document: vscode.TextDocument,
) => Promise<vscode.CodeAction[]>;
