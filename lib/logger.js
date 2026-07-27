/** @param {NS} ns */
export function log(ns, message, level = "INFO") {
    let now = new Date();
    let timeStr = now.toTimeString().split(" ")[0]; // HH:MM:SS
    let formatted = `[${timeStr}] [${level}] ${message}`;
    
    // 1. Ausgabe in das Skript-eigene Tail-Fenster (Konsole)
    ns.print(formatted);
    
    // 2. Permanenter Schreibvorgang in die zentrale Log-Datei (im Append-Modus "a")
    let logPath = "/logs/system.txt";
    ns.write(logPath, formatted + "\n", "a");

    //Create File for logs
    if (!ns.fileExists(logPath)) {
        ns.write(logPath, "", "w");
    }
}