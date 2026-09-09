    function textFromBytes(bytes) {
      var end = 0;
      while (end < bytes.length && bytes[end] !== 0) end++;
      return new TextDecoder().decode(bytes.subarray(0, end));
    }

    function writeTarString(header, offset, length, value) {
      var bytes = new TextEncoder().encode(value);
      header.set(bytes.subarray(0, length), offset);
    }

    function writeTarOctal(header, offset, length, value) {
      var text = Math.max(0, value).toString(8).padStart(length - 1, "0");
      writeTarString(header, offset, length - 1, text.slice(-(length - 1)));
      header[offset + length - 1] = 0;
    }

    function splitTarName(name) {
      var encoded = new TextEncoder().encode(name);
      if (encoded.length <= 100) return { name: name, prefix: "" };
      var slash = name.lastIndexOf("/");
      while (slash > 0) {
        var prefix = name.slice(0, slash);
        var basename = name.slice(slash + 1);
        if (new TextEncoder().encode(prefix).length <= 155 && new TextEncoder().encode(basename).length <= 100) {
          return { name: basename, prefix: prefix };
        }
        slash = name.lastIndexOf("/", slash - 1);
      }
      throw new Error("Archive path is too long: " + name);
    }

    function createTarHeader(entry) {
      var header = new Uint8Array(512);
      var names = splitTarName(entry.name);
      var now = Math.floor(Date.now() / 1000);

      writeTarString(header, 0, 100, names.name);
      writeTarOctal(header, 100, 8, entry.type === "dir" ? 0o755 : 0o644);
      writeTarOctal(header, 108, 8, 0);
      writeTarOctal(header, 116, 8, 0);
      writeTarOctal(header, 124, 12, entry.type === "dir" ? 0 : entry.data.length);
      writeTarOctal(header, 136, 12, now);
      for (var i = 148; i < 156; i++) header[i] = 32;
      header[156] = entry.type === "dir" ? "5".charCodeAt(0) : "0".charCodeAt(0);
      writeTarString(header, 257, 6, "ustar");
      writeTarString(header, 263, 2, "00");
      writeTarString(header, 345, 155, names.prefix);

      var checksum = 0;
      for (var byteIndex = 0; byteIndex < header.length; byteIndex++) checksum += header[byteIndex];
      var checksumText = checksum.toString(8).padStart(6, "0");
      writeTarString(header, 148, 6, checksumText);
      header[154] = 0;
      header[155] = 32;
      return header;
    }

    function createTar(entries) {
      var parts = [];
      entries.forEach(function(entry) {
        var data = entry.type === "dir" ? new Uint8Array(0) : entry.data;
        parts.push(createTarHeader({ name: entry.name, type: entry.type, data: data }));
        if (data.length) {
          parts.push(data);
          var padding = (512 - (data.length % 512)) % 512;
          if (padding) parts.push(new Uint8Array(padding));
        }
      });
      parts.push(new Uint8Array(1024));
      return new Blob(parts, { type: "application/x-tar" });
    }

    function parseTar(buffer) {
      var bytes = new Uint8Array(buffer);
      var entries = [];
      for (var offset = 0; offset + 512 <= bytes.length; offset += 512) {
        var header = bytes.subarray(offset, offset + 512);
        var empty = true;
        for (var i = 0; i < header.length; i++) {
          if (header[i] !== 0) {
            empty = false;
            break;
          }
        }
        if (empty) break;

        var name = textFromBytes(header.subarray(0, 100));
        var prefix = textFromBytes(header.subarray(345, 500));
        var sizeText = textFromBytes(header.subarray(124, 136)).trim();
        var size = parseInt(sizeText || "0", 8);
        var type = String.fromCharCode(header[156] || 48);
        var fullName = prefix ? prefix + "/" + name : name;
        var dataOffset = offset + 512;
        entries.push({
          name: fullName,
          type: type,
          data: bytes.slice(dataOffset, dataOffset + size)
        });
        offset = dataOffset + Math.ceil(size / 512) * 512 - 512;
      }
      return entries;
    }

    function collectArchiveEntries(fsPath, archivePath, entries) {
      var stat;
      try {
        stat = FS.stat(fsPath);
      } catch (error) {
        return;
      }

      if (FS.isDir(stat.mode)) {
        entries.push({ name: archivePath.replace(/\/?$/, "/"), type: "dir", data: new Uint8Array(0) });
        FS.readdir(fsPath).forEach(function(name) {
          if (name === "." || name === "..") return;
          collectArchiveEntries(fsPath + "/" + name, archivePath + "/" + name, entries);
        });
      } else if (FS.isFile(stat.mode)) {
        entries.push({ name: archivePath, type: "file", data: FS.readFile(fsPath) });
      }
    }

    async function createOpenMwUserDataArchive() {
      await syncPersistentUserFiles("archive");
      var entries = [];
      collectArchiveEntries("/home/web_user/.config/openmw", "config/openmw", entries);
      collectArchiveEntries("/home/web_user/.local/share/openmw", "local/share/openmw", entries);
      if (!entries.length) {
        var empty = new Error("No save data");
        empty.code = "no_save_data";
        throw empty;
      }
      return { blob: createTar(entries), entries: entries };
    }

    async function exportOpenMwUserData() {
      if (isTes3mpRuntimeActive()) {
        showSaveToast("Export after leaving multiplayer");
        canvasElement.focus();
        return;
      }
      setSaveToolsEnabled(false);
      try {
        var archive = await createOpenMwUserDataArchive();
        var timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
        var link = document.createElement("a");
        link.href = URL.createObjectURL(archive.blob);
        link.download = "morrowind-app-saves-" + timestamp + ".tar";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function() {
          URL.revokeObjectURL(link.href);
        }, 1000);
        showSaveToast("Save export downloaded");
      } catch (error) {
        console.error(error);
        showSaveToast(error && error.code === "no_save_data" ? "No save data to export yet" : "Save export failed");
      } finally {
        setSaveToolsEnabled(true);
        canvasElement.focus();
      }
    }

    function archivePathSafe(path) {
      if (!path || path.indexOf("\0") !== -1 || path.charAt(0) === "/") return false;
      return !path.split("/").some(function(part) {
        return part === "..";
      });
    }

    function archivePathToFsPath(path) {
      if (!archivePathSafe(path)) return null;
      if (path.indexOf("config/openmw/") === 0) {
        return "/home/web_user/.config/openmw/" + path.slice("config/openmw/".length);
      }
      if (path === "config/openmw/") return "/home/web_user/.config/openmw";
      if (path.indexOf("local/share/openmw/") === 0) {
        return "/home/web_user/.local/share/openmw/" + path.slice("local/share/openmw/".length);
      }
      if (path === "local/share/openmw/") return "/home/web_user/.local/share/openmw";
      return null;
    }

    async function applyOpenMwUserDataArchiveEntries(entries) {
      var imported = 0;
      entries.forEach(function(entry) {
        var fsPath = archivePathToFsPath(entry.name);
        if (!fsPath) return;
        if (entry.type === "5" || /\/$/.test(entry.name)) {
          ensureDirectory(fsPath);
        } else {
          ensureDirectory(fsPath.slice(0, fsPath.lastIndexOf("/")));
          FS.writeFile(fsPath, entry.data);
          imported++;
        }
      });
      persistenceDirty = true;
      await syncPersistentUserFiles("import");
      return imported;
    }

    async function importOpenMwUserDataBlob(blob) {
      var entries = parseTar(await blob.arrayBuffer());
      return applyOpenMwUserDataArchiveEntries(entries);
    }

    async function importOpenMwUserData(file) {
      if (!file) return;
      if (isTes3mpRuntimeActive()) {
        importSaveFileElement.value = "";
        showSaveToast("Import after leaving multiplayer");
        canvasElement.focus();
        return;
      }
      setSaveToolsEnabled(false);
      try {
        var imported = await importOpenMwUserDataBlob(file);
        showSaveToast(imported ? "Save import complete. Reload before loading imported saves." : "No compatible save files found");
      } catch (error) {
        console.error(error);
        showSaveToast("Save import failed");
      } finally {
        importSaveFileElement.value = "";
        setSaveToolsEnabled(true);
        canvasElement.focus();
      }
    }
