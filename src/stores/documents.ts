import { Node, parse } from '@markdoc/markdoc/index'
import { DocumentUri, TextDocument } from 'vscode-languageserver-textdocument'
import {
  TextDocumentChangeEvent,
  TextDocuments,
} from 'vscode-languageserver/node'

export class Documents extends TextDocuments<TextDocument> {
  private asts: Map<DocumentUri, Node>

  constructor() {
    super(TextDocument)
    this.asts = new Map()

    this.onDidOpen(this.update, this)
    this.onDidSave(this.update, this)
    this.onDidChangeContent(this.update, this)

    this.onDidClose(({ document }) => {
      this.asts.delete(document.uri)
    })
  }

  async update({ document }: TextDocumentChangeEvent<TextDocument>) {
    this.asts.set(document.uri, parse(document.getText()))
  }

  getAst(uri: DocumentUri): Node {
    return this.asts.get(uri) as Node
  }

  hasAst(uri: DocumentUri): boolean {
    return this.asts.has(uri)
  }
}
