// Saves data as a JSON file in the user's Downloads (the NFR-5 data export).
// Returns false where the browser can't create files (e.g. the test environment).
export function downloadJson(filename, data) {
  if (typeof URL.createObjectURL !== 'function') return false
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
  return true
}
