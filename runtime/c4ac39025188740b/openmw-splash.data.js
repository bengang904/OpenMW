var Module = typeof Module != "undefined" ? Module : {};

if (!Module["expectedDataFileDownloads"]) Module["expectedDataFileDownloads"] = 0;
Module["expectedDataFileDownloads"]++;

(() => {
  var isPthread = typeof ENVIRONMENT_IS_PTHREAD != "undefined" && ENVIRONMENT_IS_PTHREAD;
  var isWasmWorker = typeof ENVIRONMENT_IS_WASM_WORKER != "undefined" && ENVIRONMENT_IS_WASM_WORKER;
  if (isPthread || isWasmWorker) return;

  var metadata = {"files":[{"filename":"/morrowind/Data Files/Splash/Splash_Bonelord.tga","start":0,"end":3145772},{"filename":"/morrowind/Data Files/Splash/Splash_ClannDaddy.tga","start":3145772,"end":6291544},{"filename":"/morrowind/Data Files/Splash/Splash_Clannfear.tga","start":6291544,"end":9437316},{"filename":"/morrowind/Data Files/Splash/Splash_Daedroth.tga","start":9437316,"end":12583088},{"filename":"/morrowind/Data Files/Splash/Splash_Hunger.tga","start":12583088,"end":15728860},{"filename":"/morrowind/Data Files/Splash/Splash_KwamaWarrior.tga","start":15728860,"end":18874632},{"filename":"/morrowind/Data Files/Splash/Splash_Netch.tga","start":18874632,"end":22020404},{"filename":"/morrowind/Data Files/Splash/Splash_NixHound.tga","start":22020404,"end":25166176},{"filename":"/morrowind/Data Files/Splash/Splash_Siltstriker.tga","start":25166176,"end":28311948},{"filename":"/morrowind/Data Files/Splash/Splash_Skeleton.tga","start":28311948,"end":31457720},{"filename":"/morrowind/Data Files/Splash/Splash_SphereCenturion.tga","start":31457720,"end":34603492}],"remote_package_size":34603492};
  var packageBase = "openmw-splash.data";
  var packageSize = metadata["remote_package_size"];
  var packageName = Module["locateFile"] ? Module["locateFile"](packageBase, "") : packageBase;
  var dependency = "datafile_openmw-splash.data";

  function logWarning(message) {
    if (Module["printErr"]) Module["printErr"](message);
    else if (typeof console !== "undefined" && console.warn) console.warn(message);
  }

  function ensureDirectory(path) {
    var parts = String(path).split("/").filter(Boolean);
    var current = "";
    for (var i = 0; i < parts.length; i++) {
      current += "/" + parts[i];
      try {
        if (FS.analyzePath(current).exists) continue;
        FS.mkdir(current);
      } catch (error) {
        if (!FS.analyzePath(current).exists) throw error;
      }
    }
  }

  async function fetchPackage() {
    if (!Module["dataFileDownloads"]) Module["dataFileDownloads"] = {};
    var loaded = 0;
    var total = Number(packageSize);
    var chunks = [];

    function report() {
      Module["dataFileDownloads"][packageName] = { loaded: loaded, total: total };
      if (Module["setStatus"]) Module["setStatus"]("Downloading splash screens... (" + loaded + "/" + total + ")");
    }

    report();
    var response = await fetch(packageName, { credentials: "same-origin" });
    if (!response.ok) throw new Error(response.status + ": " + response.url);

    if (!response.body || typeof response.body.getReader !== "function") {
      var bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length !== total) throw new Error("Splash package size mismatch: " + bytes.length + "/" + total);
      loaded = bytes.length;
      report();
      return bytes.buffer;
    }

    var reader = response.body.getReader();
    while (true) {
      var result = await reader.read();
      if (result.done) break;
      chunks.push(result.value);
      loaded += result.value.length;
      if (loaded > total) throw new Error("Splash package is larger than expected");
      report();
    }

    if (loaded !== total) throw new Error("Splash package ended early: " + loaded + "/" + total);

    var bytes = new Uint8Array(total);
    var offset = 0;
    for (var i = 0; i < chunks.length; i++) {
      bytes.set(chunks[i], offset);
      offset += chunks[i].length;
    }
    return bytes.buffer;
  }

  async function runWithFS() {
    Module["addRunDependency"](dependency);
    try {
      var packageData = Module["getPreloadedPackage"] && Module["getPreloadedPackage"](packageName, packageSize);
      if (!packageData) packageData = await fetchPackage();

      var bytes = new Uint8Array(packageData);
      var files = metadata["files"] || [];
      ensureDirectory("/morrowind/Data Files/Splash");

      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var name = file["filename"];
        var slash = name.lastIndexOf("/");
        if (slash > 0) ensureDirectory(name.slice(0, slash));
        try {
          if (FS.analyzePath(name).exists) FS.unlink(name);
        } catch (error) {
        }
        Module["FS_createDataFile"](name, null, bytes.subarray(file["start"], file["end"]), true, true, true);
      }

      if (Module["print"]) Module["print"]("OpenMW splash screens installed: " + files.length + " files.");
    } catch (error) {
      logWarning("OpenMW splash screens unavailable; continuing without them: " + error);
    } finally {
      Module["removeRunDependency"](dependency);
    }
  }

  if (Module["FS_createDataFile"]) {
    runWithFS();
  } else {
    if (!Module["preRun"]) Module["preRun"] = [];
    Module["preRun"].push(runWithFS);
  }
})();

// openmw-splash.data sha256=136eaff167c5d394
