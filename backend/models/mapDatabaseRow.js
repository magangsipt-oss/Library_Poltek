const columnNames = require('../../database/nama_kolom.json');

// Nama kolom PostgreSQL memakai Bahasa Indonesia; kontrak API tetap kompatibel.
const apiNames = Object.fromEntries(
  Object.entries(columnNames).map(([apiName, databaseName]) => [databaseName, apiName])
);

function toApiRow(row) {
  if (!row) return row;
  return Object.fromEntries(
    Object.entries(row).map(([name, value]) => [apiNames[name] || name, value])
  );
}

module.exports = toApiRow;
