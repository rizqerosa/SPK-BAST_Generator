/**
 * ============================================================
 * GOOGLE APPS SCRIPT — WEBPADKU SPK/BAST GENERATOR
 * ============================================================
 * Petunjuk Pemasangan:
 * 1. Buka Google Spreadsheet data Anda.
 * 2. Klik menu 'Ekstensi' (Extensions) -> 'Apps Script'.
 * 3. Ganti seluruh isi file Code.gs dengan kode di bawah ini.
 * 4. Klik 'Simpan' (ikon disket).
 * 5. Klik tombol biru 'Deploy' -> 'Manage deployments' -> Edit (ikon pensil) -> Version: New version -> 'Deploy'.
 * ============================================================
 */

function doGet(e) {
  try {
    var sheetName = e.parameter.sheet;
    if (!sheetName) {
      return jsonResponse({ status: "error", message: "Parameter 'sheet' diperlukan" });
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return jsonResponse({ status: "error", message: "Sheet '" + sheetName + "' tidak ditemukan" });
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return jsonResponse([]);
    }
    
    var headers = data[0];
    var rows = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var isBlank = true;
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        var val = row[j];
        if (val instanceof Date) {
          val = val.toISOString();
        }
        obj[headers[j]] = val;
        if (val !== "" && val !== null && val !== undefined) {
          isBlank = false;
        }
      }
      if (!isBlank) {
        rows.push(obj);
      }
    }
    
    return jsonResponse(rows);
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || "append";
    var sheetName = body.sheet;
    
    if (!sheetName) {
      return jsonResponse({ status: "error", message: "Parameter 'sheet' diperlukan" });
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return jsonResponse({ status: "error", message: "Sheet '" + sheetName + "' tidak ditemukan" });
    }
    
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var headers = values[0] || [];
    
    // ─── ACTION: DELETE ───────────────────────────────────────
    if (action === "delete") {
      var keyField = body.keyField || "ID_Dokumen";
      var keyValue = body.keyValue || (body.data ? body.data[keyField] : "");
      if (!keyValue) {
        return jsonResponse({ status: "error", message: "keyField dan keyValue diperlukan untuk delete" });
      }
      
      var colIdx = headers.indexOf(keyField);
      if (colIdx === -1) {
        return jsonResponse({ status: "error", message: "Kolom '" + keyField + "' tidak ditemukan di sheet" });
      }
      
      var deletedCount = 0;
      // Loop dari baris paling bawah ke atas agar indeks baris tidak bergeser saat dihapus
      for (var r = values.length - 1; r >= 1; r--) {
        if (String(values[r][colIdx]).trim() === String(keyValue).trim()) {
          sheet.deleteRow(r + 1);
          deletedCount++;
        }
      }
      
      return jsonResponse({ status: "ok", message: "Berhasil menghapus " + deletedCount + " baris", deletedCount: deletedCount });
    }
    
    // ─── ACTION: UPDATE ───────────────────────────────────────
    if (action === "update") {
      var keyField = body.keyField;
      var keyValue = body.keyValue;
      if (!keyField || !keyValue) {
        return jsonResponse({ status: "error", message: "keyField dan keyValue diperlukan untuk update" });
      }
      
      var colIdx = headers.indexOf(keyField);
      if (colIdx === -1) {
        return jsonResponse({ status: "error", message: "Kolom '" + keyField + "' tidak ditemukan" });
      }
      
      var updateData = body.data || {};
      var updated = false;
      var cleanTargetKey = String(keyValue).trim().toLowerCase();
      
      for (var r = 1; r < values.length; r++) {
        var cellVal = String(values[r][colIdx]).trim().toLowerCase();
        if (cellVal === cleanTargetKey) {
          for (var field in updateData) {
            var fIdx = headers.indexOf(field);
            if (fIdx === -1) {
              fIdx = headers.findIndex(function(h) { return String(h).trim().toLowerCase() === String(field).trim().toLowerCase(); });
            }
            if (fIdx !== -1) {
              sheet.getRange(r + 1, fIdx + 1).setValue(updateData[field]);
            }
          }
          updated = true;
          break;
        }
      }
      
      if (updated) {
        return jsonResponse({ status: "ok", message: "Data berhasil diperbarui" });
      } else {
        return jsonResponse({ status: "not_found", message: "Baris dengan " + keyField + "='" + keyValue + "' tidak ditemukan" });
      }
    }
    
    // ─── ACTION: APPEND (DEFAULT) ─────────────────────────────
    var rowData = body.data || {};
    var newRow = [];
    for (var c = 0; c < headers.length; c++) {
      var colHeader = headers[c];
      var val = (rowData[colHeader] !== undefined) ? rowData[colHeader] : "";
      newRow.push(val);
    }
    
    sheet.appendRow(newRow);
    return jsonResponse({ status: "ok", message: "Data berhasil disimpan" });
    
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
