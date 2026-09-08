export function getFileExtension(fileName) {
  const match = /\.([a-zA-Z0-9]+)$/.exec(fileName ?? '')
  return match ? match[1].toLowerCase() : ''
}

export function isFileTypeAccepted(file, acceptedExtensions) {
  return acceptedExtensions.includes(getFileExtension(file.name))
}

export function isFileSizeValid(file, maxSizeBytes) {
  return file.size <= maxSizeBytes
}
