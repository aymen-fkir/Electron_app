const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('gettingemails', {
    relode: ()=> ipcRenderer.invoke("Relode"),

})