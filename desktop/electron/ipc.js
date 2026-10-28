// The extra things the app's screens can ask the desktop app to do
// (see preload.js): print, list printers, choose and open folders.
const fs = require('fs');
const path = require('path');
const { ipcMain, dialog, shell, BrowserWindow } = require('electron');

const MICRONS_PER_MM = 1000;
const SHORTEST_RECEIPT_MM = 50;

// Turns the print request from the screen into Electron print options.
// - printerName set: print straight to that printer (no print window).
// - printerName empty: show the normal print window.
// Thermal receipts are printed on a "page" exactly as long as the receipt.
function printOptions({ paper, heightMm, printerName }) {
  const options = {
    silent: Boolean(printerName),
    printBackground: true,
    margins: { marginType: 'none' },
  };
  if (printerName) options.deviceName = printerName;

  if (paper === 'A4') {
    options.pageSize = 'A4';
    options.margins = { marginType: 'default' };
  } else {
    const widthMm = paper === '58mm' ? 58 : 80;
    const lengthMm = Math.max(Number(heightMm) || 0, SHORTEST_RECEIPT_MM);
    options.pageSize = { width: widthMm * MICRONS_PER_MM, height: Math.ceil(lengthMm) * MICRONS_PER_MM };
  }
  return options;
}

// Prints the page that asked, and answers { ok, reason }.
function handlePrint(event, request = {}) {
  return new Promise((resolve) => {
    try {
      event.sender.print(printOptions(request), (success, reason) => {
        if (!success) console.warn('Printing failed:', reason);
        resolve({ ok: success, reason: success ? '' : reason || 'unknown error' });
      });
    } catch (error) {
      console.error('Printing failed:', error);
      resolve({ ok: false, reason: error.message });
    }
  });
}

// Lists the printers installed on this computer.
async function handleGetPrinters(event) {
  const printers = await event.sender.getPrintersAsync();
  return printers.map((p) => ({ name: p.name, displayName: p.displayName, isDefault: Boolean(p.isDefault) }));
}

// Opens a "choose folder" window and answers with the folder ('' if cancelled).
async function handleChooseFolder(event) {
  const window = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(window, {
    title: 'Choose a folder for backups',
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.canceled ? '' : result.filePaths[0];
}

// Opens a folder in Windows Explorer. Only real folders are opened
// (never files, which Windows would run).
async function handleOpenFolder(event, folder) {
  if (typeof folder !== 'string' || !path.isAbsolute(folder)) return 'Not a folder.';
  try {
    if (!fs.statSync(folder).isDirectory()) return 'Not a folder.';
  } catch (error) {
    return 'The folder does not exist yet.';
  }
  return shell.openPath(folder); // '' when it worked
}

// Connects the handlers above. "extra" adds app-level handlers from main.js.
function registerIpcHandlers(extra) {
  ipcMain.handle('print', handlePrint);
  ipcMain.handle('get-printers', handleGetPrinters);
  ipcMain.handle('choose-folder', handleChooseFolder);
  ipcMain.handle('open-folder', handleOpenFolder);
  for (const [channel, handler] of Object.entries(extra)) ipcMain.handle(channel, handler);
}

module.exports = { registerIpcHandlers, printOptions };
