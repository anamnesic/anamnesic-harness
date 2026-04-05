import * as vscode from 'vscode';
import { DryRunManager } from './DryRunManager';

/**
 * Gerencia o item de status bar para indicar o modo Dry-Run.
 *
 * Exibe um icone na status bar quando dry-run esta ativo,
 * permitindo ao usuario ver rapidamente o estado e alternar.
 */
export class DryRunStatusBar {
  private readonly _statusBarItem: vscode.StatusBarItem;
  private readonly _dryRunManager: DryRunManager;
  private _disposables: vscode.Disposable[] = [];

  constructor(dryRunManager: DryRunManager) {
    this._dryRunManager = dryRunManager;

    this._statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      49 // Logo apos o status bar do projeto
    );

    this._statusBarItem.command = 'thinkcoffee.toggleDryRun';
    this._update();

    // Escutar mudancas de estado
    this._disposables.push(
      dryRunManager.onStateChange(() => this._update())
    );
  }

  private _update(): void {
    if (this._dryRunManager.isDryRunEnabled) {
      const summary = this._dryRunManager.getSummary();
      this._statusBarItem.text = `$(beaker) DRY-RUN (${summary.totalActions})`;
      this._statusBarItem.tooltip = `Modo Dry-Run ATIVO\n${summary.filesWouldBeWritten} arquivo(s) seriam escritos\n${summary.commandsWouldBeExecuted} comando(s) seriam executados\n\nClique para desativar`;
      this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      this._statusBarItem.show();
    } else {
      this._statusBarItem.text = '$(beaker) Dry-Run';
      this._statusBarItem.tooltip = 'Modo Dry-Run desativado\nClique para ativar';
      this._statusBarItem.backgroundColor = undefined;
      this._statusBarItem.hide(); // Esconder quando desativado para nao poluir
    }
  }

  /**
   * Mostra o status bar item mesmo quando dry-run esta desativado.
   * Util para menus ou quando o usuario explicitamente quer ver o botao.
   */
  show(): void {
    this._statusBarItem.show();
  }

  /**
   * Esconde o status bar item.
   */
  hide(): void {
    if (!this._dryRunManager.isDryRunEnabled) {
      this._statusBarItem.hide();
    }
  }

  dispose(): void {
    this._statusBarItem.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) d.dispose();
    }
  }
}
