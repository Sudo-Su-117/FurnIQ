import React from 'react'
import './DataTable.css'

/**
 * Reusable table component
 * columns: [{ key, label, width?, align?, bold?, render? }]
 * rows: array of data objects
 */
export default function DataTable({ columns, rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="dt-empty">
        <p>No records found.</p>
      </div>
    )
  }

  return (
    <div className="dt-wrapper">
      <table className="dt-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className="dt-th"
                style={{
                  width: col.width || 'auto',
                  textAlign: col.align || 'left'
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.id || ri} className="dt-tr">
              {columns.map(col => (
                <td
                  key={col.key}
                  className="dt-td"
                  style={{
                    textAlign: col.align || 'left',
                    fontWeight: col.bold ? 600 : 400
                  }}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
