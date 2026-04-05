import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class DiffPreviewHandler {
  constructor(private workspaceRoot: string) {}

  async showDiff(relativePath: string, originalContent: string | null, newContent: string): Promise<boolean> {
    const filePath = path.join(this.workspaceRoot, relativePath);
    const fileName = path.basename(filePath);

    // Create temporary files for diffing
    const tempOriginal = path.join(this.workspaceRoot, '.thinkcoffee', 'tmp', `${fileName}.orig`);
    const tempNew = path.join(this.workspaceRoot, '.thinkcoffee', 'tmp', `${fileName}.new`);

    await fs.promises.mkdir(path.dirname(tempOriginal), { recursive: true });
    
    await fs.promises.writeFile(tempOriginal, originalContent || '');
    await fs.promises.writeFile(tempNew, newContent);

    const originalUri = vscode.Uri.file(tempOriginal);
    const newUri = vscode.Uri.file(tempNew);

    const title = originalContent === null ? `Review Create: ${relativePath}` : `Review Edit: ${relativePath}`;

    return new Promise((resolve) => {
        vscode.commands.executeCommand('vscode.diff', originalUri, newUri, title).then(() => {
            vscode.window.showInformationMessage(
                title,
                { modal: true },
                'Accept',
                'Reject'
            ).then(async (selection) => {
                // Cleanup temp files
                await fs.promises.unlink(tempOriginal).catch(() => {});
                await fs.promises.unlink(tempNew).catch(() => {});
                // Close the diff tab
                await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

                resolve(selection === 'Accept');
            });
        });
    });
  }
}
