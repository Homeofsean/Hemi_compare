const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1380,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#f4ecdf",
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadFile(path.join(__dirname, "app_launcher.html"));

  const menuTemplate = [
    {
      label: "Apps",
      submenu: [
        {
          label: "Launcher",
          click: () => win.loadFile(path.join(__dirname, "app_launcher.html")),
        },
        {
          label: "Diameter Analysis Portal",
          click: () => win.loadFile(path.join(__dirname, "diameter_portal.html")),
        },
        {
          label: "GWS vs STL Fit Viewer",
          click: () => win.loadFile(path.join(__dirname, "index.html")),
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Open Packaging Guide",
          click: () => shell.openPath(path.join(__dirname, "PACKAGING.md")),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
